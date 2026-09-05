import { AppointmentStatus, TimeLogSource, TimeLogStatus, type ServiceStageType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { recalculateChainEffect } from './chainEffect'

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

/** Genera los TimeLog de una cita a partir de las etapas de su servicio y la marca CHECKED_IN. */
export async function checkInAppointment(appointmentId: string, groomerId: string) {
  const appointment = await prisma.appointment.findUniqueOrThrow({
    where: { id: appointmentId },
    include: { service: { include: { stageTemplates: true } }, timeLogs: true },
  })

  if (appointment.timeLogs.length === 0) {
    await prisma.timeLog.createMany({
      data: appointment.service.stageTemplates.map((stage) => ({
        appointmentId,
        groomerId,
        stageType: stage.stageType,
        orderIndex: stage.order,
        standardDurationMin: stage.standardDurationMin,
      })),
    })
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: AppointmentStatus.CHECKED_IN, groomerId },
  })
}

export async function startStage(timeLogId: string, source: TimeLogSource = TimeLogSource.MANUAL) {
  const timeLog = await prisma.timeLog.findUniqueOrThrow({ where: { id: timeLogId } })
  if (timeLog.startedAt) return timeLog

  const now = new Date()
  const [updated] = await prisma.$transaction([
    prisma.timeLog.update({
      where: { id: timeLogId },
      data: { startedAt: now, source, status: TimeLogStatus.ON_TRACK },
    }),
    prisma.appointment.updateMany({
      where: {
        id: timeLog.appointmentId,
        status: {
          in: [AppointmentStatus.CHECKED_IN, AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING_CONFIRMATION],
        },
      },
      data: { status: AppointmentStatus.IN_PROGRESS, actualStart: now },
    }),
  ])
  return updated
}

export async function finishStage(timeLogId: string, source: TimeLogSource = TimeLogSource.MANUAL) {
  const timeLog = await prisma.timeLog.findUniqueOrThrow({ where: { id: timeLogId } })
  if (!timeLog.startedAt || timeLog.endedAt) return timeLog

  const now = new Date()
  const standardSeconds = (timeLog.overrideDurationMin ?? timeLog.standardDurationMin) * 60
  const elapsedSeconds = Math.floor((now.getTime() - timeLog.startedAt.getTime()) / 1000)
  const ratio = elapsedSeconds / standardSeconds
  const status: TimeLogStatus = ratio <= 0.9 ? 'ON_TRACK' : ratio <= 1 ? 'WARNING' : 'DELAYED'
  const delaySeconds = Math.max(0, elapsedSeconds - standardSeconds)

  const updated = await prisma.timeLog.update({
    where: { id: timeLogId },
    data: { endedAt: now, status, delaySeconds, source },
  })

  const remaining = await prisma.timeLog.count({
    where: { appointmentId: timeLog.appointmentId, endedAt: null },
  })

  if (remaining === 0) {
    await prisma.appointment.update({
      where: { id: timeLog.appointmentId },
      data: { status: AppointmentStatus.COMPLETED, actualEnd: now, estimatedEnd: now },
    })
    await recalculateChainEffect(timeLog.appointmentId)
  }

  return updated
}

export async function overrideStageDuration(timeLogId: string, minutes: number) {
  return prisma.timeLog.update({
    where: { id: timeLogId },
    data: { overrideDurationMin: minutes, source: TimeLogSource.SYSTEM_OVERRIDE },
  })
}

export async function reorderStages(appointmentId: string, orderedTimeLogIds: string[]) {
  await prisma.$transaction(
    orderedTimeLogIds.map((id, index) =>
      prisma.timeLog.update({ where: { id }, data: { orderIndex: index, source: TimeLogSource.DRAG_DROP } })
    )
  )
}

export async function findTodayAppointmentByPetName(petName: string) {
  const { start, end } = todayRange()
  return prisma.appointment.findFirst({
    where: {
      scheduledStart: { gte: start, lt: end },
      status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW, AppointmentStatus.COMPLETED] },
      pet: { name: { contains: petName, mode: 'insensitive' } },
    },
    include: { timeLogs: true },
  })
}

export async function findActiveStage(appointmentId: string) {
  return prisma.timeLog.findFirst({ where: { appointmentId, startedAt: { not: null }, endedAt: null } })
}
