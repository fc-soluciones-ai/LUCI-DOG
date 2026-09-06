import { AppointmentStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'

// Ventana de jornada laboral mostrada en el eje X del Gantt de la TV.
export const WORKDAY_START_HOUR = 8
export const WORKDAY_END_HOUR = 19

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

async function fetchPipelineAppointmentsForDay(start: Date, end: Date) {
  return prisma.appointment.findMany({
    where: {
      scheduledStart: { gte: start, lt: end },
      status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
      pipelineId: { not: null },
    },
    orderBy: { scheduledStart: 'asc' },
    include: {
      pet: { include: { photos: { where: { type: 'PROFILE' }, take: 1 } } },
      tutor: { select: { fullName: true, photoUrl: true } },
      appointmentSteps: {
        orderBy: { orderIndex: 'asc' },
        include: {
          processStep: { include: { subProcesses: true } },
          workstation: true,
          subProcessCompletions: true,
        },
      },
    },
  })
}

export interface GanttBlock {
  appointmentStepId: string
  appointmentId: string
  petName: string
  petPhotoUrl: string | null
  tutorName: string
  tutorPhotoUrl: string | null
  breed: string
  stageName: string
  workstationId: string | null
  workstationName: string | null
  status: string
  startedAt: string | null
  endedAt: string | null
  displayStart: string
  displayEnd: string
  delaySeconds: number
  elapsedSeconds: number
  standardDurationMin: number
  subProcessesDone: number
  subProcessesTotal: number
  hasConflict: boolean
}

/** Tablero para el Dashboard TV: lanes por estación + bloques tipo Gantt (Módulo Control Center). */
export async function getPipelineBoard() {
  const { start, end } = todayRange()
  const now = new Date()

  const [appointments, workstations] = await Promise.all([
    fetchPipelineAppointmentsForDay(start, end),
    prisma.workstation.findMany({ where: { active: true }, orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] }),
  ])

  const blocks: GanttBlock[] = []

  for (const appointment of appointments) {
    let cursor = appointment.scheduledStart

    for (const step of appointment.appointmentSteps) {
      const computedStart = cursor
      const computedEnd = new Date(computedStart.getTime() + step.standardDurationMin * 60_000)
      cursor = computedEnd

      const displayStart = step.startedAt ?? computedStart
      const liveEnd = step.startedAt && !step.endedAt ? now : computedEnd
      const displayEnd = step.endedAt ?? (step.startedAt ? liveEnd : computedEnd)

      const elapsedSeconds = step.startedAt
        ? Math.floor(((step.endedAt ?? now).getTime() - step.startedAt.getTime()) / 1000)
        : 0

      blocks.push({
        appointmentStepId: step.id,
        appointmentId: appointment.id,
        petName: appointment.pet.name,
        petPhotoUrl: appointment.pet.photos[0]?.url ?? null,
        tutorName: appointment.tutor.fullName,
        tutorPhotoUrl: appointment.tutor.photoUrl,
        breed: appointment.pet.breed,
        stageName: step.processStep.name,
        workstationId: step.workstationId,
        workstationName: step.workstation?.name ?? null,
        status: step.status,
        startedAt: step.startedAt?.toISOString() ?? null,
        endedAt: step.endedAt?.toISOString() ?? null,
        displayStart: displayStart.toISOString(),
        displayEnd: displayEnd.toISOString(),
        delaySeconds: step.delaySeconds,
        elapsedSeconds,
        standardDurationMin: step.overrideDurationMin ?? step.standardDurationMin,
        subProcessesDone: step.subProcessCompletions.length,
        subProcessesTotal: step.processStep.subProcesses.length,
        hasConflict: false,
      })
    }
  }

  // Traslapes: por estación, empuja el bloque siguiente si se encima con el anterior.
  const byWorkstation = new Map<string, GanttBlock[]>()
  for (const block of blocks) {
    if (!block.workstationId) continue
    const list = byWorkstation.get(block.workstationId) ?? []
    list.push(block)
    byWorkstation.set(block.workstationId, list)
  }

  for (const list of byWorkstation.values()) {
    list.sort((a, b) => new Date(a.displayStart).getTime() - new Date(b.displayStart).getTime())
    let laneEnd = 0
    for (const block of list) {
      const startMs = new Date(block.displayStart).getTime()
      const endMs = new Date(block.displayEnd).getTime()
      if (startMs < laneEnd) {
        const duration = endMs - startMs
        block.displayStart = new Date(laneEnd).toISOString()
        block.displayEnd = new Date(laneEnd + duration).toISOString()
        block.hasConflict = true
        laneEnd = laneEnd + duration
      } else {
        laneEnd = endMs
      }
    }
  }

  const unassigned = blocks.filter((b) => !b.workstationId)

  return {
    date: start.toISOString(),
    workdayStartHour: WORKDAY_START_HOUR,
    workdayEndHour: WORKDAY_END_HOUR,
    now: now.toISOString(),
    workstations: workstations.map((w) => ({ id: w.id, name: w.name, category: w.category })),
    blocksByWorkstation: Object.fromEntries(byWorkstation.entries()),
    unassigned,
  }
}

export type PipelineBoard = Awaited<ReturnType<typeof getPipelineBoard>>
