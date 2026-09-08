import { AppointmentStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { zonedDayRange } from '@/modules/agenda/timezone'
import { getPendingClosures, getInvoicesNeedingAttention } from '@/modules/billing/invoices'
import { listProducts } from '@/modules/inventory/products'

/**
 * Datos en vivo para las tarjetas KPI del Home del admin (hallazgo #4 de la
 * auditoría UX): antes solo eran enlaces sin un solo dato, mientras que
 * Reportes ya usaba este mismo patrón de tarjeta con datos reales.
 */
export async function getHomeSummary() {
  const { start, end } = zonedDayRange(new Date())

  const [appointmentsToday, products, pendingClosures, invoicesNeedingAttention] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        scheduledStart: { gte: start, lt: end },
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
      },
      select: { status: true },
    }),
    listProducts(),
    getPendingClosures(),
    getInvoicesNeedingAttention(),
  ])

  const appointmentsPending = appointmentsToday.filter((a) => a.status === AppointmentStatus.PENDING_CONFIRMATION).length
  const appointmentsCompleted = appointmentsToday.filter((a) => a.status === AppointmentStatus.COMPLETED).length
  const lowStockCount = products.filter((p) => Number(p.stockCurrent) < Number(p.stockMin)).length

  return {
    appointmentsToday: {
      total: appointmentsToday.length,
      pending: appointmentsPending,
      completed: appointmentsCompleted,
    },
    lowStockCount,
    billingPendingCount: pendingClosures.length + invoicesNeedingAttention.length,
  }
}

export type HomeSummary = Awaited<ReturnType<typeof getHomeSummary>>
