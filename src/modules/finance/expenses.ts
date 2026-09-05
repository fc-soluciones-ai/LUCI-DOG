import type { ExpenseFrequency } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function listFixedExpenses() {
  return prisma.fixedExpense.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] })
}

export interface CreateFixedExpenseInput {
  name: string
  category: string
  amount: number
  frequency: ExpenseFrequency
  effectiveFrom: Date
}

export async function createFixedExpense(input: CreateFixedExpenseInput) {
  return prisma.fixedExpense.create({ data: input })
}

export async function setFixedExpenseActive(id: string, active: boolean) {
  return prisma.fixedExpense.update({ where: { id }, data: { active } })
}
