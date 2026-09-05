import { prisma } from '@/lib/prisma'

export async function searchTutors(query?: string) {
  return prisma.tutor.findMany({
    where: query
      ? {
          OR: [
            { fullName: { contains: query, mode: 'insensitive' } },
            { phoneWhatsApp: { contains: query } },
          ],
        }
      : undefined,
    include: { _count: { select: { pets: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}

export async function getTutorProfile(tutorId: string) {
  return prisma.tutor.findUniqueOrThrow({
    where: { id: tutorId },
    include: {
      pets: { orderBy: { createdAt: 'desc' } },
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
