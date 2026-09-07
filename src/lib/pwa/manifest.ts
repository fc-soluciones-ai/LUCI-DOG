import { getBranding } from '@/modules/config/branding'

interface ManifestOptions {
  startUrl: string
  nameSuffix: string
  descriptionSuffix: string
}

/** Manifest de PWA compartido entre /client, /admin y /groomer — refleja la marca White Label configurada. */
export async function buildManifest({ startUrl, nameSuffix, descriptionSuffix }: ManifestOptions) {
  const branding = await getBranding()
  const icon = branding.appIconUrl

  return {
    name: `${branding.businessName} — ${nameSuffix}`,
    short_name: branding.businessName,
    description: `${descriptionSuffix} ${branding.businessName}.`,
    start_url: startUrl,
    scope: '/',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: branding.primaryColor,
    icons: icon
      ? [
          { src: icon, sizes: '192x192', type: 'image/png' },
          { src: icon, sizes: '512x512', type: 'image/png' },
          { src: icon, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ]
      : [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
  }
}
