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

export async function listServicesWithoutPipeline() {
  return prisma.service.findMany({ where: { pipeline: null, active: true }, select: { id: true, name: true } })
}

export interface CreatePipelineInput {
  name: string
  description?: string
  serviceId?: string
}

export async function createPipeline(input: CreatePipelineInput) {
  return prisma.servicePipeline.create({ data: input })
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
