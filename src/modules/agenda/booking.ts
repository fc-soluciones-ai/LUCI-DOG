import { AppointmentSource, AppointmentStatus, BillingStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { scheduleAppointmentNotifications } from './notifications'
import { BookingBlockedError, ValidationError } from './errors'
import { assertNoPetOverlap, assertSlotAvailable, computeDurationMinutes } from './availability'

// Regla anti-morosidad (Módulo 6): estos estados bloquean el auto-agendamiento
// hasta que se verifique el comprobante o el admin desautorice manualmente.
export const BLOCKING_STATUSES: BillingStatus[] = [
  BillingStatus.PENDING_PROOF,
  BillingStatus.OVERDUE,
  BillingStatus.BLOCKED,
  BillingStatus.REJECTED,
]

export interface SelfServiceBookingInput {
  tutor: {
    fullName: string
    phoneWhatsApp: string
    email?: string
    address?: string
  }
  pet: {
    id?: string // mascota ya existente (cliente recurrente agendando espontáneamente)
    name: string
    breed: string
    sizeCategory?: string
    coatType?: string
    weightEstimated?: number
  }
  serviceId: string
  scheduledStart: Date
  antiFraudConsent: boolean
}

export async function createSelfServiceBooking(input: SelfServiceBookingInput) {
  if (!input.antiFraudConsent) {
    throw new ValidationError('Debe aceptar la cláusula de cotización estimada antes de agendar.')
  }

  // Validado fuera de la transacción, igual que en el portal del cliente
  // (modules/client/booking.ts) — este flujo self-service antes no validaba
  // disponibilidad en absoluto, aceptaba cualquier horario a ciegas.
  const service = await prisma.service.findUniqueOrThrow({ where: { id: input.serviceId } })
  await assertSlotAvailable(input.scheduledStart, input.serviceId, input.pet.sizeCategory)
  const durationMin = computeDurationMinutes(service.standardDurationMin, input.pet.sizeCategory)
  const scheduledEnd = new Date(input.scheduledStart.getTime() + durationMin * 60_000)
  if (input.pet.id) {
    await assertNoPetOverlap(input.pet.id, input.scheduledStart, scheduledEnd)
  }

  return prisma.$transaction(async (tx) => {
    let tutor = await tx.tutor.findUnique({ where: { phoneWhatsApp: input.tutor.phoneWhatsApp } })

    if (tutor && BLOCKING_STATUSES.includes(tutor.billingStatus)) {
      throw new BookingBlockedError(
        'Tienes un comprobante de pago pendiente de verificación. Contacta al salón para reactivar tu agenda.',
        tutor.billingStatus
      )
    }

    if (!tutor) {
      tutor = await tx.tutor.create({
        data: {
          fullName: input.tutor.fullName,
          phoneWhatsApp: input.tutor.phoneWhatsApp,
          email: input.tutor.email,
          address: input.tutor.address,
          antiFraudConsentAt: new Date(),
        },
      })
    } else if (!tutor.antiFraudConsentAt) {
      tutor = await tx.tutor.update({
        where: { id: tutor.id },
        data: { antiFraudConsentAt: new Date() },
      })
    }

    const pet = input.pet.id
      ? await tx.pet.findFirstOrThrow({ where: { id: input.pet.id, tutorId: tutor.id } })
      : await tx.pet.create({
          data: {
            tutorId: tutor.id,
            name: input.pet.name,
            breed: input.pet.breed,
            sizeCategory: input.pet.sizeCategory,
            coatType: input.pet.coatType,
            weightEstimated: input.pet.weightEstimated,
          },
        })

    const appointment = await tx.appointment.create({
      data: {
        petId: pet.id,
        tutorId: tutor.id,
        serviceId: service.id,
        source: AppointmentSource.SELF_SERVICE_WEB,
        status: AppointmentStatus.PENDING_CONFIRMATION,
        scheduledStart: input.scheduledStart,
        scheduledEnd,
        // Cotización estimada — el monto final se ajusta en recepción (cláusula anti-fraude).
        quoteEstimated: service.basePrice,
      },
    })

    await scheduleAppointmentNotifications(tx, appointment.id)

    return appointment
  })
}
