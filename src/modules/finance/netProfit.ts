import { ExpenseFrequency, InventoryTxType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { addMonths, startOfMonth } from './dateRange'

/**
 * Utilidad Neta Mensual = Ingresos Totales - (Gastos Fijos + Costo de
 * Insumos por ml + Depreciación de Equipos). Módulo 7.
 */
export async function computeMonthlyFinancials(monthDate: Date) {
  const start = startOfMonth(monthDate)
  const end = addMonths(start, 1)

  const invoices = await prisma.invoice.findMany({ where: { createdAt: { gte: start, lt: end } } })
  const totalRevenue = invoices.reduce((sum, i) => sum + Number(i.total), 0)

  const fixedExpenses = await prisma.fixedExpense.findMany({
    where: {
      active: true,
      effectiveFrom: { lt: end },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: start } }],
    },
  })
  const totalFixedExpenses = fixedExpenses.reduce((sum, expense) => {
    const amount = Number(expense.amount)
    if (expense.frequency === ExpenseFrequency.YEARLY) return sum + amount / 12
    if (expense.frequency === ExpenseFrequency.ONE_TIME) {
      return sum + (expense.effectiveFrom >= start && expense.effectiveFrom < end ? amount : 0)
    }
    return sum + amount // MONTHLY
  }, 0)

  const consumptions = await prisma.inventoryTransaction.findMany({
    where: { type: InventoryTxType.CONSUMPTION, createdAt: { gte: start, lt: end } },
    include: { product: true },
  })
  const totalSuppliesCost = consumptions.reduce(
    (sum, tx) => sum + Number(tx.quantity) * Number(tx.product.costPerUnit),
    0
  )

  const equipment = await prisma.equipment.findMany()
  const totalDepreciation = equipment.reduce((sum, item) => {
    const depreciationEnd = addMonths(item.purchaseDate, item.usefulLifeMonths)
    const isDepreciatingThisMonth = item.purchaseDate < end && depreciationEnd > start
    return sum + (isDepreciatingThisMonth ? Number(item.purchaseCost) / item.usefulLifeMonths : 0)
  }, 0)

  const netProfit = totalRevenue - (totalFixedExpenses + totalSuppliesCost + totalDepreciation)

  return {
    month: start,
    totalRevenue,
    totalFixedExpenses,
    totalSuppliesCost,
    totalDepreciation,
    netProfit,
  }
}

export async function saveFinancialSnapshot(monthDate: Date) {
  const financials = await computeMonthlyFinancials(monthDate)
  return prisma.financialSnapshot.upsert({
    where: { month: financials.month },
    create: { ...financials, generatedAt: new Date() },
    update: {
      totalRevenue: financials.totalRevenue,
      totalFixedExpenses: financials.totalFixedExpenses,
      totalSuppliesCost: financials.totalSuppliesCost,
      totalDepreciation: financials.totalDepreciation,
      netProfit: financials.netProfit,
      generatedAt: new Date(),
    },
  })
}
