import { prisma } from '@/lib/prisma'

// --- Categorías de producto ---

export async function listProductCategories() {
  return prisma.productCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] })
}

export async function listActiveProductCategories() {
  return prisma.productCategory.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] })
}

export interface CategoryInput {
  name: string
}

/** El orden nuevo se agrega al final de la lista — se reordena arrastrando, no escribiendo un número. */
export async function createProductCategory(input: CategoryInput) {
  const last = await prisma.productCategory.findFirst({ orderBy: { sortOrder: 'desc' } })
  return prisma.productCategory.create({ data: { ...input, sortOrder: (last?.sortOrder ?? 0) + 1 } })
}

export async function updateProductCategory(id: string, input: CategoryInput) {
  return prisma.productCategory.update({ where: { id }, data: input })
}

export async function setProductCategoryActive(id: string, active: boolean) {
  return prisma.productCategory.update({ where: { id }, data: { active } })
}

/** Reordena por arrastre en el admin — reemplaza el campo "Orden" manual. */
export async function reorderProductCategories(orderedIds: string[]) {
  return prisma.$transaction(
    orderedIds.map((id, index) => prisma.productCategory.update({ where: { id }, data: { sortOrder: index } }))
  )
}

// --- Unidades de medida ---

export async function listUnitsOfMeasure() {
  return prisma.unitOfMeasure.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] })
}

export async function listActiveUnitsOfMeasure() {
  return prisma.unitOfMeasure.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] })
}

export interface UnitInput {
  name: string
  abbreviation: string
}

/** El orden nuevo se agrega al final de la lista — se reordena arrastrando, no escribiendo un número. */
export async function createUnitOfMeasure(input: UnitInput) {
  const last = await prisma.unitOfMeasure.findFirst({ orderBy: { sortOrder: 'desc' } })
  return prisma.unitOfMeasure.create({ data: { ...input, sortOrder: (last?.sortOrder ?? 0) + 1 } })
}

export async function updateUnitOfMeasure(id: string, input: UnitInput) {
  return prisma.unitOfMeasure.update({ where: { id }, data: input })
}

export async function setUnitOfMeasureActive(id: string, active: boolean) {
  return prisma.unitOfMeasure.update({ where: { id }, data: { active } })
}

/** Reordena por arrastre en el admin — reemplaza el campo "Orden" manual. */
export async function reorderUnitsOfMeasure(orderedIds: string[]) {
  return prisma.$transaction(
    orderedIds.map((id, index) => prisma.unitOfMeasure.update({ where: { id }, data: { sortOrder: index } }))
  )
}
