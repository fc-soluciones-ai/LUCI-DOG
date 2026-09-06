import type { ReactNode } from 'react'
import { getBranding } from '@/modules/config/branding'

const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/

function safeColor(value: string, fallback: string): string {
  return HEX_COLOR.test(value) ? value : fallback
}

/**
 * Inyecta las variables CSS de marca (--brand-primary/secondary/accent) en
 * :root para toda la app — se monta una sola vez en el layout raíz, así que
 * /admin, /client, /dashboard-tv y /book lo heredan sin duplicar la lectura.
 * Los colores vienen de la config del admin (TenantBranding); se validan como
 * hex antes de inyectarse en el <style> (defensa en profundidad, aunque hoy
 * solo el admin puede escribir este valor).
 */
export async function BrandingProvider({ children }: { children: ReactNode }) {
  const branding = await getBranding()

  const primary = safeColor(branding.primaryColor, '#0f172a')
  const secondary = safeColor(branding.secondaryColor, '#64748b')
  const accent = safeColor(branding.accentColor, '#0ea5e9')

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `:root{--brand-primary:${primary};--brand-secondary:${secondary};--brand-accent:${accent};}`,
        }}
      />
      {children}
    </>
  )
}
