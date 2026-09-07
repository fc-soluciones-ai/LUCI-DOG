import { NotificationStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { WHATSAPP_STAGE_TEMPLATE, getWhatsAppProvider } from '@/lib/whatsapp/adapter'
import { formatInBusinessTz } from '@/modules/agenda/timezone'

/**
 * Envía las notificaciones de WhatsApp cuya hora programada ya llegó.
 * Pensado para ser invocado por un cron externo (Vercel Cron, etc.)
 * cada 1-5 minutos vía POST /api/cron/dispatch-notifications.
 */
export async function dispatchDueNotifications() {
  const due = await prisma.notificationLog.findMany({
    where: { status: NotificationStatus.QUEUED, scheduledFor: { lte: new Date() } },
    include: {
      tutor: true,
      appointment: { include: { pet: true } },
    },
    take: 50,
  })

  const provider = getWhatsAppProvider()
  let sent = 0
  let failed = 0

  for (const notification of due) {
    const templateName = WHATSAPP_STAGE_TEMPLATE[notification.stage]
    if (!templateName) continue

    try {
      const result = await provider.send({
        to: notification.tutor.phoneWhatsApp,
        templateName,
        variables: {
          tutorName: notification.tutor.fullName,
          petName: notification.appointment?.pet.name ?? '',
          date: notification.appointment
            ? formatInBusinessTz(notification.appointment.scheduledStart, "d 'de' MMMM, h:mm a")
            : '',
          mapUrl: notification.tutor.addressMapUrl ?? '',
          total: notification.appointment?.quoteFinal?.toString() ?? '',
        },
      })

      await prisma.notificationLog.update({
        where: { id: notification.id },
        data: {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          providerMessageId: result.providerMessageId,
        },
      })
      sent++
    } catch (error) {
      console.error(`Fallo al enviar notificación ${notification.id}:`, error)
      await prisma.notificationLog.update({
        where: { id: notification.id },
        data: { status: NotificationStatus.FAILED },
      })
      failed++
    }
  }

  return { processed: due.length, sent, failed }
}
