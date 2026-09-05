import { AppointmentStatus, NotificationStage, NotificationStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * Motor de Efecto en Cadena (Módulo 4): al completar una cita, si terminó
 * tarde respecto a lo programado, desplaza la hora estimada de las citas
 * siguientes del mismo groomer ese día y crea notificaciones de retraso
 * sugeridas (quedan en QUEUED — el staff decide enviarlas).
 */
export async function recalculateChainEffect(completedAppointmentId: string) {
  const completed = await prisma.appointment.findUniqueOrThrow({ where: { id: completedAppointmentId } })
  if (!completed.groomerId || !completed.actualEnd) return

  const scheduledDurationMs = completed.scheduledEnd.getTime() - completed.scheduledStart.getTime()
  const actualStart = completed.actualStart ?? completed.scheduledStart
  const actualDurationMs = completed.actualEnd.getTime() - actualStart.getTime()
  const delayMs = actualDurationMs - scheduledDurationMs

  if (delayMs <= 0) return

  const dayEnd = new Date(completed.scheduledStart)
  dayEnd.setHours(0, 0, 0, 0)
  dayEnd.setDate(dayEnd.getDate() + 1)

  const subsequent = await prisma.appointment.findMany({
    where: {
      groomerId: completed.groomerId,
      scheduledStart: { gt: completed.scheduledStart, lt: dayEnd },
      status: {
        in: [AppointmentStatus.PENDING_CONFIRMATION, AppointmentStatus.CONFIRMED, AppointmentStatus.CHECKED_IN],
      },
    },
    orderBy: { scheduledStart: 'asc' },
  })

  for (const appointment of subsequent) {
    const newEstimatedEnd = new Date(appointment.scheduledEnd.getTime() + delayMs)

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: AppointmentStatus.DELAYED, estimatedEnd: newEstimatedEnd },
    })

    await prisma.notificationLog.create({
      data: {
        appointmentId: appointment.id,
        tutorId: appointment.tutorId,
        stage: NotificationStage.DELAY_ALERT,
        status: NotificationStatus.QUEUED,
        scheduledFor: new Date(),
      },
    })
  }
}
