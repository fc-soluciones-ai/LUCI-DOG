'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/modules/auth/profile'
import { updateTutor } from '@/modules/crm/tutors'

function str(formData: FormData, key: string): string | undefined {
  const value = formData.get(key)
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
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
