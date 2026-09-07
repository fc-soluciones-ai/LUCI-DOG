import { AppointmentSource, AppointmentStatus, NotificationStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { BLOCKING_STATUSES } from '@/modules/agenda/booking'
import { scheduleAppointmentNotifications } from '@/modules/agenda/notifications'
import { BookingBlockedError, ValidationError } from '@/modules/agenda/errors'
import { assertNoPetOverlap, assertSlotAvailable, computeDurationMinutes, getAvailableSlots } from '@/modules/agenda/availability'

export { getAvailableSlots }
export type { TimeSlot } from '@/modules/agenda/availability'

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

  await assertSlotAvailable(input.scheduledStart, input.serviceId, pet.sizeCategory)
  const durationMin = computeDurationMinutes(service.standardDurationMin, pet.sizeCategory)
  const scheduledEnd = new Date(input.scheduledStart.getTime() + durationMin * 60_000)
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
  const appointment = await prisma.appointment.findFirstOrThrow({ where: { id: appointmentId, tutorId }, include: { pet: true } })
  if (!RESCHEDULABLE_STATUSES.includes(appointment.status)) {
    throw new ValidationError('Esta cita ya no se puede reagendar (ya está en proceso o finalizada).')
  }

  const service = await prisma.service.findUniqueOrThrow({ where: { id: appointment.serviceId } })
  await assertSlotAvailable(newStart, appointment.serviceId, appointment.pet.sizeCategory)
  const durationMin = computeDurationMinutes(service.standardDurationMin, appointment.pet.sizeCategory)
  const scheduledEnd = new Date(newStart.getTime() + durationMin * 60_000)
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
