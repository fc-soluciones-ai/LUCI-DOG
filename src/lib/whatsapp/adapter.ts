// Abstracción de envío de WhatsApp. Sin credenciales de Twilio configuradas,
// cae automáticamente a ConsoleWhatsAppProvider (imprime el mensaje en consola)
// para poder desarrollar y probar el flujo de notificaciones sin cuenta real.

import { getBranding } from '@/modules/config/branding'

export interface WhatsAppMessage {
  to: string
  templateName: string
  variables: Record<string, string>
  mediaUrl?: string
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
  RECEIPT: (v) =>
    `¡Listo! El servicio de ${v.petName} ha terminado 🐾\n\nTotal a pagar: $${v.total}\n\nDatos de pago:\n${v.paymentInfo}\n\nEn cuanto realices tu pago, sube tu comprobante aquí para desbloquear tu próxima cita: ${v.proofLink}`,
  DELAY_ALERT: (v) =>
    `Aviso: tu cita para ${v.petName} podría retrasarse por el Efecto en Cadena de citas anteriores. Te avisaremos la nueva hora estimada, disculpa la demora.`,
}

// Nombres en español que el admin puede escribir en sus plantillas personalizadas
// (ej. "{nombre_cliente}"), mapeados a las claves internas reales de cada template.
const SPANISH_VAR_ALIASES: Record<string, string> = {
  nombre_cliente: 'tutorName',
  nombre_perro: 'petName',
  fecha_cita: 'date',
  link_pago: 'proofLink',
}

function withSpanishAliases(vars: Record<string, string>): Record<string, string> {
  const merged = { ...vars }
  for (const [alias, original] of Object.entries(SPANISH_VAR_ALIASES)) {
    if (vars[original] !== undefined) merged[alias] = vars[original]
  }
  return merged
}

/** Sustituye {clave} por vars.clave en una plantilla de White Label editada por el admin. */
function renderCustomTemplate(template: string, vars: Record<string, string>): string {
  const merged = withSpanishAliases(vars)
  return template.replace(/\{(\w+)\}/g, (match, key: string) => merged[key] ?? match)
}

async function renderTemplate(name: string, vars: Record<string, string>): Promise<string> {
  const branding = await getBranding()
  const override = branding.whatsappTemplates[name]
  if (override) return renderCustomTemplate(override, vars)

  const render = TEMPLATES[name]
  if (!render) throw new Error(`Plantilla de WhatsApp desconocida: ${name}`)
  return render(vars)
}

class ConsoleWhatsAppProvider implements WhatsAppProvider {
  async send(message: WhatsAppMessage): Promise<WhatsAppSendResult> {
    const mediaLine = message.mediaUrl ? `\n[imagen adjunta: ${message.mediaUrl}]` : ''
    const body = await renderTemplate(message.templateName, message.variables)
    console.log(`[WhatsApp:dev -> ${message.to}] ${body}${mediaLine}`)
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
    const renderedBody = await renderTemplate(message.templateName, message.variables)
    const body = new URLSearchParams({
      To: `whatsapp:${message.to}`,
      From: `whatsapp:${this.fromNumber}`,
      Body: renderedBody,
    })
    if (message.mediaUrl) {
      body.append('MediaUrl', message.mediaUrl)
    }

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
  DELAY_ALERT: 'DELAY_ALERT',
}
