'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { SensitivityLevel } from '@prisma/client'
import { createPetForTutor, createTutor, softDeleteTutor, updateTutor } from './tutors'
import { addPetPhoto, deactivatePet, deletePetPhoto, updatePetBiometrics, upsertClinicalRecord } from './pets'

function str(formData: FormData, key: string): string | undefined {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function num(formData: FormData, key: string): number | undefined {
  const value = str(formData, key)
  return value ? Number(value) : undefined
}

export async function createTutorAction(formData: FormData) {
  const tutor = await createTutor({
    fullName: String(formData.get('fullName')),
    phoneWhatsApp: String(formData.get('phoneWhatsApp')),
    email: str(formData, 'email'),
    address: str(formData, 'address'),
  })
  revalidatePath('/admin/clientes')
  redirect(`/admin/clientes/${tutor.id}`)
}

export async function updateTutorAction(tutorId: string, formData: FormData) {
  await updateTutor(tutorId, {
    fullName: String(formData.get('fullName')),
    phoneWhatsApp: String(formData.get('phoneWhatsApp')),
    email: str(formData, 'email'),
    address: str(formData, 'address'),
  })
  revalidatePath('/admin/clientes')
  revalidatePath(`/admin/clientes/${tutorId}`)
}

export async function deleteTutorAction(tutorId: string) {
  await softDeleteTutor(tutorId)
  revalidatePath('/admin/clientes')
}

export async function deactivatePetAction(petId: string, tutorId: string) {
  await deactivatePet(petId)
  revalidatePath(`/admin/clientes/${tutorId}`)
  revalidatePath(`/admin/mascotas/${petId}`)
}

export async function createPetAction(tutorId: string, formData: FormData) {
  await createPetForTutor(tutorId, {
    name: String(formData.get('name')),
    breed: String(formData.get('breed')),
    sizeCategory: str(formData, 'sizeCategory'),
    coatType: str(formData, 'coatType'),
    weightEstimated: num(formData, 'weightEstimated'),
  })
  revalidatePath(`/admin/clientes/${tutorId}`)
}

export async function updateBiometricsAction(petId: string, formData: FormData) {
  await updatePetBiometrics(petId, {
    breed: String(formData.get('breed')),
    sizeCategory: str(formData, 'sizeCategory'),
    coatType: str(formData, 'coatType'),
    weightEstimated: num(formData, 'weightEstimated'),
    weightReal: num(formData, 'weightReal'),
  })
  revalidatePath(`/admin/mascotas/${petId}`)
}

export async function upsertClinicalRecordAction(petId: string, formData: FormData) {
  const allergies = (str(formData, 'allergies') ?? '')
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)

  const vaccinations = (str(formData, 'vaccinations') ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)

  await upsertClinicalRecord(petId, {
    allergies,
    vaccinations,
    acousticSensitivity: (formData.get('acousticSensitivity') as SensitivityLevel) || SensitivityLevel.NONE,
    reactivity: (formData.get('reactivity') as SensitivityLevel) || SensitivityLevel.NONE,
    requiresMuzzle: formData.get('requiresMuzzle') === 'on',
    requiresHappyHoodie: formData.get('requiresHappyHoodie') === 'on',
    behavioralNotes: str(formData, 'behavioralNotes'),
    medicalNotes: str(formData, 'medicalNotes'),
  })
  revalidatePath(`/admin/mascotas/${petId}`)
}

export async function addPetPhotoAction(petId: string, formData: FormData) {
  const url = str(formData, 'url')
  if (!url) return
  const type = String(formData.get('type') ?? 'PROFILE')
  await addPetPhoto(petId, { url, type })
  revalidatePath(`/admin/mascotas/${petId}`)
}

export async function deletePetPhotoAction(petId: string, photoId: string, _formData: FormData) {
  await deletePetPhoto(photoId)
  revalidatePath(`/admin/mascotas/${petId}`)
}
