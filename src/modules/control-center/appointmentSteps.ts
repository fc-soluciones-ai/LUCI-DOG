import { AppointmentStatus, TimeLogStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sizeMultiplier as sharedSizeMultiplier } from '@/modules/shared/grooming'
import { recalculateChainEffect } from '@/modules/time-tracking/chainEffect'

function resolveMultiplier(sizeMultipliers: unknown, sizeCategory: string | null): number {
  if (sizeMultipliers && typeof sizeMultipliers === 'object') {
    const map = sizeMultipliers as Record<string, number>
    if (Object.keys(map).length > 0) {
      return map[sizeCategory ?? 'M'] ?? 1
    }
  }
  return sharedSizeMultiplier(sizeCategory)
}

/** Genera los AppointmentStep de una cita a partir de su ServicePipeline y la marca CHECKED_IN. */
export async function checkInPipelineAppointment(appointmentId: string, groomerId?: string) {
  const appointment = await prisma.appointment.findUniqueOrThrow({
    where: { id: appointmentId },
    include: {
      pet: true,
      pipeline: { include: { steps: { orderBy: { order: 'asc' } } } },
      appointmentSteps: true,
    },
  })

  if (!appointment.pipeline) {
    throw new Error('Esta cita no tiene un ServicePipeline vinculado.')
  }

  if (appointment.appointmentSteps.length === 0) {
    await prisma.appointmentStep.createMany({
      data: appointment.pipeline.steps.map((step) => ({
        appointmentId,
        processStepId: step.id,
        orderIndex: step.order,
        standardDurationMin: Math.round(
          step.standardDurationMin * resolveMultiplier(step.sizeMultipliers, appointment.pet.sizeCategory)
        ),
      })),
    })
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: AppointmentStatus.CHECKED_IN, ...(groomerId ? { groomerId } : {}) },
  })
}

export async function assignWorkstation(appointmentStepId: string, workstationId: string) {
  return prisma.appointmentStep.update({ where: { id: appointmentStepId }, data: { workstationId } })
}

export async function startAppointmentStep(appointmentStepId: string) {
  const step = await prisma.appointmentStep.findUniqueOrThrow({ where: { id: appointmentStepId } })
  if (step.startedAt) return step

  const now = new Date()
  const [updated] = await prisma.$transaction([
    prisma.appointmentStep.update({
      where: { id: appointmentStepId },
      data: { startedAt: now, status: TimeLogStatus.ON_TRACK },
    }),
    prisma.appointment.updateMany({
      where: {
        id: step.appointmentId,
        status: {
          in: [AppointmentStatus.CHECKED_IN, AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING_CONFIRMATION],
        },
      },
      data: { status: AppointmentStatus.IN_PROGRESS, actualStart: now },
    }),
  ])
  return updated
}

export async function finishAppointmentStep(appointmentStepId: string) {
  const step = await prisma.appointmentStep.findUniqueOrThrow({ where: { id: appointmentStepId } })
  if (!step.startedAt || step.endedAt) return step

  const now = new Date()
  const standardSeconds = (step.overrideDurationMin ?? step.standardDurationMin) * 60
  const elapsedSeconds = Math.floor((now.getTime() - step.startedAt.getTime()) / 1000)
  const ratio = elapsedSeconds / standardSeconds
  const status: TimeLogStatus = ratio <= 0.9 ? 'ON_TRACK' : ratio <= 1 ? 'WARNING' : 'DELAYED'
  const delaySeconds = Math.max(0, elapsedSeconds - standardSeconds)

  const updated = await prisma.appointmentStep.update({
    where: { id: appointmentStepId },
    data: { endedAt: now, status, delaySeconds },
  })

  const remaining = await prisma.appointmentStep.count({
    where: { appointmentId: step.appointmentId, endedAt: null },
  })

  if (remaining === 0) {
    await prisma.appointment.update({
      where: { id: step.appointmentId },
      data: { status: AppointmentStatus.COMPLETED, actualEnd: now, estimatedEnd: now },
    })
    await recalculateChainEffect(step.appointmentId)
  }

  return updated
}

export async function overrideAppointmentStepDuration(appointmentStepId: string, minutes: number) {
  return prisma.appointmentStep.update({ where: { id: appointmentStepId }, data: { overrideDurationMin: minutes } })
}

/** Marca/desmarca un subproceso del checklist (Módulo Dashboard TV). */
export async function toggleSubProcess(appointmentStepId: string, subProcessId: string) {
  const existing = await prisma.appointmentSubProcess.findUnique({
    where: { appointmentStepId_subProcessId: { appointmentStepId, subProcessId } },
  })

  if (existing) {
    await prisma.appointmentSubProcess.delete({ where: { id: existing.id } })
    return null
  }

  return prisma.appointmentSubProcess.create({
    data: { appointmentStepId, subProcessId, completedAt: new Date() },
  })
}
