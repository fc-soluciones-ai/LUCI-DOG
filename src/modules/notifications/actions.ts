'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/modules/auth/profile'
import { prisma } from '@/lib/prisma'
import { uploadPetPhoto } from '@/lib/supabase/storage'
import { renderWhatsAppTemplate } from '@/lib/whatsapp/adapter'
import { buildWhatsAppLink, logRebookReminder, markNotificationManuallySent, skipNotification } from './manual'

function revalidateAvisos() {
  revalidatePath('/admin/avisos')
}

export async function markNotificationSentAction(notificationId: string) {
  await requireRole(['ADMIN'])
  await markNotificationManuallySent(notificationId)
  revalidateAvisos()
}

export async function skipNotificationAction(notificationId: string) {
  await requireRole(['ADMIN'])
  await skipNotification(notificationId)
  revalidateAvisos()
}

export async function logRebookReminderAction(petId: string) {
  await requireRole(['ADMIN'])
  await logRebookReminder(petId)
  revalidateAvisos()
}

export interface ReadyNoticeState {
  ok: boolean
  message?: string
  whatsappUrl?: string
}

/**
 * "Avisar que está listo": guarda la foto (opcional) como foto DESPUÉS de la
 * mascota y arma el enlace de WhatsApp con el mensaje y el enlace a la foto.
 * No manda nada solo — la persona abre WhatsApp y lo envía con un toque.
 */
export async function createReadyNoticeAction(
  appointmentId: string,
  _prevState: ReadyNoticeState,
  formData: FormData
): Promise<ReadyNoticeState> {
  await requireRole(['ADMIN'])

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { pet: true, tutor: true },
  })
  if (!appointment) return { ok: false, message: 'No se encontró la cita.' }

  let photoUrl = ''
  const file = formData.get('image')
  if (file instanceof File && file.size > 0) {
    try {
      const uploaded = await uploadPetPhoto(file)
      photoUrl = uploaded.url
      await prisma.petPhoto.create({ data: { petId: appointment.petId, url: uploaded.url, type: 'AFTER' } })
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'No se pudo subir la foto.' }
    }
  }

  const text = await renderWhatsAppTemplate('PET_READY', {
    tutorName: appointment.tutor.fullName,
    petName: appointment.pet.name,
    photoUrl,
  })

  revalidatePath(`/admin/mascotas/${appointment.petId}`)
  return {
    ok: true,
    message: photoUrl ? 'Foto guardada en la ficha de la mascota.' : 'Mensaje listo (sin foto).',
    whatsappUrl: buildWhatsAppLink(appointment.tutor.phoneWhatsApp, text),
  }
}
