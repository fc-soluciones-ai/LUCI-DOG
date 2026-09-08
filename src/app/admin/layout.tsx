import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { requireRole } from '@/modules/auth/profile'
import { signOutAction } from '@/modules/auth/actions'
import { getBranding } from '@/modules/config/branding'
import { RegisterServiceWorker } from '@/components/client/RegisterServiceWorker'
import { InstallPWAPrompt } from '@/components/pwa/InstallPWAPrompt'
import { AdminNav } from '@/components/admin/AdminNav'

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding()
  const icon = branding.appIconUrl ?? '/icons/icon-192.png'
  return {
    manifest: '/api/admin-manifest',
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

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [profile, branding] = await Promise.all([requireRole(['ADMIN']), getBranding()])

  return (
    <div className="min-h-screen">
      <RegisterServiceWorker scope="/admin/" />
      <InstallPWAPrompt appName={branding.businessName} />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="flex items-center gap-2 font-semibold text-slate-900">
            {branding.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt={branding.businessName} className="h-7 w-7 rounded object-contain" />
            )}
            {branding.businessName}
          </span>
          <AdminNav />
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
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  )
}
