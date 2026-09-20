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

export interface PickupDeliverySchedule {
  enabled: boolean
  pickupStartTime: string
  pickupEndTime: string
  deliveryStartTime: string
  deliveryEndTime: string
}

const DEFAULT_PICKUP_DELIVERY: PickupDeliverySchedule = {
  enabled: false,
  pickupStartTime: '08:00',
  pickupEndTime: '10:00',
  deliveryStartTime: '16:00',
  deliveryEndTime: '18:00',
}

/** Horario del servicio de recogida y entrega a domicilio — informativo, independiente del horario de negocio. */
export async function getPickupDeliverySchedule(): Promise<PickupDeliverySchedule> {
  const settings = await prisma.appSettings.findUnique({ where: { id: SETTINGS_ID } })
  if (!settings) return DEFAULT_PICKUP_DELIVERY
  return {
    enabled: settings.pickupDeliveryEnabled,
    pickupStartTime: settings.pickupStartTime ?? DEFAULT_PICKUP_DELIVERY.pickupStartTime,
    pickupEndTime: settings.pickupEndTime ?? DEFAULT_PICKUP_DELIVERY.pickupEndTime,
    deliveryStartTime: settings.deliveryStartTime ?? DEFAULT_PICKUP_DELIVERY.deliveryStartTime,
    deliveryEndTime: settings.deliveryEndTime ?? DEFAULT_PICKUP_DELIVERY.deliveryEndTime,
  }
}

export async function updatePickupDeliverySchedule(input: PickupDeliverySchedule) {
  return prisma.appSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      pickupDeliveryEnabled: input.enabled,
      pickupStartTime: input.pickupStartTime,
      pickupEndTime: input.pickupEndTime,
      deliveryStartTime: input.deliveryStartTime,
      deliveryEndTime: input.deliveryEndTime,
    },
    update: {
      pickupDeliveryEnabled: input.enabled,
      pickupStartTime: input.pickupStartTime,
      pickupEndTime: input.pickupEndTime,
      deliveryStartTime: input.deliveryStartTime,
      deliveryEndTime: input.deliveryEndTime,
    },
  })
}
