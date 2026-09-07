import { fromZonedTime, formatInTimeZone, toZonedTime } from 'date-fns-tz'
import { es } from 'date-fns/locale'

/**
 * Zona horaria real del negocio — Costa Rica no observa horario de verano
 * (offset fijo UTC-6), pero se usa el nombre IANA en vez de un offset fijo
 * para que un despliegue White Label en otro país solo tenga que cambiar
 * esta constante.
 */
export const BUSINESS_TIMEZONE = 'America/Costa_Rica'

/**
 * Instante UTC correcto para las 00:00 del día calendario de `date` en
 * Costa Rica — reemplaza el patrón `new Date(); x.setHours(0,0,0,0)` que
 * calcula "medianoche" en la zona del proceso (UTC en Vercel), no en la del
 * negocio, duplicado y roto en 3 lugares antes de este fix.
 */
export function zonedDayStart(date: Date): Date {
  const zoned = toZonedTime(date, BUSINESS_TIMEZONE)
  return fromZonedTime(new Date(zoned.getFullYear(), zoned.getMonth(), zoned.getDate(), 0, 0, 0, 0), BUSINESS_TIMEZONE)
}

/** Rango [inicio, fin) del día calendario de `date` en hora de Costa Rica. */
export function zonedDayRange(date: Date): { start: Date; end: Date } {
  const start = zonedDayStart(date)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { start, end }
}

/** Día de la semana (0=domingo ... 6=sábado) de `date` en hora de Costa Rica. */
export function zonedDayOfWeek(date: Date): number {
  return toZonedTime(date, BUSINESS_TIMEZONE).getDay()
}

/**
 * Interpreta un string sin offset ("2026-09-06T10:00", tal como lo entrega
 * un <input type="datetime-local">) como hora de pared de Costa Rica y
 * devuelve el instante UTC correcto — antes se parseaba con `new Date(...)`,
 * que lo interpreta como hora del servidor (UTC), desfasando la cita.
 */
export function parseZonedDateTime(raw: string): Date {
  return fromZonedTime(raw, BUSINESS_TIMEZONE)
}

/** Formatea un instante en hora de Costa Rica — usar en vez de `.toLocaleString(...)` sin `timeZone`. */
export function formatInBusinessTz(date: Date, formatStr: string): string {
  return formatInTimeZone(date, BUSINESS_TIMEZONE, formatStr, { locale: es })
}
