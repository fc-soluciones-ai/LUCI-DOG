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
  sortOrder?: number
}

export async function createProductCategory(input: CategoryInput) {
  return prisma.productCategory.create({ data: input })
}

export async function updateProductCategory(id: string, input: CategoryInput) {
  return prisma.productCategory.update({ where: { id }, data: input })
}

export async function setProductCategoryActive(id: string, active: boolean) {
  return prisma.productCategory.update({ where: { id }, data: { active } })
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
  sortOrder?: number
}

export async function createUnitOfMeasure(input: UnitInput) {
  return prisma.unitOfMeasure.create({ data: input })
}

export async function updateUnitOfMeasure(id: string, input: UnitInput) {
  return prisma.unitOfMeasure.update({ where: { id }, data: input })
}

export async function setUnitOfMeasureActive(id: string, active: boolean) {
  return prisma.unitOfMeasure.update({ where: { id }, data: { active } })
}
