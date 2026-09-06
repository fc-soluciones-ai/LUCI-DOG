import { InventoryTxType, type ProductUnit } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function listProducts() {
  return prisma.product.findMany({ where: { active: true }, orderBy: { name: 'asc' } })
}

export interface CreateProductInput {
  name: string
  category?: string
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

export interface UpdateProductInput {
  name: string
  category?: string
  stockMin: number
  costPerUnit: number
  supplier?: string
}

/** Edición de ficha del producto (Estandarización CRUD) — no toca el stock actual. */
export async function updateProduct(productId: string, input: UpdateProductInput) {
  return prisma.product.update({ where: { id: productId }, data: input })
}

/** Borrado lógico: deja de listarse/consumirse pero conserva su historial de movimientos. */
export async function softDeleteProduct(productId: string) {
  return prisma.product.update({ where: { id: productId }, data: { active: false } })
}
