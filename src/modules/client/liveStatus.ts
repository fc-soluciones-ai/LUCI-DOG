import { AppointmentStatus, type ServiceStageType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { formatInBusinessTz, zonedDayRange } from '@/modules/agenda/timezone'

/**
 * Seguimiento en vivo para el dueño: en qué etapa va su mascota hoy. Lee las
 * mismas etapas que usa el piso de trabajo (AppointmentStep del proceso, o
 * TimeLog en citas sin proceso), con nombres amigables y sin tiempos internos.
 */

const CLIENT_STAGE_LABEL: Record<ServiceStageType, string> = {
  BATH: 'Baño',
  DRYING: 'Secado',
  HAIRCUT: 'Corte',
  NAILS: 'Uñas',
  EARS: 'Limpieza de oídos',
  DESHEDDING: 'Deslanado',
  FINISHING: 'Últimos detalles',
  OTHER: 'Cuidado especial',
}

export type LiveStepState = 'done' | 'current' | 'pending'

export interface ClientLiveStatus {
  appointmentId: string
  petName: string
  serviceName: string
  headline: string
  ready: boolean
  steps: Array<{ label: string; state: LiveStepState }>
  estimatedReadyLabel: string | null
  photoUrl: string | null
}

const ACTIVE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.IN_PROGRESS,
  AppointmentStatus.DELAYED,
  AppointmentStatus.COMPLETED,
]

function stateOf(step: { startedAt: Date | null; endedAt: Date | null }): LiveStepState {
  if (step.endedAt) return 'done'
  if (step.startedAt) return 'current'
  return 'pending'
}

export async function getClientLiveStatus(tutorId: string): Promise<ClientLiveStatus[]> {
  const { start, end } = zonedDayRange(new Date())

  const appointments = await prisma.appointment.findMany({
    where: { tutorId, scheduledStart: { gte: start, lt: end }, status: { in: ACTIVE_STATUSES } },
    orderBy: { scheduledStart: 'asc' },
    include: {
      pet: true,
      service: true,
      timeLogs: { orderBy: { orderIndex: 'asc' } },
      appointmentSteps: { orderBy: { orderIndex: 'asc' }, include: { processStep: true } },
    },
  })
  if (appointments.length === 0) return []

  const photos = await prisma.petPhoto.findMany({
    where: { petId: { in: appointments.map((a) => a.petId) }, type: 'AFTER', takenAt: { gte: start, lt: end } },
    orderBy: { takenAt: 'desc' },
  })

  return appointments.map((appointment) => {
    const rawSteps =
      appointment.appointmentSteps.length > 0
        ? appointment.appointmentSteps.map((step) => ({
            stageType: step.processStep.stageType,
            startedAt: step.startedAt,
            endedAt: step.endedAt,
          }))
        : appointment.timeLogs.map((log) => ({
            stageType: log.stageType,
            startedAt: log.startedAt,
            endedAt: log.endedAt,
          }))

    const ready = appointment.status === AppointmentStatus.COMPLETED
    const steps = rawSteps.map((step) => ({
      label: CLIENT_STAGE_LABEL[step.stageType],
      state: ready ? ('done' as const) : stateOf(step),
    }))
    const current = steps.find((step) => step.state === 'current')

    let headline: string
    if (ready) headline = `¡${appointment.pet.name} está listo! Puedes pasar a recogerlo.`
    else if (current) headline = `${appointment.pet.name} está en: ${current.label}`
    else if (appointment.status === AppointmentStatus.CHECKED_IN) headline = `${appointment.pet.name} ya llegó y está por comenzar.`
    else headline = `${appointment.pet.name} está en el proceso.`

    return {
      appointmentId: appointment.id,
      petName: appointment.pet.name,
      serviceName: appointment.service.name,
      headline,
      ready,
      steps,
      estimatedReadyLabel:
        !ready && appointment.estimatedEnd ? formatInBusinessTz(appointment.estimatedEnd, 'h:mm a') : null,
      photoUrl: photos.find((photo) => photo.petId === appointment.petId)?.url ?? null,
    }
  })
}
