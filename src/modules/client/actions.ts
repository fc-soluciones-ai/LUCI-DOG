'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/modules/auth/profile'
import { updateTutor } from '@/modules/crm/tutors'
import {
  cancelAppointmentByClient,
  createAppointmentByClient,
  getAvailableSlots,
  rescheduleAppointmentByClient,
  type TimeSlot,
} from './booking'
import { BookingBlockedError, ValidationError } from '@/modules/agenda/errors'
import { submitProofWithUpload } from '@/modules/billing/invoices'
import type { PaymentMethod } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { setPetProfilePhoto } from '@/modules/crm/pets'

function str(formData: FormData, key: string): string | undefined {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

export interface ClientActionState {
  ok: boolean
  message?: string
}

function revalidateAgenda() {
  revalidatePath('/client')
  revalidatePath('/client/citas')
  revalidatePath('/groomer')
  revalidatePath('/dashboard-tv')
}

export async function createAppointmentByClientAction(
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const profile = await requireRole(['CLIENT'])
  if (!profile.tutorId) return { ok: false, message: 'Cuenta sin tutor vinculado.' }

  const petId = String(formData.get('petId') ?? '')
  const serviceId = String(formData.get('serviceId') ?? '')
  const scheduledStart = str(formData, 'scheduledStart')
  if (!petId || !serviceId || !scheduledStart) {
    return { ok: false, message: 'Selecciona mascota, servicio y horario.' }
  }

  try {
    await createAppointmentByClient(profile.tutorId, { petId, serviceId, scheduledStart: new Date(scheduledStart) })
  } catch (error) {
    if (error instanceof BookingBlockedError || error instanceof ValidationError) {
      return { ok: false, message: error.message }
    }
    return { ok: false, message: 'No se pudo agendar la cita.' }
  }

  revalidateAgenda()
  return { ok: true }
}

export async function rescheduleAppointmentByClientAction(
  appointmentId: string,
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const profile = await requireRole(['CLIENT'])
  if (!profile.tutorId) return { ok: false, message: 'Cuenta sin tutor vinculado.' }

  const scheduledStart = str(formData, 'scheduledStart')
  if (!scheduledStart) return { ok: false, message: 'Selecciona un nuevo horario.' }

  try {
    await rescheduleAppointmentByClient(profile.tutorId, appointmentId, new Date(scheduledStart))
  } catch (error) {
    if (error instanceof ValidationError) return { ok: false, message: error.message }
    return { ok: false, message: 'No se pudo reagendar la cita.' }
  }

  revalidateAgenda()
  return { ok: true }
}

export async function cancelAppointmentByClientAction(appointmentId: string) {
  const profile = await requireRole(['CLIENT'])
  if (!profile.tutorId) return
  await cancelAppointmentByClient(profile.tutorId, appointmentId)
  revalidateAgenda()
}

/** Consultado desde el modal de agendado/reagendado al cambiar fecha o servicio. */
export async function getAvailableSlotsAction(serviceId: string, dateIso: string): Promise<TimeSlot[]> {
  await requireRole(['CLIENT'])
  if (!serviceId || !dateIso) return []
  return getAvailableSlots(new Date(dateIso), serviceId)
}

export async function uploadPaymentReceiptAction(
  invoiceId: string,
  _prevState: ClientActionState,
  formData: FormData
): Promise<ClientActionState> {
  const profile = await requireRole(['CLIENT'])
  if (!profile.tutorId) return { ok: false, message: 'Cuenta sin tutor vinculado.' }

  // Ownership: un cliente solo puede subir comprobante a su propia factura.
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, tutorId: profile.tutorId } })
  if (!invoice) return { ok: false, message: 'Factura no encontrada.' }

  const file = formData.get('receipt')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: 'Adjunta el comprobante antes de enviarlo.' }
  }

  const paymentMethod = formData.get('paymentMethod') as PaymentMethod
  const referenceNumber = str(formData, 'referenceNumber')

  try {
    await submitProofWithUpload(invoiceId, file, paymentMethod, referenceNumber)
  } catch (error) {
    console.error('[uploadPaymentReceiptAction] falló la subida del comprobante:', error)
    return { ok: false, message: error instanceof Error ? error.message : 'No se pudo subir el comprobante.' }
  }

  revalidatePath('/client/facturas')
  revalidatePath('/admin/facturacion')
  return { ok: true }
}

/**
 * Edita los datos de contacto propios del tutor autenticado. El tutorId sale
 * de la sesión (requireRole), nunca del formulario — evita que un cliente
 * pueda editar a otro tutor manipulando el request.
 */
export async function updateOwnProfileAction(formData: FormData) {
  const profile = await requireRole(['CLIENT'])
  if (!profile.tutorId) return

  await updateTutor(profile.tutorId, {
    fullName: String(formData.get('fullName') ?? profile.fullName),
    phoneWhatsApp: String(formData.get('phoneWhatsApp') ?? ''),
    email: str(formData, 'email'),
    address: str(formData, 'address'),
    photoUrl: str(formData, 'photoUrl'),
  })
  revalidatePath('/client/perfil')
  revalidatePath('/client')
}

export interface UploadPetPhotoState {
  ok: boolean
  message?: string
}

export async function uploadPetPhotoAction(
  petId: string,
  _prevState: UploadPetPhotoState,
  formData: FormData
): Promise<UploadPetPhotoState> {
  const profile = await requireRole(['CLIENT'])
  if (!profile.tutorId) return { ok: false, message: 'Cuenta sin tutor vinculado.' }

  // Ownership: la mascota debe ser del tutor de sesión.
  const pet = await prisma.pet.findFirst({ where: { id: petId, tutorId: profile.tutorId } })
  if (!pet) return { ok: false, message: 'Mascota no encontrada.' }

  const file = formData.get('photo')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: 'Selecciona o toma una foto primero.' }
  }

  try {
    await setPetProfilePhoto(petId, file)
  } catch (error) {
    console.error('[uploadPetPhotoAction] falló la subida de la foto:', error)
    return { ok: false, message: error instanceof Error ? error.message : 'No se pudo subir la foto.' }
  }

  revalidatePath('/client/mascotas')
  revalidatePath('/dashboard-tv')
  return { ok: true }
}
