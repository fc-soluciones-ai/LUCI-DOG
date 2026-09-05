import { AppointmentSource, AppointmentStatus, RecurrenceInterval } from '@prisma/client'
import type { Prisma, PrismaClient } from '@prisma/client'
import { scheduleAppointmentNotifications } from './notifications'

type Db = PrismaClient | Prisma.TransactionClient

const INTERVAL_DAYS: Record<RecurrenceInterval, number> = {
  DAYS_7: 7,
  DAYS_15: 15,
  DAYS_21: 21,
  DAYS_30: 30,
}

function combineDateAndTime(date: Date, time: string | null): Date {
  const result = new Date(date)
  if (time) {
    const [hours, minutes] = time.split(':').map(Number)
    result.setHours(hours, minutes, 0, 0)
  }
  return result
}

export interface RecurringBatchResult {
  created: string[]
  skippedConflicts: { scheduledStart: Date; reason: string }[]
}

/**
 * Genera hasta `count` citas futuras para una programación recurrente en una
 * sola pasada ("bloqueo en lote"), evitando choques de agenda del mismo
 * groomer y encadenando las notificaciones de WhatsApp de cada cita creada.
 */
export async function generateRecurringBatch(
  db: Db,
  scheduleId: string,
  count = 4
): Promise<RecurringBatchResult> {
  const schedule = await db.recurringSchedule.findUniqueOrThrow({
    where: { id: scheduleId },
    include: {
      service: true,
      pet: { select: { tutorId: true } },
      appointments: { orderBy: { scheduledStart: 'desc' }, take: 1 },
    },
  })

  if (!schedule.active) {
    throw new Error(`La programación recurrente ${scheduleId} está inactiva.`)
  }

  const intervalDays = INTERVAL_DAYS[schedule.interval]
  const lastAppointment = schedule.appointments[0]
  const groomerId = lastAppointment?.groomerId ?? null

  const created: string[] = []
  const skippedConflicts: RecurringBatchResult['skippedConflicts'] = []

  let cursor = lastAppointment ? new Date(lastAppointment.scheduledStart) : new Date()

  for (let i = 0; i < count; i++) {
    cursor = new Date(cursor)
    cursor.setDate(cursor.getDate() + intervalDays)
    const scheduledStart = combineDateAndTime(cursor, schedule.preferredTime)
    const scheduledEnd = new Date(scheduledStart.getTime() + schedule.service.standardDurationMin * 60_000)

    if (groomerId) {
      const conflict = await db.appointment.findFirst({
        where: {
          groomerId,
          status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
          scheduledStart: { lt: scheduledEnd },
          scheduledEnd: { gt: scheduledStart },
        },
      })
      if (conflict) {
        skippedConflicts.push({
          scheduledStart,
          reason: `Choque con la cita ${conflict.id} del mismo groomer`,
        })
        continue
      }
    }

    const appointment = await db.appointment.create({
      data: {
        petId: schedule.petId,
        tutorId: schedule.pet.tutorId,
        serviceId: schedule.serviceId,
        groomerId,
        recurringScheduleId: schedule.id,
        source: AppointmentSource.RECURRING_AUTO,
        status: AppointmentStatus.CONFIRMED,
        scheduledStart,
        scheduledEnd,
        quoteEstimated: schedule.service.basePrice,
      },
    })

    await scheduleAppointmentNotifications(db, appointment.id)
    created.push(appointment.id)
  }

  await db.recurringSchedule.update({
    where: { id: schedule.id },
    data: { lastGeneratedAt: new Date() },
  })

  return { created, skippedConflicts }
}
