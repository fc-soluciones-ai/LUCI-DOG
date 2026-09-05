import { redirect } from 'next/navigation'
import { getCurrentProfile, homePathForRole } from '@/modules/auth/profile'

export default async function RootPage() {
  const profile = await getCurrentProfile()
  redirect(profile ? homePathForRole(profile.role) : '/login')
}
