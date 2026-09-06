import { prisma } from '@/lib/prisma'

export async function listServices() {
  return prisma.service.findMany({ orderBy: { name: 'asc' } })
}

export interface CreateServiceInput {
  name: string
  basePrice: number
  standardDurationMin: number
  description?: string
  imageUrl?: string | null
  imagePath?: string | null
}

export async function createService(input: CreateServiceInput) {
  return prisma.service.create({ data: input })
}

export interface UpdateServiceInput {
  name: string
  basePrice: number
  standardDurationMin: number
  description?: string
  imageUrl?: string | null
  imagePath?: string | null
}

/** Edición del catálogo de servicios y precios (Módulo de Servicios y Precios). */
export async function updateService(serviceId: string, input: UpdateServiceInput) {
  return prisma.service.update({ where: { id: serviceId }, data: input })
}

export async function getServiceImagePath(serviceId: string) {
  const service = await prisma.service.findUnique({ where: { id: serviceId }, select: { imagePath: true } })
  return service?.imagePath ?? null
}

/** Borrado lógico: deja de ofrecerse en /book y en el selector de citas, pero conserva su historial. */
export async function setServiceActive(serviceId: string, active: boolean) {
  return prisma.service.update({ where: { id: serviceId }, data: { active } })
}
