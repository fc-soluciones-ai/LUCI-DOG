'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/modules/auth/profile'
import { searchTutors } from '@/modules/crm/tutors'
import { listPetsForTutor } from '@/modules/crm/pets'
import { getAvailableSlots, type TimeSlot } from './availability'
import { createAppointmentByAdmin } from './adminAppointments'
import { ValidationError } from './errors'

function str(formData: FormData, key: string): string | undefined {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

export interface AdminBookingState {
  ok: boolean
  message?: string
}

/** Buscador de clientes del modal "Nueva Cita" — mismo filtro nombre/WhatsApp que /admin/clientes. */
export async function searchTutorsForAdminAction(query: string) {
  await requireRole(['ADMIN'])
  if (!query || query.trim().length < 2) return []
  const tutors = await searchTutors(query)
  return tutors.map((t) => ({ id: t.id, fullName: t.fullName, phoneWhatsApp: t.phoneWhatsApp }))
}

export async function listPetsForTutorAction(tutorId: string) {
  await requireRole(['ADMIN'])
  if (!tutorId) return []
  return listPetsForTutor(tutorId)
}

/** Consultado desde el modal al cambiar fecha, servicio o mascota (la talla afecta la duración real). */
export async function getAvailableSlotsForAdminAction(serviceId: string, dateIso: string, sizeCategory?: string): Promise<TimeSlot[]> {
  await requireRole(['ADMIN'])
  if (!serviceId || !dateIso) return []
  return getAvailableSlots(new Date(dateIso), serviceId, sizeCategory)
}

export async function createAppointmentByAdminAction(
  _prevState: AdminBookingState,
  formData: FormData
): Promise<AdminBookingState> {
  await requireRole(['ADMIN'])

  const tutorId = str(formData, 'tutorId')
  const petId = str(formData, 'petId')
  const serviceId = str(formData, 'serviceId')
  const scheduledStart = str(formData, 'scheduledStart')
  const groomerId = str(formData, 'groomerId')

  const newTutorFullName = str(formData, 'newTutorFullName')
  const newTutorPhone = str(formData, 'newTutorPhone')
  const newPetName = str(formData, 'newPetName')
  const newPetBreed = str(formData, 'newPetBreed')

  if (!serviceId || !scheduledStart) {
    return { ok: false, message: 'Selecciona servicio y horario.' }
  }
  if (!tutorId && (!newTutorFullName || !newTutorPhone)) {
    return { ok: false, message: 'Selecciona un cliente existente o completa nombre y WhatsApp del nuevo.' }
  }
  if (!petId && (!newPetName || !newPetBreed)) {
    return { ok: false, message: 'Selecciona una mascota existente o completa nombre y raza de la nueva.' }
  }

  try {
    await createAppointmentByAdmin({
      tutorId,
      newTutor: tutorId
        ? undefined
        : { fullName: newTutorFullName!, phoneWhatsApp: newTutorPhone!, email: str(formData, 'newTutorEmail') },
      petId,
      newPet: petId
        ? undefined
        : { name: newPetName!, breed: newPetBreed!, sizeCategory: str(formData, 'newPetSizeCategory') },
      serviceId,
      scheduledStart: new Date(scheduledStart),
      groomerId,
    })
  } catch (error) {
    if (error instanceof ValidationError) return { ok: false, message: error.message }
    console.error('[createAppointmentByAdminAction] falló:', error)
    return { ok: false, message: 'No se pudo agendar la cita.' }
  }

  revalidatePath('/admin/appointments')
  revalidatePath('/client')
  revalidatePath('/dashboard-tv')
  revalidatePath('/groomer')
  return { ok: true }
}
