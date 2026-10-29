'use server'

import { getAvailableSlots, type TimeSlot } from './availability'
import { parseZonedDateTime } from './timezone'

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * Horarios libres para la reserva pública (/book, sin login). Solo expone
 * "libre / ocupado" por hora — ningún dato de otros clientes. `dateStr` es
 * un día "YYYY-MM-DD" que se interpreta en hora de Costa Rica.
 */
export async function getAvailableSlotsPublicAction(serviceId: string, dateStr: string, sizeCategory?: string): Promise<TimeSlot[]> {
  if (!serviceId || !DATE_PATTERN.test(dateStr)) return []
  return getAvailableSlots(parseZonedDateTime(`${dateStr}T00:00:00`), serviceId, sizeCategory)
}
