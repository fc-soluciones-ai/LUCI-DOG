'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { homePathForRole } from './profile'
import {
  createClientUser,
  createStaffUser,
  deleteProfileHard,
  resetProfilePassword,
  sendPasswordResetLink,
  setProfileActive,
  updateProfile,
} from './users'

export async function signInAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const redirectTo = (formData.get('redirectTo') as string) || ''

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent('Ingresa tu correo y contraseña.')}`)
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/login?error=${encodeURIComponent('Correo o contraseña incorrectos.')}`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const profile = user ? await prisma.profile.findUnique({ where: { id: user.id } }) : null

  if (!profile || !profile.active) {
    await supabase.auth.signOut()
    redirect(`/login?error=${encodeURIComponent('Tu cuenta no tiene acceso configurado. Contacta al administrador.')}`)
  }

  redirect(redirectTo || homePathForRole(profile.role))
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export interface CreateUserActionState {
  ok: boolean
  message: string
  tempPassword?: string
  email?: string
}

export async function createStaffUserAction(
  _prevState: CreateUserActionState,
  formData: FormData
): Promise<CreateUserActionState> {
  const fullName = String(formData.get('fullName') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const role = formData.get('role') === 'ADMIN' ? 'ADMIN' : 'GROOMER'
  const sendInvite = formData.get('sendInvite') === 'on'
  const manualPassword = String(formData.get('manualPassword') ?? '').trim()

  if (!fullName || !email) {
    return { ok: false, message: 'Nombre y correo son obligatorios.' }
  }

  try {
    const result = await createStaffUser({ fullName, email, role, sendInvite, manualPassword: manualPassword || undefined })
    revalidatePath('/admin/usuarios')

    if (result.invited) {
      return { ok: true, message: `Invitación enviada por correo a ${email}. Definirá su propia contraseña al aceptarla.` }
    }

    return {
      ok: true,
      message: `Cuenta creada para ${email}. Comparte este password de forma segura — no se volverá a mostrar.`,
      tempPassword: result.tempPassword,
      email: result.email,
    }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Error al crear la cuenta.' }
  }
}

export async function resetProfilePasswordAction(
  profileId: string,
  _prevState: CreateUserActionState,
  _formData: FormData
): Promise<CreateUserActionState> {
  try {
    const result = await resetProfilePassword(profileId)
    return {
      ok: true,
      message: `Contraseña restablecida para ${result.email}. Comparte este password temporal de forma segura — no se volverá a mostrar.`,
      tempPassword: result.tempPassword,
      email: result.email,
    }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'No se pudo restablecer la contraseña.' }
  }
}

export async function deleteProfileAction(profileId: string) {
  await deleteProfileHard(profileId)
  revalidatePath('/admin/usuarios')
}

export async function setProfileActiveAction(profileId: string, active: boolean) {
  await setProfileActive(profileId, active)
  revalidatePath('/admin/usuarios')
}

export async function updateProfileAction(profileId: string, formData: FormData) {
  const fullName = String(formData.get('fullName') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const role = formData.get('role') === 'ADMIN' ? 'ADMIN' : 'GROOMER'
  if (!fullName || !email) return

  await updateProfile(profileId, { fullName, email, role })
  revalidatePath('/admin/usuarios')
}

export async function createClientUserAction(
  tutorId: string,
  _prevState: CreateUserActionState,
  _formData: FormData
): Promise<CreateUserActionState> {
  try {
    const result = await createClientUser(tutorId)
    revalidatePath(`/admin/clientes/${tutorId}`)
    return {
      ok: true,
      message: `Acceso creado para ${result.email}. Comparte este password temporal por WhatsApp — no se volverá a mostrar.`,
      tempPassword: result.tempPassword,
      email: result.email,
    }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'No se pudo crear el acceso.' }
  }
}

/** Botón "Enviar enlace de restablecimiento" en la ficha de un cliente con acceso al portal. */
export async function sendPasswordResetLinkAction(
  profileId: string,
  _prevState: CreateUserActionState,
  _formData: FormData
): Promise<CreateUserActionState> {
  try {
    const result = await sendPasswordResetLink(profileId)
    return { ok: true, message: `Enlace de restablecimiento enviado a ${result.email}.` }
  } catch (error) {
    console.error('[sendPasswordResetLinkAction] falló el envío del enlace:', error)
    return { ok: false, message: error instanceof Error ? error.message : 'No se pudo enviar el enlace.' }
  }
}

/** Formulario público "¿Olvidaste tu contraseña?" en /olvide-password. */
export async function requestPasswordResetAction(
  _prevState: CreateUserActionState,
  formData: FormData
): Promise<CreateUserActionState> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { ok: false, message: 'Ingresa tu correo.' }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/auth/confirm?next=/actualizar-password`,
  })
  if (error) console.error('[requestPasswordResetAction] falló resetPasswordForEmail:', error)

  // Mismo mensaje exista o no la cuenta — evita filtrar qué correos están registrados.
  return { ok: true, message: 'Si el correo existe en el sistema, te enviamos un enlace para restablecer tu contraseña.' }
}

export interface UpdatePasswordState {
  ok: boolean
  message?: string
}

/** Formulario "Nueva contraseña" en /actualizar-password, tras el enlace de recuperación. */
export async function updatePasswordAction(
  _prevState: UpdatePasswordState,
  formData: FormData
): Promise<UpdatePasswordState> {
  const password = String(formData.get('password') ?? '')
  const confirmPassword = String(formData.get('confirmPassword') ?? '')

  if (password.length < 8) return { ok: false, message: 'La contraseña debe tener al menos 8 caracteres.' }
  if (password !== confirmPassword) return { ok: false, message: 'Las contraseñas no coinciden.' }

  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { ok: false, message: 'El enlace expiró o no es válido. Solicita uno nuevo desde "¿Olvidaste tu contraseña?".' }

  // Esta página solo debe aceptar una sesión que vino del enlace de
  // recuperación (/auth/confirm) — no cualquier sesión normal ya activa en el
  // navegador. Sin este chequeo, alguien con acceso físico a un dispositivo
  // donde el dueño ya tiene sesión abierta podría cambiarle la contraseña
  // desde aquí sin conocer la actual. El JWT de Supabase marca el método de
  // login en "amr" — para una sesión de recuperación incluye "recovery".
  const payload = JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64').toString('utf-8')) as {
    amr?: { method: string }[]
  }
  const isRecoverySession = Array.isArray(payload.amr) && payload.amr.some((entry) => entry.method === 'recovery')
  if (!isRecoverySession) {
    return { ok: false, message: 'Este enlace ya no es válido. Solicita uno nuevo desde "¿Olvidaste tu contraseña?".' }
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    console.error('[updatePasswordAction] falló updateUser:', error)
    return { ok: false, message: 'No se pudo actualizar la contraseña. Intenta de nuevo.' }
  }

  await supabase.auth.signOut()
  redirect(`/login?success=${encodeURIComponent('Contraseña actualizada. Inicia sesión con tu nueva contraseña.')}`)
}
