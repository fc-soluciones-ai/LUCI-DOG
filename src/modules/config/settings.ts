import { prisma } from '@/lib/prisma'

const SETTINGS_ID = 'default'
const FALLBACK_PAYMENT_INFO = 'Contacta al salón para los datos de pago.'

export async function getPaymentInfoText(): Promise<string> {
  const settings = await prisma.appSettings.findUnique({ where: { id: SETTINGS_ID } })
  return settings?.paymentInfoText?.trim() || FALLBACK_PAYMENT_INFO
}

export async function getRawPaymentInfoText(): Promise<string> {
  const settings = await prisma.appSettings.findUnique({ where: { id: SETTINGS_ID } })
  return settings?.paymentInfoText ?? ''
}

export async function updatePaymentInfoText(text: string) {
  return prisma.appSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, paymentInfoText: text },
    update: { paymentInfoText: text },
  })
}
