import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createSelfServiceBooking } from '@/modules/agenda/booking'
import { BookingBlockedError, ValidationError } from '@/modules/agenda/errors'
import { parseZonedDateTime } from '@/modules/agenda/timezone'

const bookingSchema = z.object({
  tutor: z.object({
    fullName: z.string().min(2),
    phoneWhatsApp: z.string().min(8),
    email: z.string().email().optional().or(z.literal('')),
    address: z.string().optional(),
  }),
  pet: z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    breed: z.string().min(1),
    sizeCategory: z.string().optional(),
    coatType: z.string().optional(),
    weightEstimated: z.coerce.number().positive().optional(),
  }),
  serviceId: z.string().min(1),
  // String sin offset (ej. "2026-09-06T10:00", tal como lo entrega un
  // <input type="datetime-local">) — se interpreta explícitamente como hora
  // de Costa Rica más abajo. z.coerce.date() lo parseaba como hora del
  // servidor (UTC en Vercel), desfasando la cita hasta 6 horas.
  scheduledStart: z.string().min(1),
  antiFraudConsent: z.literal(true),
})

export async function POST(request: Request) {
  const json = await request.json().catch(() => null)
  const parsed = bookingSchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const appointment = await createSelfServiceBooking({
      ...parsed.data,
      scheduledStart: parseZonedDateTime(parsed.data.scheduledStart),
    })
    return NextResponse.json(appointment, { status: 201 })
  } catch (error) {
    if (error instanceof BookingBlockedError) {
      return NextResponse.json({ error: error.message, billingStatus: error.billingStatus }, { status: 403 })
    }
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Error interno al agendar la cita.' }, { status: 500 })
  }
}
