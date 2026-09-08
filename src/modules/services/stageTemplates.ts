import { ServiceStageType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/** Etapas estándar de un servicio (Baño, Secado, Corte...) — alimentan la demanda de instrumental de Mise en Place. */
export async function listStageTemplatesForService(serviceId: string) {
  return prisma.serviceStageTemplate.findMany({
    where: { serviceId },
    orderBy: { order: 'asc' },
  })
}

export interface StageTemplateInput {
  stageType: ServiceStageType
  order: number
  standardDurationMin: number
}

export async function createStageTemplate(serviceId: string, input: StageTemplateInput) {
  return prisma.serviceStageTemplate.create({ data: { serviceId, ...input } })
}

export async function updateStageTemplate(id: string, input: StageTemplateInput) {
  return prisma.serviceStageTemplate.update({ where: { id }, data: input })
}

export async function setStageTemplateActive(id: string, active: boolean) {
  return prisma.serviceStageTemplate.update({ where: { id }, data: { active } })
}
