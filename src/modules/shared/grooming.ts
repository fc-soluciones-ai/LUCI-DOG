import type { InstrumentType, ServiceStageType } from '@prisma/client'

export const SIZE_MULTIPLIER: Record<string, number> = {
  XS: 0.5,
  S: 0.75,
  M: 1,
  L: 1.5,
  XL: 2,
}

export function sizeMultiplier(sizeCategory: string | null): number {
  if (!sizeCategory) return 1
  return SIZE_MULTIPLIER[sizeCategory] ?? 1
}

// Instrumental que típicamente requiere cada etapa de servicio. Compartido
// entre el planner de Mise en Place (Módulo 3) y el cierre de inventario
// (Módulo 5) para no duplicar la regla.
export const STAGE_INSTRUMENT_TYPES: Partial<Record<ServiceStageType, InstrumentType[]>> = {
  HAIRCUT: ['SCISSORS', 'COMB_GUIDE', 'BLADE'],
  DESHEDDING: ['RAKE'],
  FINISHING: ['SCISSORS'],
}
