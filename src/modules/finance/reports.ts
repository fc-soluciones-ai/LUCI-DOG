import { AppointmentStatus, BillingStatus, InventoryTxType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { addMonths, startOfMonth } from './dateRange'

interface MarginBucket {
  revenue: number
  cost: number
  count: number
}

function toMarginArray(map: Map<string, MarginBucket>) {
  return Array.from(map.entries())
    .map(([name, v]) => ({
      name,
      revenue: v.revenue,
      cost: v.cost,
      margin: v.revenue - v.cost,
      marginPct: v.revenue > 0 ? ((v.revenue - v.cost) / v.revenue) * 100 : 0,
      count: v.count,
    }))
    .sort((a, b) => b.margin - a.margin)
}

/** Reporte 1: margen de rentabilidad por raza y por servicio. */
export async function getProfitabilityReport(monthDate: Date) {
  const start = startOfMonth(monthDate)
  const end = addMonths(start, 1)

  const invoices = await prisma.invoice.findMany({
    where: { createdAt: { gte: start, lt: end } },
    include: {
      appointment: {
        include: {
          service: true,
          pet: true,
          formulaUsages: { include: { formula: { include: { product: true } } } },
        },
      },
    },
  })

  const byService = new Map<string, MarginBucket>()
  const byBreed = new Map<string, MarginBucket>()

  for (const invoice of invoices) {
    const revenue = Number(invoice.total)
    const cost = invoice.appointment.formulaUsages.reduce(
      (sum, usage) => sum + Number(usage.mlUsed) * Number(usage.formula.product.costPerUnit),
      0
    )

    for (const [map, key] of [
      [byService, invoice.appointment.service.name],
      [byBreed, invoice.appointment.pet.breed],
    ] as const) {
      const entry = map.get(key) ?? { revenue: 0, cost: 0, count: 0 }
      entry.revenue += revenue
      entry.cost += cost
      entry.count += 1
      map.set(key, entry)
    }
  }

  return { byService: toMarginArray(byService), byBreed: toMarginArray(byBreed) }
}

/** Reporte 2: eficiencia de tiempos y procrastinación en mesa. */
export async function getTimeEfficiencyReport(monthDate: Date) {
  const start = startOfMonth(monthDate)
  const end = addMonths(start, 1)

  const [timeLogs, appointmentSteps] = await Promise.all([
    prisma.timeLog.findMany({ where: { endedAt: { gte: start, lt: end } } }),
    prisma.appointmentStep.findMany({ where: { endedAt: { gte: start, lt: end } } }),
  ])

  const all = [...timeLogs, ...appointmentSteps]
  const total = all.length
  const onTrack = all.filter((t) => t.status === 'ON_TRACK').length
  const warning = all.filter((t) => t.status === 'WARNING').length
  const delayed = all.filter((t) => t.status === 'DELAYED').length
  const avgDelaySeconds = total > 0 ? all.reduce((sum, t) => sum + t.delaySeconds, 0) / total : 0

  return {
    total,
    onTrack,
    warning,
    delayed,
    onTrackPct: total > 0 ? (onTrack / total) * 100 : 0,
    avgDelaySeconds,
  }
}

/** Reporte 3: rendimiento y mermas de inventario. */
export async function getInventoryPerformanceReport(monthDate: Date) {
  const start = startOfMonth(monthDate)
  const end = addMonths(start, 1)

  const transactions = await prisma.inventoryTransaction.findMany({
    where: { createdAt: { gte: start, lt: end } },
    include: { product: true },
  })

  const byProduct = new Map<string, { unit: string; consumption: number; waste: number; costConsumed: number }>()

  for (const tx of transactions) {
    if (tx.type !== InventoryTxType.CONSUMPTION && tx.type !== InventoryTxType.WASTE) continue

    const entry = byProduct.get(tx.product.name) ?? {
      unit: tx.product.unit,
      consumption: 0,
      waste: 0,
      costConsumed: 0,
    }
    const qty = Number(tx.quantity)

    if (tx.type === InventoryTxType.CONSUMPTION) {
      entry.consumption += qty
      entry.costConsumed += qty * Number(tx.product.costPerUnit)
    } else {
      entry.waste += qty
    }

    byProduct.set(tx.product.name, entry)
  }

  const products = Array.from(byProduct.entries()).map(([name, v]) => ({
    name,
    ...v,
    wastePct: v.consumption + v.waste > 0 ? (v.waste / (v.consumption + v.waste)) * 100 : 0,
  }))

  const instrumentStatusCounts = await prisma.instrument.groupBy({ by: ['status'], _count: { _all: true } })

  return {
    products,
    instrumentStatus: instrumentStatusCounts.map((row) => ({ status: row.status, count: row._count._all })),
  }
}

/** Reporte 4: retención de clientes y candidatos a reactivación. */
export async function getRetentionReport(inactivityDays = 60) {
  const cutoff = new Date(Date.now() - inactivityDays * 24 * 60 * 60 * 1000)

  const tutors = await prisma.tutor.findMany({
    include: {
      appointments: { orderBy: { scheduledStart: 'desc' }, take: 1, select: { scheduledStart: true } },
      _count: { select: { appointments: true } },
    },
  })

  const active = tutors.filter((t) => t.appointments[0] && t.appointments[0].scheduledStart >= cutoff)
  const inactive = tutors.filter((t) => !t.appointments[0] || t.appointments[0].scheduledStart < cutoff)
  const returning = tutors.filter((t) => t._count.appointments > 1)

  return {
    totalTutors: tutors.length,
    activeCount: active.length,
    inactiveCount: inactive.length,
    retentionRate: tutors.length > 0 ? (returning.length / tutors.length) * 100 : 0,
    inactiveTutors: inactive
      .map((t) => ({
        id: t.id,
        fullName: t.fullName,
        phoneWhatsApp: t.phoneWhatsApp,
        lastAppointment: t.appointments[0]?.scheduledStart ?? null,
      }))
      .sort((a, b) => (a.lastAppointment?.getTime() ?? 0) - (b.lastAppointment?.getTime() ?? 0)),
  }
}

/** Reporte 5: cuentas por cobrar y morosidad. */
export async function getReceivablesReport() {
  const invoices = await prisma.invoice.findMany({
    where: { status: { in: [BillingStatus.PENDING_PROOF, BillingStatus.OVERDUE] } },
    include: { tutor: true, appointment: { include: { pet: true } } },
    orderBy: { createdAt: 'asc' },
  })

  const now = Date.now()
  const totalReceivable = invoices.reduce((sum, i) => sum + Number(i.total), 0)

  return {
    totalReceivable,
    count: invoices.length,
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      tutorName: invoice.tutor.fullName,
      petName: invoice.appointment.pet.name,
      total: Number(invoice.total),
      status: invoice.status,
      daysPending: Math.floor((now - invoice.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
    })),
  }
}

export async function countCompletedAppointmentsInMonth(monthDate: Date) {
  const start = startOfMonth(monthDate)
  const end = addMonths(start, 1)
  return prisma.appointment.count({
    where: { status: AppointmentStatus.COMPLETED, actualEnd: { gte: start, lt: end } },
  })
}
