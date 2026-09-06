import Link from 'next/link'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { requireRole } from '@/modules/auth/profile'
import { signOutAction } from '@/modules/auth/actions'
import { RegisterServiceWorker } from '@/components/client/RegisterServiceWorker'
import { getBranding } from '@/modules/config/branding'

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding()
  const icon = branding.appIconUrl ?? '/icons/icon-192.png'
  return {
    manifest: '/api/client-manifest',
    icons: { icon, apple: icon },
  }
}

export async function generateViewport(): Promise<Viewport> {
  const branding = await getBranding()
  return { themeColor: branding.primaryColor }
}

export default async function ClientLayout({ children }: { children: ReactNode }) {
  const [profile, branding] = await Promise.all([requireRole(['CLIENT']), getBranding()])

  return (
    <div className="min-h-screen">
      <RegisterServiceWorker />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="flex items-center gap-2 font-semibold text-slate-900">
            {branding.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt={branding.businessName} className="h-7 w-7 rounded object-contain" />
            )}
            {branding.businessName}
          </span>
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
