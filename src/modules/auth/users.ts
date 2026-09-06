import { Role, UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export async function listProfiles() {
  return prisma.profile.findMany({
    include: { staff: true, tutor: true },
    orderBy: [{ role: 'asc' }, { fullName: 'asc' }],
  })
}

function randomTempPassword() {
  return `Groom-${Math.random().toString(36).slice(2, 8)}${Math.floor(Math.random() * 100)}!`
}

export interface CreateStaffUserInput {
  fullName: string
  email: string
  role: 'ADMIN' | 'GROOMER'
  sendInvite?: boolean
  manualPassword?: string
}

/**
 * Crea la cuenta de Supabase Auth + su Staff + Profile, en una sola operación
 * (Módulo de administración de usuarios). Por defecto genera un password
 * temporal para compartir manualmente; si `sendInvite` está activo, en vez de
 * crear el usuario directamente le envía un correo de invitación de Supabase
 * (el usuario define su propio password al aceptarla, no hay temporal que mostrar).
 */
export async function createStaffUser(input: CreateStaffUserInput) {
  const admin = createSupabaseAdminClient()
  const role = input.role === 'ADMIN' ? Role.ADMIN : Role.GROOMER
  const userRole = input.role === 'ADMIN' ? UserRole.ADMIN : UserRole.GROOMER

  let userId: string
  let tempPassword: string | undefined

  if (input.sendInvite) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(input.email, {
      data: { fullName: input.fullName, role: input.role },
    })
    if (error || !data.user) {
      throw new Error(error?.message ?? 'No se pudo enviar la invitación por correo.')
    }
    userId = data.user.id
  } else {
    tempPassword = input.manualPassword?.trim() || randomTempPassword()
    const { data, error } = await admin.auth.admin.createUser({
      email: input.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { fullName: input.fullName, role: input.role },
    })
    if (error || !data.user) {
      throw new Error(error?.message ?? 'No se pudo crear la cuenta en Supabase Auth.')
    }
    userId = data.user.id
  }

  const staff = await prisma.staff.create({ data: { fullName: input.fullName, role } })

  await prisma.profile.create({
    data: {
      id: userId,
      email: input.email,
      fullName: input.fullName,
      role: userRole,
      staffId: staff.id,
    },
  })

  return { tempPassword, email: input.email, invited: Boolean(input.sendInvite) }
}

/** Genera un nuevo password temporal para una cuenta existente (Restablecer contraseña). */
export async function resetProfilePassword(profileId: string) {
  const profile = await prisma.profile.findUniqueOrThrow({ where: { id: profileId } })
  const tempPassword = randomTempPassword()
  const admin = createSupabaseAdminClient()

  const { error } = await admin.auth.admin.updateUserById(profileId, { password: tempPassword })
  if (error) throw new Error(`No se pudo restablecer la contraseña: ${error.message}`)

  return { tempPassword, email: profile.email }
}

/**
 * Elimina definitivamente el acceso de una cuenta de staff: borra el usuario
 * de Supabase Auth y su Profile. A diferencia del toggle activo/inactivo (que
 * solo bloquea el login), esto es irreversible. El registro de Staff se
 * conserva intacto para no romper el historial de citas/mantenimientos ya
 * asociado a ese groomer.
 */
export async function deleteProfileHard(profileId: string) {
  const admin = createSupabaseAdminClient()
  const { error } = await admin.auth.admin.deleteUser(profileId)
  if (error) throw new Error(`No se pudo eliminar la cuenta en Supabase Auth: ${error.message}`)

  await prisma.profile.delete({ where: { id: profileId } })
}

export async function setProfileActive(profileId: string, active: boolean) {
  return prisma.profile.update({ where: { id: profileId }, data: { active } })
}

/**
 * Da de alta el acceso al Portal del Cliente para un tutor existente (Fase 2).
 * No hay autoservicio (sin OTP/email transaccional propio): el admin genera la
 * cuenta desde la ficha del tutor y comparte el password temporal por WhatsApp.
 */
export async function createClientUser(tutorId: string) {
  const tutor = await prisma.tutor.findUniqueOrThrow({ where: { id: tutorId }, include: { profile: true } })

  if (tutor.profile) {
    throw new Error('Este tutor ya tiene acceso al portal.')
  }
  if (!tutor.email) {
    throw new Error('El tutor necesita un correo guardado antes de poder darle acceso al portal.')
  }

  const tempPassword = randomTempPassword()
  const admin = createSupabaseAdminClient()

  const { data, error } = await admin.auth.admin.createUser({
    email: tutor.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { fullName: tutor.fullName, role: 'CLIENT' },
  })

  if (error || !data.user) {
    throw new Error(error?.message ?? 'No se pudo crear la cuenta en Supabase Auth.')
  }

  await prisma.profile.create({
    data: {
      id: data.user.id,
      email: tutor.email,
      fullName: tutor.fullName,
      role: UserRole.CLIENT,
      tutorId: tutor.id,
    },
  })

  return { tempPassword, email: tutor.email }
}

export interface UpdateProfileInput {
  fullName: string
  email: string
  role: 'ADMIN' | 'GROOMER'
}

/**
 * Edita nombre/correo/rol de una cuenta de staff (Estandarización CRUD).
 * Mantiene sincronizado el Staff vinculado (nombre visible en asignación de
 * groomer, mantenimiento, etc.) y el correo en Supabase Auth.
 */
export async function updateProfile(profileId: string, input: UpdateProfileInput) {
  const profile = await prisma.profile.findUniqueOrThrow({ where: { id: profileId } })

  if (input.email !== profile.email) {
    const admin = createSupabaseAdminClient()
    const { error } = await admin.auth.admin.updateUserById(profileId, { email: input.email })
    if (error) throw new Error(`No se pudo actualizar el correo en Supabase Auth: ${error.message}`)
  }

  if (profile.staffId) {
    await prisma.staff.update({
      where: { id: profile.staffId },
      data: { fullName: input.fullName, role: input.role === 'ADMIN' ? Role.ADMIN : Role.GROOMER },
    })
  }

  return prisma.profile.update({
    where: { id: profileId },
    data: { fullName: input.fullName, email: input.email, role: input.role as UserRole },
  })
}
