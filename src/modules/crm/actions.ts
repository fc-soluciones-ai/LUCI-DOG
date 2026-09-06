'use server'

import { revalidatePath } from 'next/cache'
import { SensitivityLevel } from '@prisma/client'
import { createPetForTutor, createTutor, softDeleteTutor, updateTutor } from './tutors'
import { addPetPhoto, deactivatePet, deletePetPhoto, updatePetBiometrics, upsertClinicalRecord } from './pets'
import { createClientUser } from '@/modules/auth/users'

function str(formData: FormData, key: string): string | undefined {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function num(formData: FormData, key: string): number | undefined {
  const value = str(formData, key)
  return value ? Number(value) : undefined
}

export interface CreateTutorState {
  ok: boolean
  message?: string
  tutorId?: string
  tempPassword?: string
  email?: string
}

/**
 * Crea el cliente y, opcionalmente en el mismo paso, su acceso al Portal del
 * Cliente (Tutor + Profile + usuario de Supabase Auth) — evita el flujo
 * previo de crear el tutor y luego tener que ir a su ficha a "darle acceso"
 * por separado. Si falla la parte del acceso (ej. correo ya usado en Auth),
 * el tutor de todos modos queda creado — no se pierde el registro; el admin
 * puede reintentar el acceso desde la ficha.
 */
export async function createTutorWithAccessAction(
  _prevState: CreateTutorState,
  formData: FormData
): Promise<CreateTutorState> {
  const fullName = String(formData.get('fullName') ?? '').trim()
  const phoneWhatsApp = String(formData.get('phoneWhatsApp') ?? '').trim()
  const email = str(formData, 'email')
  const address = str(formData, 'address')
  const enableAccess = formData.get('enableAccess') === 'on'
  const manualPassword = str(formData, 'manualPassword')

  if (!fullName || !phoneWhatsApp) {
    return { ok: false, message: 'Nombre y WhatsApp son obligatorios.' }
  }
  if (enableAccess && !email) {
    return { ok: false, message: 'Para habilitar el acceso al portal, ingresa un correo.' }
  }

  const tutor = await createTutor({ fullName, phoneWhatsApp, email, address })
  revalidatePath('/admin/clientes')

  if (!enableAccess) {
    return { ok: true, tutorId: tutor.id, message: 'Cliente creado.' }
  }

  try {
    const result = await createClientUser(tutor.id, manualPassword)
    return {
      ok: true,
      tutorId: tutor.id,
      tempPassword: result.tempPassword,
      email: result.email,
      message: `Cliente creado con acceso al portal para ${result.email}. Comparte este password de forma segura — no se volverá a mostrar.`,
    }
  } catch (error) {
    console.error('[createTutorWithAccessAction] falló crear el acceso al portal:', error)
    return {
      ok: true,
      tutorId: tutor.id,
      message: `El cliente se creó, pero no se pudo habilitar el acceso al portal: ${
        error instanceof Error ? error.message : 'error desconocido'
      }. Puedes intentarlo de nuevo desde su ficha.`,
    }
  }
}

export async function updateTutorAction(tutorId: string, formData: FormData) {
  await updateTutor(tutorId, {
    fullName: String(formData.get('fullName')),
    phoneWhatsApp: String(formData.get('phoneWhatsApp')),
    email: str(formData, 'email'),
    address: str(formData, 'address'),
    photoUrl: str(formData, 'photoUrl'),
  })
  revalidatePath('/admin/clientes')
  revalidatePath(`/admin/clientes/${tutorId}`)
  revalidatePath('/dashboard-tv')
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
