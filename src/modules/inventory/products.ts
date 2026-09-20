import { InventoryTxType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function listProducts() {
  return prisma.product.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    include: { category: true, unitOfMeasure: true },
  })
}

export interface CreateProductInput {
  name: string
  categoryId?: string
  unitId?: string
  stockCurrent: number
  stockMin: number
  costPerUnit: number
  supplier?: string
  imageUrl?: string | null
  imagePath?: string | null
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
  categoryId?: string
  unitId?: string
  stockMin: number
  costPerUnit: number
  supplier?: string
  imageUrl?: string | null
  imagePath?: string | null
}

/** Edición de ficha del producto (Estandarización CRUD) — no toca el stock actual. */
export async function updateProduct(productId: string, input: UpdateProductInput) {
  return prisma.product.update({ where: { id: productId }, data: input })
}

export async function getProductImagePath(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { imagePath: true } })
  return product?.imagePath ?? null
}

/** Borrado lógico: deja de listarse/consumirse pero conserva su historial de movimientos. */
export async function softDeleteProduct(productId: string) {
  return prisma.product.update({ where: { id: productId }, data: { active: false } })
}
