import { AppointmentStatus, BillingStatus, NotificationStage, NotificationStatus, type PaymentMethod } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getWhatsAppProvider } from '@/lib/whatsapp/adapter'

/** Citas COMPLETED sin factura todavía — pendientes de cerrar (Módulo 6). */
export async function getPendingClosures() {
  return prisma.appointment.findMany({
    where: { status: AppointmentStatus.COMPLETED, invoice: null },
    include: { pet: true, tutor: true, service: true },
    orderBy: { actualEnd: 'desc' },
  })
}

/** Facturas que requieren atención del staff: comprobante pendiente o vencido. */
export async function getInvoicesNeedingAttention() {
  return prisma.invoice.findMany({
    where: { status: { in: [BillingStatus.PENDING_PROOF, BillingStatus.OVERDUE] } },
    include: { tutor: true, appointment: { include: { pet: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export interface CloseServiceInput {
  appointmentId: string
  items: { description: string; amount: number }[]
  finishedPhotoUrl?: string
  paymentMethod: PaymentMethod
  markPaidNow: boolean
}

/**
 * Cierra un servicio completado: genera la factura con su desglose, y envía
 * por WhatsApp la foto del trabajo terminado + desglose + datos de pago
 * (Módulo 6). Si no se marca como pagado de inmediato (ej. no es efectivo),
 * el tutor queda en `PENDING_PROOF` — bloqueando su auto-agendamiento hasta
 * que se verifique el comprobante.
 */
export async function closeServiceAndInvoice(input: CloseServiceInput) {
  const appointment = await prisma.appointment.findUniqueOrThrow({
    where: { id: input.appointmentId },
    include: { tutor: true, pet: true },
  })

  const subtotal = input.items.reduce((sum, item) => sum + item.amount, 0)

  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        appointmentId: appointment.id,
        tutorId: appointment.tutorId,
        subtotal,
        total: subtotal,
        finishedPhotoUrl: input.finishedPhotoUrl,
        paymentMethod: input.paymentMethod,
        status: input.markPaidNow ? BillingStatus.PAID : BillingStatus.PENDING_PROOF,
        paidAt: input.markPaidNow ? new Date() : null,
        items: { create: input.items.map((item) => ({ description: item.description, amount: item.amount })) },
      },
    })

    await tx.appointment.update({ where: { id: appointment.id }, data: { quoteFinal: subtotal } })

    await tx.tutor.update({
      where: { id: appointment.tutorId },
      data: { billingStatus: input.markPaidNow ? BillingStatus.PAID : BillingStatus.PENDING_PROOF },
    })

    return created
  })

  const proofLink = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/pagar/${invoice.id}`
  const provider = getWhatsAppProvider()

  const result = await provider.send({
    to: appointment.tutor.phoneWhatsApp,
    templateName: 'RECEIPT',
    mediaUrl: input.finishedPhotoUrl,
    variables: {
      petName: appointment.pet.name,
      total: subtotal.toFixed(2),
      paymentInfo: input.markPaidNow ? 'Pagado en el salón. ¡Gracias!' : process.env.PAYMENT_INFO_TEXT ?? 'Contacta al salón para los datos de pago.',
      proofLink: input.markPaidNow ? '' : proofLink,
    },
  })

  await prisma.notificationLog.create({
    data: {
      appointmentId: appointment.id,
      tutorId: appointment.tutorId,
      stage: NotificationStage.POST_SERVICE_RECEIPT,
      status: NotificationStatus.SENT,
      scheduledFor: new Date(),
      sentAt: new Date(),
      providerMessageId: result.providerMessageId,
    },
  })

  return invoice
}

/** Envío del comprobante de pago por el cliente (página pública, sin login). */
export async function submitProof(invoiceId: string, proofUrl: string) {
  return prisma.invoice.update({ where: { id: invoiceId }, data: { proofUrl } })
}

/** El staff verifica el comprobante recibido: desbloquea el auto-agendamiento del tutor. */
export async function verifyProof(invoiceId: string, verifiedBy: string) {
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } })

  await prisma.$transaction([
    prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: BillingStatus.PAID,
        proofVerifiedAt: new Date(),
        proofVerifiedBy: verifiedBy,
        paidAt: invoice.paidAt ?? new Date(),
      },
    }),
    prisma.tutor.update({ where: { id: invoice.tutorId }, data: { billingStatus: BillingStatus.PAID } }),
  ])
}

/** Desautorización manual del bloqueo por un administrador (Módulo 6). */
export async function manuallyUnblockTutor(tutorId: string, unblockedBy: string) {
  const pendingInvoice = await prisma.invoice.findFirst({
    where: { tutorId, status: { in: [BillingStatus.PENDING_PROOF, BillingStatus.OVERDUE] } },
    orderBy: { createdAt: 'desc' },
  })

  await prisma.$transaction([
    ...(pendingInvoice
      ? [
          prisma.invoice.update({
            where: { id: pendingInvoice.id },
            data: { manuallyUnblockedAt: new Date(), manuallyUnblockedBy: unblockedBy },
          }),
        ]
      : []),
    prisma.tutor.update({ where: { id: tutorId }, data: { billingStatus: BillingStatus.MANUALLY_UNBLOCKED } }),
  ])
}

/** Marca como vencidas las facturas con comprobante pendiente hace más de `daysThreshold` días. */
export async function flagOverdueInvoices(daysThreshold = 3) {
  const cutoff = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000)
  const overdue = await prisma.invoice.findMany({
    where: { status: BillingStatus.PENDING_PROOF, createdAt: { lt: cutoff } },
  })

  for (const invoice of overdue) {
    await prisma.$transaction([
      prisma.invoice.update({ where: { id: invoice.id }, data: { status: BillingStatus.OVERDUE } }),
      prisma.tutor.update({ where: { id: invoice.tutorId }, data: { billingStatus: BillingStatus.OVERDUE } }),
    ])
  }

  return { flagged: overdue.length }
}

export async function getInvoiceForProofPage(invoiceId: string) {
  return prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { tutor: true, appointment: { include: { pet: true, service: true } }, items: true },
  })
}
