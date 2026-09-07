import { AppointmentStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sizeMultiplier } from '@/modules/shared/grooming'
import { getBufferTimeMinutes } from '@/modules/config/settings'
import { getBusinessHourForDay } from '@/modules/config/businessHours'
import { zonedDayOfWeek, zonedDayRange } from './timezone'
import { ValidationError } from './errors'

const SLOT_STEP_MIN = 30

export interface TimeSlot {
  start: string // ISO
  available: boolean
}

/** Duración real de un servicio para una talla dada — reusa el multiplicador ya usado por el pipeline del Dashboard TV. */
export function computeDurationMinutes(standardDurationMin: number, sizeCategory?: string | null): number {
  return Math.round(standardDurationMin * sizeMultiplier(sizeCategory ?? null))
}

/**
 * Slots de `SLOT_STEP_MIN` minutos dentro del horario de negocio configurado
 * para ese día ([BusinessHour]). "Disponible" sigue siendo por capacidad
 * global (cuántas citas ya se traslapan, con el buffer de limpieza aplicado,
 * contra el total de estaciones activas) — no por estación/categoría
 * específica, mismo alcance que ya tenía el motor antes de este fix.
 */
export async function getAvailableSlots(date: Date, serviceId: string, sizeCategory?: string | null): Promise<TimeSlot[]> {
  const service = await prisma.service.findUniqueOrThrow({ where: { id: serviceId } })
  const durationMs = computeDurationMinutes(service.standardDurationMin, sizeCategory) * 60_000

  const businessHour = await getBusinessHourForDay(zonedDayOfWeek(date))
  if (!businessHour.isOpen) return []

  const { start: dayStart, end: dayEnd } = zonedDayRange(date)
  const bufferMs = (await getBufferTimeMinutes()) * 60_000

  const [appointments, activeWorkstations] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        scheduledStart: { gte: dayStart, lt: dayEnd },
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
      },
      select: { scheduledStart: true, scheduledEnd: true },
    }),
    prisma.workstation.count({ where: { active: true } }),
  ])

  const capacity = Math.max(activeWorkstations, 1)

  const [openHour, openMinute] = businessHour.openTime.split(':').map(Number)
  const [closeHour, closeMinute] = businessHour.closeTime.split(':').map(Number)
  const dayOpenMinutes = openHour * 60 + openMinute
  const dayCloseMinutes = closeHour * 60 + closeMinute
  const dayCloseMs = dayStart.getTime() + dayCloseMinutes * 60_000

  const slots: TimeSlot[] = []

  for (let minutes = dayOpenMinutes; minutes < dayCloseMinutes; minutes += SLOT_STEP_MIN) {
    const slotStart = new Date(dayStart.getTime() + minutes * 60_000)
    const slotEnd = new Date(slotStart.getTime() + durationMs)
    if (slotEnd.getTime() > dayCloseMs) continue // no cabe antes del cierre

    const overlapping = appointments.filter(
      (a) => a.scheduledStart.getTime() < slotEnd.getTime() + bufferMs && a.scheduledEnd.getTime() + bufferMs > slotStart.getTime()
    ).length

    slots.push({ start: slotStart.toISOString(), available: overlapping < capacity })
  }

  return slots
}

export async function assertSlotAvailable(scheduledStart: Date, serviceId: string, sizeCategory?: string | null) {
  const slots = await getAvailableSlots(scheduledStart, serviceId, sizeCategory)
  const match = slots.find((slot) => slot.start === scheduledStart.toISOString())
  if (!match || !match.available) {
    throw new ValidationError('Ese horario ya no está disponible. Elige otro.')
  }
}

/**
 * Choque de horario específico de la mascota: además de la capacidad general
 * del salón, la MISMA mascota nunca puede tener dos citas activas que se
 * traslapen (independientemente de cuánta capacidad libre haya).
 */
export async function assertNoPetOverlap(petId: string, scheduledStart: Date, scheduledEnd: Date, excludeAppointmentId?: string) {
  const conflict = await prisma.appointment.findFirst({
    where: {
      petId,
      id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
      status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
      scheduledStart: { lt: scheduledEnd },
      scheduledEnd: { gt: scheduledStart },
    },
  })
  if (conflict) {
    throw new ValidationError('Esta mascota ya tiene otra cita en ese horario.')
  }
}
