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

// Acepta `number` o el `Decimal` que devuelve Prisma para estas columnas.
type Numberish = number | { toString(): string }

export interface FormulaQuantities {
  qtyXS: Numberish
  qtyS: Numberish
  qtyM: Numberish
  qtyL: Numberish
  qtyXL: Numberish
}

/**
 * Cantidad exacta de una fórmula para la talla real de la mascota — el admin
 * la define a mano por talla (ya con su propia dilución, conteo de
 * pañoletas/algodón, etc. calculado), así que aquí no se aplica ningún
 * multiplicador adicional. Sin talla registrada, o para XXL (no tiene
 * columna propia), se usa M como referencia neutra.
 */
export function quantityForSize(formula: FormulaQuantities, sizeCategory: string | null): number {
  switch (sizeCategory) {
    case 'XS':
      return Number(formula.qtyXS)
    case 'S':
      return Number(formula.qtyS)
    case 'L':
      return Number(formula.qtyL)
    case 'XL':
    case 'XXL':
      return Number(formula.qtyXL)
    default:
      return Number(formula.qtyM)
  }
}

// Instrumental que típicamente requiere cada etapa de servicio. Compartido
// entre el planner de Mise en Place (Módulo 3) y el cierre de inventario
// (Módulo 5) para no duplicar la regla.
export const STAGE_INSTRUMENT_TYPES: Partial<Record<ServiceStageType, InstrumentType[]>> = {
  HAIRCUT: ['SCISSORS', 'COMB_GUIDE', 'BLADE'],
  DESHEDDING: ['RAKE'],
  FINISHING: ['SCISSORS'],
}
