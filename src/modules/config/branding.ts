import { prisma } from '@/lib/prisma'

const BRANDING_ID = 'default'

export interface SocialLinks {
  instagram?: string
  facebook?: string
  tiktok?: string
  whatsapp?: string
  [key: string]: string | undefined
}

const DEFAULTS = {
  businessName: 'GroomingOS',
  slogan: null as string | null,
  officialPhone: null as string | null,
  address: null as string | null,
  currencyCode: 'CRC',
  socialLinks: {} as SocialLinks,
  logoUrl: null as string | null,
  logoPath: null as string | null,
  faviconUrl: null as string | null,
  faviconPath: null as string | null,
  appIconUrl: null as string | null,
  appIconPath: null as string | null,
  primaryColor: '#0f172a',
  secondaryColor: '#64748b',
  accentColor: '#0ea5e9',
  invoiceFooterText: null as string | null,
  whatsappTemplates: {} as Record<string, string>,
}

export type Branding = typeof DEFAULTS

/** Identidad de marca White Label — siempre devuelve un objeto completo, con defaults si aún no se configuró nada. */
export async function getBranding(): Promise<Branding> {
  const row = await prisma.tenantBranding.findUnique({ where: { id: BRANDING_ID } })
  if (!row) return DEFAULTS

  return {
    businessName: row.businessName,
    slogan: row.slogan,
    officialPhone: row.officialPhone,
    address: row.address,
    currencyCode: row.currencyCode,
    socialLinks: (row.socialLinks as SocialLinks | null) ?? {},
    logoUrl: row.logoUrl,
    logoPath: row.logoPath,
    faviconUrl: row.faviconUrl,
    faviconPath: row.faviconPath,
    appIconUrl: row.appIconUrl,
    appIconPath: row.appIconPath,
    primaryColor: row.primaryColor,
    secondaryColor: row.secondaryColor,
    accentColor: row.accentColor,
    invoiceFooterText: row.invoiceFooterText,
    whatsappTemplates: (row.whatsappTemplates as Record<string, string> | null) ?? {},
  }
}

export interface UpdateBrandingInput {
  businessName: string
  slogan?: string
  officialPhone?: string
  address?: string
  currencyCode: string
  socialLinks: SocialLinks
  primaryColor: string
  secondaryColor: string
  accentColor: string
  invoiceFooterText?: string
}

export async function updateBranding(input: UpdateBrandingInput) {
  return prisma.tenantBranding.upsert({
    where: { id: BRANDING_ID },
    create: { id: BRANDING_ID, ...input },
    update: input,
  })
}

export async function updateWhatsappTemplateOverride(templateName: string, text: string) {
  const current = await getBranding()
  const next = { ...current.whatsappTemplates }
  if (text.trim()) next[templateName] = text.trim()
  else delete next[templateName]

  return prisma.tenantBranding.upsert({
    where: { id: BRANDING_ID },
    create: { id: BRANDING_ID, whatsappTemplates: next },
    update: { whatsappTemplates: next },
  })
}

type BrandingAssetKind = 'logo' | 'favicon' | 'appIcon'

export async function getBrandingAssetPath(kind: BrandingAssetKind): Promise<string | null> {
  const row = await prisma.tenantBranding.findUnique({ where: { id: BRANDING_ID } })
  if (!row) return null
  if (kind === 'logo') return row.logoPath
  if (kind === 'favicon') return row.faviconPath
  return row.appIconPath
}

export async function setBrandingAsset(kind: BrandingAssetKind, url: string | null, path: string | null) {
  const data =
    kind === 'logo'
      ? { logoUrl: url, logoPath: path }
      : kind === 'favicon'
        ? { faviconUrl: url, faviconPath: path }
        : { appIconUrl: url, appIconPath: path }

  return prisma.tenantBranding.upsert({
    where: { id: BRANDING_ID },
    create: { id: BRANDING_ID, ...data },
    update: data,
  })
}
