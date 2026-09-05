// Abstracción de envío de WhatsApp. Sin credenciales de Twilio configuradas,
// cae automáticamente a ConsoleWhatsAppProvider (imprime el mensaje en consola)
// para poder desarrollar y probar el flujo de notificaciones sin cuenta real.

export interface WhatsAppMessage {
  to: string
  templateName: string
  variables: Record<string, string>
}

export interface WhatsAppSendResult {
  providerMessageId: string
}

export interface WhatsAppProvider {
  send(message: WhatsAppMessage): Promise<WhatsAppSendResult>
}

const TEMPLATES: Record<string, (vars: Record<string, string>) => string> = {
  PRE_ALERT_5_DAYS: (v) =>
    `Hola ${v.tutorName}! Tu cita para ${v.petName} es el ${v.date}. Responde CONFIRMAR o REAGENDAR.`,
  REMINDER_24H: (v) => `Recordatorio: mañana ${v.date} es la cita de ${v.petName}. Te esperamos.`,
  LOCATION_22H: (v) => `Aquí la ubicación del salón para tu cita de mañana: ${v.mapUrl || 'contáctanos por este medio'}.`,
  DEPARTURE_15MIN: (v) => `${v.tutorName}, en 15 minutos comenzamos con ${v.petName}. ¡Puedes salir ahora!`,
  RECEIPT: (v) => `El servicio de ${v.petName} ha terminado. Total: $${v.total}. Foto y forma de pago adjuntas.`,
}

function renderTemplate(name: string, vars: Record<string, string>): string {
  const render = TEMPLATES[name]
  if (!render) throw new Error(`Plantilla de WhatsApp desconocida: ${name}`)
  return render(vars)
}

class ConsoleWhatsAppProvider implements WhatsAppProvider {
  async send(message: WhatsAppMessage): Promise<WhatsAppSendResult> {
    console.log(`[WhatsApp:dev -> ${message.to}] ${renderTemplate(message.templateName, message.variables)}`)
    return { providerMessageId: `console-${Date.now()}` }
  }
}

class TwilioWhatsAppProvider implements WhatsAppProvider {
  constructor(
    private accountSid: string,
    private authToken: string,
    private fromNumber: string
  ) {}

  async send(message: WhatsAppMessage): Promise<WhatsAppSendResult> {
    const body = new URLSearchParams({
      To: `whatsapp:${message.to}`,
      From: `whatsapp:${this.fromNumber}`,
      Body: renderTemplate(message.templateName, message.variables),
    })

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    if (!response.ok) {
      throw new Error(`Twilio respondió ${response.status}: ${await response.text()}`)
    }

    const data = (await response.json()) as { sid: string }
    return { providerMessageId: data.sid }
  }
}

let cachedProvider: WhatsAppProvider | null = null

export function getWhatsAppProvider(): WhatsAppProvider {
  if (cachedProvider) return cachedProvider

  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM } = process.env

  cachedProvider =
    TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_WHATSAPP_FROM
      ? new TwilioWhatsAppProvider(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM)
      : new ConsoleWhatsAppProvider()

  return cachedProvider
}

export const WHATSAPP_STAGE_TEMPLATE: Record<string, string> = {
  T_MINUS_5_DAYS: 'PRE_ALERT_5_DAYS',
  T_MINUS_24_HOURS: 'REMINDER_24H',
  T_MINUS_22_HOURS_LOCATION: 'LOCATION_22H',
  T_MINUS_15_MIN_DEPARTURE: 'DEPARTURE_15MIN',
  POST_SERVICE_RECEIPT: 'RECEIPT',
}
