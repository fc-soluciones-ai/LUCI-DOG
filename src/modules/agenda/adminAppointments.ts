import { AppointmentSource, AppointmentStatus, type RecurrenceInterval } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { assertNoPetOverlap, assertSlotAvailable, computeDurationMinutes } from './availability'
import { scheduleAppointmentNotifications } from './notifications'
import { generateRecurringBatch, INTERVAL_DAYS } from './recurrence'
import { formatInBusinessTz, parseZonedDateTime, zonedDayRange } from './timezone'
import { ValidationError } from './errors'

export interface AdminAppointmentFilters {
  date: Date // día a mostrar (vista de calendario por día — ver zonedDayRange)
  status?: AppointmentStatus
  workstationId?: string
}

/** Citas de un solo día para la vista de calendario de recepción — con filtros por estado y estación asignada. */
export async function listAppointmentsForAdmin(filters: AdminAppointmentFilters) {
  const { start, end } = zonedDayRange(filters.date)
  return prisma.appointment.findMany({
    where: {
      status: filters.status,
      scheduledStart: { gte: start, lt: end },
      appointmentSteps: filters.workstationId ? { some: { workstationId: filters.workstationId } } : undefined,
    },
    orderBy: { scheduledStart: 'asc' },
    include: {
      pet: { select: { name: true, breed: true, sizeCategory: true } },
      tutor: { select: { fullName: true, phoneWhatsApp: true } },
      service: { select: { name: true } },
      groomer: { select: { fullName: true } },
      appointmentSteps: { select: { workstation: { select: { id: true, name: true } } }, take: 1 },
    },
  })
}

export interface AdminBookingInput {
  tutorId?: string
  newTutor?: { fullName: string; phoneWhatsApp: string; email?: string; address?: string }
  petId?: string
  newPet?: { name: string; breed: string; sizeCategory?: string }
  serviceId: string
  scheduledStart: Date
  groomerId?: string
  /** Si viene, esta cita queda como la primera de una programación recurrente: se crea el RecurringSchedule y se generan de una vez todas las citas siguientes hasta el 31 de diciembre del año de esta cita, en el mismo horario. */
  recurrence?: RecurrenceInterval
}

/**
 * Alta manual de cita por recepción (llamada/WhatsApp) — mismo motor de
 * disponibilidad que el portal del cliente y el self-service público
 * (src/modules/agenda/availability.ts), así que respeta capacidad, buffer,
 * horario de negocio y duración real por talla igual que los otros dos
 * caminos. A diferencia de esos, entra directo como CONFIRMED (el staff ya
 * confirmó con el cliente por teléfono) y con source MANUAL_STAFF.
 */
export async function createAppointmentByAdmin(input: AdminBookingInput) {
  if (!input.tutorId && !input.newTutor) {
    throw new ValidationError('Selecciona un cliente existente o registra uno nuevo.')
  }
  if (!input.petId && !input.newPet) {
    throw new ValidationError('Selecciona una mascota existente o registra una nueva.')
  }

  const service = await prisma.service.findUniqueOrThrow({ where: { id: input.serviceId } })

  const sizeCategory = input.petId
    ? (await prisma.pet.findUniqueOrThrow({ where: { id: input.petId } })).sizeCategory
    : (input.newPet?.sizeCategory ?? null)

  await assertSlotAvailable(input.scheduledStart, input.serviceId, sizeCategory)
  const durationMin = computeDurationMinutes(service.standardDurationMin, sizeCategory)
  const scheduledEnd = new Date(input.scheduledStart.getTime() + durationMin * 60_000)

  if (input.petId) {
    await assertNoPetOverlap(input.petId, input.scheduledStart, scheduledEnd)
  }

  const { appointment, scheduleId } = await prisma.$transaction(async (tx) => {
    const tutor = input.tutorId
      ? await tx.tutor.findUniqueOrThrow({ where: { id: input.tutorId } })
      : await tx.tutor.create({ data: { ...input.newTutor! } })

    const pet = input.petId
      ? await tx.pet.findFirstOrThrow({ where: { id: input.petId, tutorId: tutor.id } })
      : await tx.pet.create({ data: { tutorId: tutor.id, ...input.newPet! } })

    const appointment = await tx.appointment.create({
      data: {
        petId: pet.id,
        tutorId: tutor.id,
        serviceId: service.id,
        groomerId: input.groomerId,
        source: AppointmentSource.MANUAL_STAFF,
        status: AppointmentStatus.CONFIRMED,
        scheduledStart: input.scheduledStart,
        scheduledEnd,
        quoteEstimated: service.basePrice,
      },
    })

    await scheduleAppointmentNotifications(tx, appointment.id)

    let scheduleId: string | null = null

    if (input.recurrence) {
      const schedule = await tx.recurringSchedule.create({
        data: {
          petId: pet.id,
          serviceId: service.id,
          interval: input.recurrence,
          preferredTime: formatInBusinessTz(input.scheduledStart, 'HH:mm'),
        },
      })
      await tx.appointment.update({ where: { id: appointment.id }, data: { recurringScheduleId: schedule.id } })
      scheduleId = schedule.id
    }

    return { appointment, scheduleId }
  })

  let recurringSummary: { generated: number; skipped: number } | null = null

  if (input.recurrence && scheduleId) {
    // Fuera de la transacción anterior a propósito: generar todas las citas
    // restantes del año (varias creaciones + su cadena de notificaciones cada
    // una) puede tardar más que el timeout por defecto de una transacción
    // interactiva de Prisma (5s) y abortarla a medio camino.
    //
    // Tope defensivo de 30 ocurrencias para no disparar cientos de citas ante
    // una fecha o intervalo mal calculado.
    const yearEnd = parseZonedDateTime(`${formatInBusinessTz(input.scheduledStart, 'yyyy')}-12-31T23:59:59`)
    const intervalMs = INTERVAL_DAYS[input.recurrence] * 24 * 60 * 60 * 1000
    const rawCount = Math.floor((yearEnd.getTime() - input.scheduledStart.getTime()) / intervalMs)
    const count = Math.min(Math.max(rawCount, 0), 30)

    const result = count > 0 ? await generateRecurringBatch(prisma, scheduleId, count) : { created: [], skippedConflicts: [] }
    recurringSummary = { generated: result.created.length, skipped: result.skippedConflicts.length }
  }

  return { ...appointment, recurringSummary }
}
