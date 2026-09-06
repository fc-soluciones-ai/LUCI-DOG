import { prisma } from '@/lib/prisma'

export async function listCustomerTags() {
  return prisma.customerTag.findMany({ orderBy: { name: 'asc' } })
}

export async function listActiveCustomerTags() {
  return prisma.customerTag.findMany({ where: { active: true }, orderBy: { name: 'asc' } })
}

export interface CustomerTagInput {
  name: string
  color: string
}

export async function createCustomerTag(input: CustomerTagInput) {
  return prisma.customerTag.create({ data: input })
}

export async function updateCustomerTag(id: string, input: CustomerTagInput) {
  return prisma.customerTag.update({ where: { id }, data: input })
}

export async function setCustomerTagActive(id: string, active: boolean) {
  return prisma.customerTag.update({ where: { id }, data: { active } })
}

/** Reemplaza el conjunto completo de etiquetas asignadas a un tutor. */
export async function setTutorTags(tutorId: string, tagIds: string[]) {
  return prisma.tutor.update({
    where: { id: tutorId },
    data: { tags: { set: tagIds.map((id) => ({ id })) } },
  })
}
