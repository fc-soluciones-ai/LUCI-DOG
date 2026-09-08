import { prisma } from '@/lib/prisma'

export async function listEquipmentCategories() {
  return prisma.equipmentCategory.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] })
}

export async function listActiveEquipmentCategories() {
  return prisma.equipmentCategory.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] })
}

export interface CreateEquipmentCategoryInput {
  name: string
}

/** El orden nuevo se agrega al final de la lista — se reordena arrastrando, no escribiendo un número. */
export async function createEquipmentCategory(input: CreateEquipmentCategoryInput) {
  const last = await prisma.equipmentCategory.findFirst({ orderBy: { sortOrder: 'desc' } })
  return prisma.equipmentCategory.create({ data: { ...input, sortOrder: (last?.sortOrder ?? 0) + 1 } })
}

export interface UpdateEquipmentCategoryInput {
  name: string
}

export async function updateEquipmentCategory(id: string, input: UpdateEquipmentCategoryInput) {
  return prisma.equipmentCategory.update({ where: { id }, data: input })
}

/** Borrado lógico: deja de ofrecerse en el selector de Equipos, pero conserva los equipos ya clasificados con ella. */
export async function setEquipmentCategoryActive(id: string, active: boolean) {
  return prisma.equipmentCategory.update({ where: { id }, data: { active } })
}

/** Reordena por arrastre en el admin — reemplaza el campo "Orden" manual. */
export async function reorderEquipmentCategories(orderedIds: string[]) {
  return prisma.$transaction(
    orderedIds.map((id, index) => prisma.equipmentCategory.update({ where: { id }, data: { sortOrder: index } }))
  )
}
