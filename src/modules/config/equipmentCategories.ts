import { prisma } from '@/lib/prisma'

export async function listEquipmentCategories() {
  return prisma.equipmentCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] })
}

export async function listActiveEquipmentCategories() {
  return prisma.equipmentCategory.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] })
}

export interface CreateEquipmentCategoryInput {
  name: string
  sortOrder?: number
}

export async function createEquipmentCategory(input: CreateEquipmentCategoryInput) {
  return prisma.equipmentCategory.create({ data: input })
}

export interface UpdateEquipmentCategoryInput {
  name: string
  sortOrder?: number
}

export async function updateEquipmentCategory(id: string, input: UpdateEquipmentCategoryInput) {
  return prisma.equipmentCategory.update({ where: { id }, data: input })
}

/** Borrado lógico: deja de ofrecerse en el selector de Equipos, pero conserva los equipos ya clasificados con ella. */
export async function setEquipmentCategoryActive(id: string, active: boolean) {
  return prisma.equipmentCategory.update({ where: { id }, data: { active } })
}
