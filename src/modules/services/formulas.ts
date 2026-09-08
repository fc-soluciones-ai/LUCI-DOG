import { prisma } from '@/lib/prisma'

/** Fórmulas cosméticas de un servicio — alimentan Mise en Place (proyección de ml) y el cierre de inventario. */
export async function listFormulasForService(serviceId: string) {
  return prisma.formula.findMany({
    where: { serviceId },
    include: { product: { select: { name: true } } },
    orderBy: { name: 'asc' },
  })
}

export interface FormulaInput {
  name: string
  productId: string
  dilutionRatio?: string
  instructions?: string
  baseMlPerUse: number
}

export async function createFormula(serviceId: string, input: FormulaInput) {
  return prisma.formula.create({ data: { serviceId, ...input } })
}

export async function updateFormula(id: string, input: FormulaInput) {
  return prisma.formula.update({ where: { id }, data: input })
}

/** Desactiva en vez de borrar físico — el historial de FormulaUsage en citas ya cerradas se conserva. */
export async function setFormulaActive(id: string, active: boolean) {
  return prisma.formula.update({ where: { id }, data: { active } })
}
