import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import { BrandingProvider } from '@/components/providers/BrandingProvider'

export const metadata: Metadata = {
  title: 'GroomingOS',
  description: 'Plataforma de gestión para salones de estética canina.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <BrandingProvider>{children}</BrandingProvider>
      </body>
    </html>
  )
}
