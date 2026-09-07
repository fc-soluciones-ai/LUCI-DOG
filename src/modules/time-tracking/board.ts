import { AppointmentStatus, NotificationStage, NotificationStatus, Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { computeLiveStage } from './liveStatus'
import { zonedDayRange } from '@/modules/agenda/timezone'

const STAGE_LABEL: Record<string, string> = {
  BATH: 'Baño',
  DRYING: 'Secado',
  HAIRCUT: 'Corte',
  NAILS: 'Uñas',
  EARS: 'Oídos',
  DESHEDDING: 'Deslanado',
  FINISHING: 'Acabado',
  OTHER: 'Otro',
}

/** Estado del tablero en tiempo real (Módulo 4): agenda de hoy con semáforo por etapa. */
export async function getTodayBoard() {
  const { start, end } = zonedDayRange(new Date())
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
      pipeline: { select: { id: true, name: true } },
      appointmentSteps: {
        orderBy: { orderIndex: 'asc' },
        include: { processStep: { include: { subProcesses: true } }, subProcessCompletions: true },
      },
    },
  })

  const groomerStaff = await prisma.staff.findMany({ where: { role: Role.GROOMER, active: true } })
  const workstations = await prisma.workstation.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } })

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
    pipelineId: appointment.pipelineId,
    pipelineName: appointment.pipeline?.name ?? null,
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
    pipelineSteps: appointment.appointmentSteps.map((step) => {
      const live = computeLiveStage(step, now)
      const doneIds = new Set(step.subProcessCompletions.map((c) => c.subProcessId))
      return {
        id: step.id,
        stageName: `${STAGE_LABEL[step.processStep.stageType] ?? step.processStep.stageType} — ${step.processStep.name}`,
        workstationId: step.workstationId,
        standardDurationMin: step.overrideDurationMin ?? step.standardDurationMin,
        startedAt: step.startedAt?.toISOString() ?? null,
        endedAt: step.endedAt?.toISOString() ?? null,
        status: live.status,
        delaySeconds: live.delaySeconds,
        elapsedSeconds: live.elapsedSeconds,
        subProcesses: step.processStep.subProcesses
          .sort((a, b) => a.order - b.order)
          .map((sub) => ({ id: sub.id, name: sub.name, done: doneIds.has(sub.id) })),
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
    workstations: workstations.map((w) => ({ id: w.id, name: w.name, category: w.category })),
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
