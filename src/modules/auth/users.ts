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
}

/**
 * Crea la cuenta de Supabase Auth (con password temporal) + su Staff + Profile,
 * en una sola operación (Módulo de administración de usuarios).
 */
export async function createStaffUser(input: CreateStaffUserInput) {
  const tempPassword = randomTempPassword()
  const admin = createSupabaseAdminClient()

  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { fullName: input.fullName, role: input.role },
  })

  if (error || !data.user) {
    throw new Error(error?.message ?? 'No se pudo crear la cuenta en Supabase Auth.')
  }

  const staff = await prisma.staff.create({
    data: {
      fullName: input.fullName,
      role: input.role === 'ADMIN' ? Role.ADMIN : Role.GROOMER,
    },
  })

  await prisma.profile.create({
    data: {
      id: data.user.id,
      email: input.email,
      fullName: input.fullName,
      role: input.role === 'ADMIN' ? UserRole.ADMIN : UserRole.GROOMER,
      staffId: staff.id,
    },
  })

  return { tempPassword, email: input.email }
}

export async function setProfileActive(profileId: string, active: boolean) {
  return prisma.profile.update({ where: { id: profileId }, data: { active } })
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
