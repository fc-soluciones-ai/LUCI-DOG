'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { homePathForRole } from './profile'
import { createClientUser, createStaffUser, setProfileActive, updateProfile } from './users'

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

  if (!fullName || !email) {
    return { ok: false, message: 'Nombre y correo son obligatorios.' }
  }

  try {
    const result = await createStaffUser({ fullName, email, role })
    revalidatePath('/admin/usuarios')
    return {
      ok: true,
      message: `Cuenta creada para ${email}. Comparte este password temporal de forma segura — no se volverá a mostrar.`,
      tempPassword: result.tempPassword,
      email: result.email,
    }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Error al crear la cuenta.' }
  }
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
