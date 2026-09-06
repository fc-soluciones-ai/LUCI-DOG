import { AppointmentSource, AppointmentStatus, NotificationStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { BLOCKING_STATUSES } from '@/modules/agenda/booking'
import { scheduleAppointmentNotifications } from '@/modules/agenda/notifications'
import { BookingBlockedError, ValidationError } from '@/modules/agenda/errors'
import { WORKDAY_END_HOUR, WORKDAY_START_HOUR } from '@/modules/control-center/pipelineBoard'

const SLOT_STEP_MIN = 30

export interface TimeSlot {
  start: string // ISO
  available: boolean
}

/**
 * Slots de `SLOT_STEP_MIN` minutos entre las horas de trabajo. "Disponible" se
 * define por capacidad, no por estación/groomer específico: cuántas citas ya
 * se traslapan con el slot contra el total de estaciones activas — la misma
 * noción de capacidad que ya usa el Dashboard TV, sin un motor de reservas nuevo.
 */
export async function getAvailableSlots(date: Date, serviceId: string): Promise<TimeSlot[]> {
  const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } })
  const durationMs = service.standardDurationMin * 60_000

  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)

  const [appointments, activeWorkstations] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        scheduledStart: { gte: dayStart, lt: dayEnd },
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
      },
      select: { scheduledStart: true, scheduledEnd: true },
    }),
    prisma.workstation.count({ where: { active: true } }),
  ])

  const capacity = Math.max(activeWorkstations, 1)
  const dayCloseMs = new Date(dayStart).setHours(WORKDAY_END_HOUR, 0, 0, 0)
  const slots: TimeSlot[] = []

  for (let minutes = WORKDAY_START_HOUR * 60; minutes < WORKDAY_END_HOUR * 60; minutes += SLOT_STEP_MIN) {
    const slotStart = new Date(dayStart.getTime() + minutes * 60_000)
    const slotEnd = new Date(slotStart.getTime() + durationMs)
    if (slotEnd.getTime() > dayCloseMs) continue // no cabe antes del cierre

    const overlapping = appointments.filter(
      (a) => a.scheduledStart < slotEnd && a.scheduledEnd > slotStart
    ).length

    slots.push({ start: slotStart.toISOString(), available: overlapping < capacity })
  }

  return slots
}

async function assertSlotAvailable(scheduledStart: Date, serviceId: string) {
  const slots = await getAvailableSlots(scheduledStart, serviceId)
  const match = slots.find((slot) => slot.start === scheduledStart.toISOString())
  if (!match || !match.available) {
    throw new ValidationError('Ese horario ya no está disponible. Elige otro.')
  }
}

/**
 * Choque de horario específico de la mascota: además de la capacidad general
 * del salón, la MISMA mascota nunca puede tener dos citas activas que se
 * traslapen (independientemente de cuánta capacidad libre haya).
 */
async function assertNoPetOverlap(petId: string, scheduledStart: Date, scheduledEnd: Date, excludeAppointmentId?: string) {
  const conflict = await prisma.appointment.findFirst({
    where: {
      petId,
      id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
      status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
      scheduledStart: { lt: scheduledEnd },
      scheduledEnd: { gt: scheduledStart },
    },
  })
  if (conflict) {
    throw new ValidationError('Esta mascota ya tiene otra cita en ese horario.')
  }
}

export interface ClientBookingInput {
  petId: string
  serviceId: string
  scheduledStart: Date
}

/** Agenda una cita para el tutor autenticado — tutorId siempre viene de la sesión, nunca del formulario. */
export async function createAppointmentByClient(tutorId: string, input: ClientBookingInput) {
  const tutor = await prisma.tutor.findUniqueOrThrow({ where: { id: tutorId } })
  if (BLOCKING_STATUSES.includes(tutor.billingStatus)) {
    throw new BookingBlockedError(
      'Tienes un comprobante de pago pendiente de verificación. Contacta al salón para reactivar tu agenda.',
      tutor.billingStatus
    )
  }

  const pet = await prisma.pet.findFirstOrThrow({ where: { id: input.petId, tutorId } })
  const service = await prisma.service.findUniqueOrThrow({ where: { id: input.serviceId } })

  await assertSlotAvailable(input.scheduledStart, input.serviceId)
  const scheduledEnd = new Date(input.scheduledStart.getTime() + service.standardDurationMin * 60_000)
  await assertNoPetOverlap(pet.id, input.scheduledStart, scheduledEnd)

  const appointment = await prisma.appointment.create({
    data: {
      petId: pet.id,
      tutorId,
      serviceId: service.id,
      source: AppointmentSource.SELF_SERVICE_WEB,
      status: AppointmentStatus.PENDING_CONFIRMATION,
      scheduledStart: input.scheduledStart,
      scheduledEnd,
      quoteEstimated: service.basePrice,
    },
  })

  await scheduleAppointmentNotifications(prisma, appointment.id)
  return appointment
}

const RESCHEDULABLE_STATUSES: AppointmentStatus[] = [AppointmentStatus.PENDING_CONFIRMATION, AppointmentStatus.CONFIRMED]

/** Reagenda una cita propia — solo si aún no arrancó (Pendiente/Confirmada). */
export async function rescheduleAppointmentByClient(tutorId: string, appointmentId: string, newStart: Date) {
  const appointment = await prisma.appointment.findFirstOrThrow({ where: { id: appointmentId, tutorId } })
  if (!RESCHEDULABLE_STATUSES.includes(appointment.status)) {
    throw new ValidationError('Esta cita ya no se puede reagendar (ya está en proceso o finalizada).')
  }

  const service = await prisma.service.findUniqueOrThrow({ where: { id: appointment.serviceId } })
  await assertSlotAvailable(newStart, appointment.serviceId)
  const scheduledEnd = new Date(newStart.getTime() + service.standardDurationMin * 60_000)
  await assertNoPetOverlap(appointment.petId, newStart, scheduledEnd, appointmentId)

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { scheduledStart: newStart, scheduledEnd, status: AppointmentStatus.PENDING_CONFIRMATION },
  })

  // Las notificaciones en cola quedaron calculadas sobre el horario viejo — se recalculan.
  await prisma.notificationLog.deleteMany({ where: { appointmentId, status: NotificationStatus.QUEUED } })
  await scheduleAppointmentNotifications(prisma, appointmentId)

  return updated
}

const NON_CANCELLABLE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.IN_PROGRESS,
  AppointmentStatus.COMPLETED,
  AppointmentStatus.CANCELLED,
]

/** Cancela una cita propia — no aplica si ya está en proceso o finalizada. */
export async function cancelAppointmentByClient(tutorId: string, appointmentId: string) {
  const appointment = await prisma.appointment.findFirstOrThrow({ where: { id: appointmentId, tutorId } })
  if (NON_CANCELLABLE_STATUSES.includes(appointment.status)) {
    throw new ValidationError('Esta cita ya no se puede cancelar.')
  }

  await prisma.notificationLog.deleteMany({ where: { appointmentId, status: NotificationStatus.QUEUED } })

  return prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: AppointmentStatus.CANCELLED, cancelReason: 'Cancelada por el cliente desde el portal' },
  })
}
