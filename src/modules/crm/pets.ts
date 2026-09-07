import { AppointmentStatus, type SensitivityLevel } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { deletePetPhotoFile, uploadPetPhoto } from '@/lib/supabase/storage'

/** Mascotas activas de un tutor — usado por el selector de mascota al agendar (admin y self-service). */
export async function listPetsForTutor(tutorId: string) {
  return prisma.pet.findMany({
    where: { tutorId, active: true },
    select: { id: true, name: true, breed: true, sizeCategory: true },
    orderBy: { createdAt: 'desc' },
  })
}

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

function extractStoragePath(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`
  const index = url.indexOf(marker)
  return index === -1 ? null : url.slice(index + marker.length)
}

/**
 * Sube y reemplaza la foto de perfil de la mascota (bucket `pets-photos`),
 * reusando PetPhoto (type: 'PROFILE') — el mismo campo que ya leen el
 * Dashboard TV y el Gantt del Control Center como avatar.
 */
export async function setPetProfilePhoto(petId: string, file: File) {
  const existing = await prisma.petPhoto.findFirst({ where: { petId, type: 'PROFILE' } })
  const uploaded = await uploadPetPhoto(file)

  if (existing) {
    const oldPath = extractStoragePath(existing.url, 'pets-photos')
    if (oldPath) await deletePetPhotoFile(oldPath)
    await prisma.petPhoto.delete({ where: { id: existing.id } })
  }

  return prisma.petPhoto.create({ data: { petId, url: uploaded.url, type: 'PROFILE' } })
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
