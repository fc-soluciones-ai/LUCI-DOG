import type { ServiceStageType } from '@prisma/client'

export interface ResolvedStage {
  stageType: ServiceStageType
  standardDurationMin: number
}

interface ServiceWithStageSources {
  stageTemplates: ResolvedStage[]
  pipeline?: { active: boolean; steps: ResolvedStage[] } | null
}

/**
 * Etapas efectivas de un servicio para proyectar instrumental (Mise en Place,
 * cierre de inventario): si el servicio tiene un Proceso (ServicePipeline)
 * activo con etapas, esas mandan — es la fuente más rica, la misma que usa
 * el Dashboard TV. Si no, se usan las Etapas estándar simples. Nunca se
 * combinan ambas fuentes a la vez para no contar instrumental por duplicado.
 */
export function resolveServiceStages(service: ServiceWithStageSources): ResolvedStage[] {
  if (service.pipeline?.active && service.pipeline.steps.length > 0) {
    return service.pipeline.steps
  }
  return service.stageTemplates
}
