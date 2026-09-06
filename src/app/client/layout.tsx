import Link from 'next/link'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { requireRole } from '@/modules/auth/profile'
import { signOutAction } from '@/modules/auth/actions'
import { RegisterServiceWorker } from '@/components/client/RegisterServiceWorker'

export const metadata: Metadata = {
  manifest: '/manifest.json',
  icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' },
}

export const viewport: Viewport = {
  themeColor: '#0f172a',
}

export default async function ClientLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole(['CLIENT'])

  return (
    <div className="min-h-screen">
      <RegisterServiceWorker />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-semibold text-slate-900">GroomingOS</span>
          <nav className="flex flex-wrap gap-4 text-sm text-slate-600">
            <Link href="/client" className="hover:text-slate-900">
              Inicio
            </Link>
            <Link href="/client/citas" className="hover:text-slate-900">
              Mis Citas
            </Link>
            <Link href="/client/mascotas" className="hover:text-slate-900">
              Mis Mascotas
            </Link>
            <Link href="/client/facturas" className="hover:text-slate-900">
              Mis Facturas
            </Link>
            <Link href="/client/perfil" className="hover:text-slate-900">
              Mi Perfil
            </Link>
          </nav>
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
      <div className="mx-auto max-w-3xl px-4 py-8">{children}</div>
    </div>
  )
}
