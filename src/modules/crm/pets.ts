import { AppointmentStatus, type SensitivityLevel } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function getPetProfile(petId: string) {
  return prisma.pet.findUniqueOrThrow({
    where: { id: petId },
    include: {
      tutor: true,
      clinicalRecord: true,
      photos: { orderBy: { takenAt: 'desc' } },
    },
  })
}

export interface UpdateBiometricsInput {
  breed: string
  sizeCategory?: string
  coatType?: string
  weightEstimated?: number
  weightReal?: number
}

export async function updatePetBiometrics(petId: string, input: UpdateBiometricsInput) {
  return prisma.pet.update({ where: { id: petId }, data: input })
}

/** Borrado lógico de la mascota — conserva su historial de citas/facturas. */
export async function deactivatePet(petId: string) {
  return prisma.pet.update({ where: { id: petId }, data: { active: false } })
}

export interface ClinicalRecordInput {
  allergies: string[]
  vaccinations: string[]
  acousticSensitivity: SensitivityLevel
  reactivity: SensitivityLevel
  requiresMuzzle: boolean
  requiresHappyHoodie: boolean
  behavioralNotes?: string
  medicalNotes?: string
}

export async function upsertClinicalRecord(petId: string, input: ClinicalRecordInput) {
  return prisma.clinicalRecord.upsert({
    where: { petId },
    create: { petId, ...input },
    update: input,
  })
}

export async function addPetPhoto(petId: string, input: { url: string; type: string }) {
  return prisma.petPhoto.create({ data: { petId, ...input } })
}

export async function deletePetPhoto(photoId: string) {
  return prisma.petPhoto.delete({ where: { id: photoId } })
}

/** Bitácora cosmética: fórmulas e instrumental usados en cada servicio completado. */
export async function getCosmeticHistory(petId: string) {
  return prisma.appointment.findMany({
    where: { petId, status: AppointmentStatus.COMPLETED },
    orderBy: { scheduledStart: 'desc' },
    include: {
      service: { select: { name: true } },
      formulaUsages: { include: { formula: { select: { name: true, dilutionRatio: true } } } },
      instrumentUsages: { include: { instrument: { select: { name: true, type: true } } } },
    },
  })
}
