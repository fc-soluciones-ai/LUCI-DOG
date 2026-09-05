import type { Prisma, PrismaClient } from '@prisma/client'
import { NotificationStage, NotificationStatus } from '@prisma/client'

type Db = PrismaClient | Prisma.TransactionClient

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

// Notificaciones multietapa del Módulo 1 (no incluye POST_SERVICE_RECEIPT,
// que se programa al cerrar el servicio — Módulo 6).
const STAGE_OFFSETS_MS: Record<
  'T_MINUS_5_DAYS' | 'T_MINUS_24_HOURS' | 'T_MINUS_22_HOURS_LOCATION' | 'T_MINUS_15_MIN_DEPARTURE',
  number
> = {
  T_MINUS_5_DAYS: 5 * DAY,
  T_MINUS_24_HOURS: 24 * HOUR,
  T_MINUS_22_HOURS_LOCATION: 22 * HOUR,
  T_MINUS_15_MIN_DEPARTURE: 15 * MINUTE,
}

/** Crea las 4 notificaciones de WhatsApp asociadas a una cita recién confirmada. */
export async function scheduleAppointmentNotifications(db: Db, appointmentId: string) {
  const appointment = await db.appointment.findUniqueOrThrow({
    where: { id: appointmentId },
    select: { id: true, tutorId: true, scheduledStart: true },
  })

  const rows = Object.entries(STAGE_OFFSETS_MS)
    .map(([stage, offsetMs]) => ({
      appointmentId: appointment.id,
      tutorId: appointment.tutorId,
      stage: stage as NotificationStage,
      status: NotificationStatus.QUEUED,
      scheduledFor: new Date(appointment.scheduledStart.getTime() - offsetMs),
    }))
    // no programar etapas cuyo horario ya pasó (cita creada a último minuto)
    .filter((row) => row.scheduledFor.getTime() > Date.now())

  if (rows.length === 0) return { created: 0 }

  await db.notificationLog.createMany({ data: rows })
  return { created: rows.length }
}
