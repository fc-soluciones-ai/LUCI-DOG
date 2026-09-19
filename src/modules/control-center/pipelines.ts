import type { ServiceStageType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function listPipelines() {
  return prisma.servicePipeline.findMany({
    orderBy: { name: 'asc' },
    include: {
      service: { select: { id: true, name: true } },
      steps: {
        orderBy: { order: 'asc' },
        include: { subProcesses: { orderBy: { order: 'asc' } } },
      },
    },
  })
}

/**
 * Todos los servicios activos con el proceso que ya tienen vinculado (si
 * alguno) — para construir, sin N+1, el selector "servicio vinculado" de
 * cada proceso: sus opciones son los servicios sin proceso más el que ya
 * tiene este mismo proceso (serviceId es único por proceso, así que uno
 * tomado por OTRO proceso no debe aparecer como opción).
 */
export async function listServicesForPipelineLinking() {
  return prisma.service.findMany({
    where: { active: true },
    select: { id: true, name: true, pipeline: { select: { id: true } } },
    orderBy: { name: 'asc' },
  })
}

export interface CreatePipelineInput {
  name: string
  description?: string
  serviceId?: string
}

export async function createPipeline(input: CreatePipelineInput) {
  return prisma.servicePipeline.create({ data: input })
}

export interface UpdatePipelineInput {
  name: string
  description?: string
  serviceId?: string
}

/** Edita nombre, descripción y el servicio vinculado — antes solo se podía fijar el vínculo al crear el proceso. */
export async function updatePipeline(pipelineId: string, input: UpdatePipelineInput) {
  return prisma.servicePipeline.update({
    where: { id: pipelineId },
    data: { name: input.name, description: input.description || null, serviceId: input.serviceId || null },
  })
}

export async function setPipelineActive(pipelineId: string, active: boolean) {
  return prisma.servicePipeline.update({ where: { id: pipelineId }, data: { active } })
}

export interface CreateProcessStepInput {
  pipelineId: string
  name: string
  order: number
  stageType: ServiceStageType
  standardDurationMin: number
}

export async function createProcessStep(input: CreateProcessStepInput) {
  return prisma.processStep.create({ data: input })
}

export async function deleteProcessStep(processStepId: string) {
  return prisma.processStep.delete({ where: { id: processStepId } })
}

export interface CreateSubProcessInput {
  processStepId: string
  name: string
  order: number
}

export async function createSubProcess(input: CreateSubProcessInput) {
  return prisma.subProcess.create({ data: input })
}

export async function deleteSubProcess(subProcessId: string) {
  return prisma.subProcess.delete({ where: { id: subProcessId } })
}

/** Reordena los subprocesos de una etapa tras un drag-and-drop en el admin. */
export async function reorderSubProcesses(orderedIds: string[]) {
  return prisma.$transaction(
    orderedIds.map((id, index) => prisma.subProcess.update({ where: { id }, data: { order: index + 1 } }))
  )
}

/** Edición en línea de la duración estándar de una etapa, sin abrir un formulario modal. */
export async function updateProcessStepDuration(processStepId: string, standardDurationMin: number) {
  return prisma.processStep.update({ where: { id: processStepId }, data: { standardDurationMin } })
}
