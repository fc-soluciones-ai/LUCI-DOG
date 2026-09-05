import Link from 'next/link'
import type { ReactNode } from 'react'
import { requireRole } from '@/modules/auth/profile'
import { signOutAction } from '@/modules/auth/actions'

export default async function GroomerLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole(['ADMIN', 'GROOMER'])

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <span className="font-semibold text-slate-900">GroomingOS · Piso</span>
          {profile.role === 'ADMIN' && (
            <Link href="/admin" className="text-sm text-slate-600 hover:text-slate-900">
              ← Panel Admin
            </Link>
          )}
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-500">
            <span>{profile.fullName}</span>
            <form action={signOutAction}>
              <button type="submit" className="hover:text-slate-900 hover:underline">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
    </div>
  )
}
