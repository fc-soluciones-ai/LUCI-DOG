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

const DEFAULT_BUFFER_MINUTES = 15

/** Margen de limpieza/preparación que se deja libre después de cada cita al calcular disponibilidad. */
export async function getBufferTimeMinutes(): Promise<number> {
  const settings = await prisma.appSettings.findUnique({ where: { id: SETTINGS_ID } })
  return settings?.bufferTimeMinutes ?? DEFAULT_BUFFER_MINUTES
}

export async function updateBufferTimeMinutes(minutes: number) {
  return prisma.appSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, bufferTimeMinutes: minutes },
    update: { bufferTimeMinutes: minutes },
  })
}
