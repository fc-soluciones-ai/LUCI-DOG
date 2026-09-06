import { NextResponse } from 'next/server'
import { getBranding } from '@/modules/config/branding'

/** Manifest dinámico del Portal del Cliente (PWA) — refleja nombre/color/ícono de marca configurados. */
export async function GET() {
  const branding = await getBranding()
  const icon = branding.appIconUrl

  return NextResponse.json({
    name: `${branding.businessName} — Portal del Cliente`,
    short_name: branding.businessName,
    description: `Consulta tus citas, mascotas y facturas de ${branding.businessName}.`,
    start_url: '/client',
    scope: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: branding.primaryColor,
    icons: icon
      ? [
          { src: icon, sizes: '192x192', type: 'image/png' },
          { src: icon, sizes: '512x512', type: 'image/png' },
        ]
      : [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
  })
}
