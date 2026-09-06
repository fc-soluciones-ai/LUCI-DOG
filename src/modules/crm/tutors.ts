import { prisma } from '@/lib/prisma'

export async function searchTutors(query?: string) {
  return prisma.tutor.findMany({
    where: {
      deletedAt: null,
      ...(query
        ? {
            OR: [
              { fullName: { contains: query, mode: 'insensitive' } },
              { phoneWhatsApp: { contains: query } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { pets: true } }, tags: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}

export async function getTutorProfile(tutorId: string) {
  return prisma.tutor.findUniqueOrThrow({
    where: { id: tutorId },
    include: {
      pets: { where: { active: true }, orderBy: { createdAt: 'desc' } },
      profile: true,
      tags: true,
    },
  })
}

export interface CreateTutorInput {
  fullName: string
  phoneWhatsApp: string
  email?: string
  address?: string
}

export async function createTutor(input: CreateTutorInput) {
  return prisma.tutor.create({ data: input })
}

export interface UpdateTutorInput {
  fullName: string
  phoneWhatsApp: string
  email?: string
  address?: string
  photoUrl?: string
}

/** Edición de datos de contacto del dueño (Estandarización CRUD). */
export async function updateTutor(tutorId: string, input: UpdateTutorInput) {
  return prisma.tutor.update({ where: { id: tutorId }, data: input })
}

/** Borrado lógico: conserva citas/facturas históricas para no romper reportes financieros. */
export async function softDeleteTutor(tutorId: string) {
  return prisma.tutor.update({ where: { id: tutorId }, data: { deletedAt: new Date() } })
}

export interface CreatePetInput {
  name: string
  breed: string
  sizeCategory?: string
  coatType?: string
  weightEstimated?: number
}

export async function createPetForTutor(tutorId: string, input: CreatePetInput) {
  return prisma.pet.create({ data: { tutorId, ...input } })
}
