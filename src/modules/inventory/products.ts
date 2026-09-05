import { InventoryTxType, type ProductUnit } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function listProducts() {
  return prisma.product.findMany({ orderBy: { name: 'asc' } })
}

export interface CreateProductInput {
  name: string
  unit: ProductUnit
  stockCurrent: number
  stockMin: number
  costPerUnit: number
  supplier?: string
}

export async function createProduct(input: CreateProductInput) {
  return prisma.product.create({ data: input })
}

/** Reabasto manual de un producto (Módulo 5) — deja rastro en InventoryTransaction. */
export async function restockProduct(productId: string, quantity: number, note?: string) {
  return prisma.$transaction([
    prisma.product.update({ where: { id: productId }, data: { stockCurrent: { increment: quantity } } }),
    prisma.inventoryTransaction.create({
      data: { productId, type: InventoryTxType.RESTOCK, quantity, note },
    }),
  ])
}
