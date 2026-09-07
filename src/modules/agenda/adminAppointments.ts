import { AppointmentSource, AppointmentStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { assertNoPetOverlap, assertSlotAvailable, computeDurationMinutes } from './availability'
import { scheduleAppointmentNotifications } from './notifications'
import { ValidationError } from './errors'

export interface AdminAppointmentFilters {
  status?: AppointmentStatus
  dateFrom?: Date
  dateTo?: Date
  workstationId?: string
}

/** Listado global de citas para recepción — con filtros por estado, rango de fecha y estación asignada. */
export async function listAppointmentsForAdmin(filters: AdminAppointmentFilters = {}) {
  return prisma.appointment.findMany({
    where: {
      status: filters.status,
      scheduledStart: {
        gte: filters.dateFrom,
        lt: filters.dateTo,
      },
      appointmentSteps: filters.workstationId ? { some: { workstationId: filters.workstationId } } : undefined,
    },
    orderBy: { scheduledStart: 'asc' },
    take: 200,
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

  return prisma.$transaction(async (tx) => {
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
    return appointment
  })
}
