import { AppointmentStatus, NotificationStage, NotificationStatus, Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { computeLiveStage } from './liveStatus'

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

/** Estado del tablero en tiempo real (Módulo 4): agenda de hoy con semáforo por etapa. */
export async function getTodayBoard() {
  const { start, end } = todayRange()
  const now = new Date()

  const appointments = await prisma.appointment.findMany({
    where: {
      scheduledStart: { gte: start, lt: end },
      status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
    },
    orderBy: { scheduledStart: 'asc' },
    include: {
      pet: true,
      tutor: true,
      service: true,
      groomer: true,
      timeLogs: { orderBy: { orderIndex: 'asc' } },
    },
  })

  const groomerStaff = await prisma.staff.findMany({ where: { role: Role.GROOMER, active: true } })

  const pendingDelayNotifications = await prisma.notificationLog.findMany({
    where: { stage: NotificationStage.DELAY_ALERT, status: NotificationStatus.QUEUED },
    include: { tutor: true, appointment: { include: { pet: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  const boardAppointments = appointments.map((appointment) => ({
    id: appointment.id,
    petName: appointment.pet.name,
    tutorName: appointment.tutor.fullName,
    serviceName: appointment.service.name,
    groomerId: appointment.groomerId,
    groomerName: appointment.groomer?.fullName ?? null,
    status: appointment.status,
    scheduledStart: appointment.scheduledStart.toISOString(),
    scheduledEnd: appointment.scheduledEnd.toISOString(),
    estimatedEnd: appointment.estimatedEnd?.toISOString() ?? null,
    stages: appointment.timeLogs.map((timeLog) => {
      const live = computeLiveStage(timeLog, now)
      return {
        id: timeLog.id,
        stageType: timeLog.stageType,
        orderIndex: timeLog.orderIndex,
        standardDurationMin: timeLog.standardDurationMin,
        overrideDurationMin: timeLog.overrideDurationMin,
        startedAt: timeLog.startedAt?.toISOString() ?? null,
        endedAt: timeLog.endedAt?.toISOString() ?? null,
        status: live.status,
        delaySeconds: live.delaySeconds,
        elapsedSeconds: live.elapsedSeconds,
      }
    }),
  }))

  const groomers = groomerStaff.map((staff) => {
    const exitTimes = boardAppointments
      .filter((a) => a.groomerId === staff.id && a.estimatedEnd)
      .map((a) => new Date(a.estimatedEnd as string).getTime())
    const maxExit = exitTimes.length > 0 ? Math.max(...exitTimes) : null
    return {
      id: staff.id,
      name: staff.fullName,
      projectedExitTime: maxExit ? new Date(maxExit).toISOString() : null,
    }
  })

  return {
    date: start.toISOString(),
    groomers,
    appointments: boardAppointments,
    pendingDelayNotifications: pendingDelayNotifications.map((notification) => ({
      id: notification.id,
      tutorName: notification.tutor.fullName,
      petName: notification.appointment?.pet.name ?? '',
      scheduledFor: notification.scheduledFor.toISOString(),
    })),
  }
}

export type TodayBoard = Awaited<ReturnType<typeof getTodayBoard>>
