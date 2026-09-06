import { prisma } from '@/lib/prisma'

export async function listServices() {
  return prisma.service.findMany({ orderBy: { name: 'asc' } })
}

export interface CreateServiceInput {
  name: string
  basePrice: number
  standardDurationMin: number
  description?: string
}

export async function createService(input: CreateServiceInput) {
  return prisma.service.create({ data: input })
}

export interface UpdateServiceInput {
  name: string
  basePrice: number
  standardDurationMin: number
  description?: string
}

/** Edición del catálogo de servicios y precios (Módulo de Servicios y Precios). */
export async function updateService(serviceId: string, input: UpdateServiceInput) {
  return prisma.service.update({ where: { id: serviceId }, data: input })
}

/** Borrado lógico: deja de ofrecerse en /book y en el selector de citas, pero conserva su historial. */
export async function setServiceActive(serviceId: string, active: boolean) {
  return prisma.service.update({ where: { id: serviceId }, data: { active } })
}
