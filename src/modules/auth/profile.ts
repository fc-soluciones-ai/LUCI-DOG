import 'server-only'
import { redirect } from 'next/navigation'
import type { UserRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function getCurrentProfile() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  return prisma.profile.findUnique({
    where: { id: user.id },
    include: { staff: true, tutor: true },
  })
}

/** Exige que haya sesión y que el rol esté en `allowedRoles`; si no, redirige. */
export async function requireRole(allowedRoles: UserRole[]) {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/login')
  }
  if (!profile.active || !allowedRoles.includes(profile.role)) {
    redirect('/login?error=No%20tienes%20permiso%20para%20ver%20esta%20p%C3%A1gina')
  }

  return profile
}

export function homePathForRole(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return '/admin'
    case 'GROOMER':
      return '/groomer'
    case 'CLIENT':
      return '/client'
    case 'TV_DISPLAY':
      return '/dashboard-tv'
    default:
      return '/login'
  }
}
