import Link from 'next/link'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { requireRole } from '@/modules/auth/profile'
import { signOutAction } from '@/modules/auth/actions'
import { getBranding } from '@/modules/config/branding'
import { RegisterServiceWorker } from '@/components/client/RegisterServiceWorker'
import { InstallPWAPrompt } from '@/components/pwa/InstallPWAPrompt'

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding()
  const icon = branding.appIconUrl ?? '/icons/icon-192.png'
  return {
    manifest: '/api/groomer-manifest',
    icons: { icon, apple: icon },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: branding.businessName,
    },
    other: { 'apple-mobile-web-app-capable': 'yes' },
  }
}

export async function generateViewport(): Promise<Viewport> {
  const branding = await getBranding()
  return { themeColor: branding.primaryColor }
}

export default async function GroomerLayout({ children }: { children: ReactNode }) {
  const [profile, branding] = await Promise.all([requireRole(['ADMIN', 'GROOMER']), getBranding()])

  return (
    <div className="min-h-screen">
      <RegisterServiceWorker scope="/groomer/" />
      <InstallPWAPrompt appName={branding.businessName} />
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
