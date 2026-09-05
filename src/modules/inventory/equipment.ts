import { EquipmentStatus, type EquipmentType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function listEquipment() {
  const equipment = await prisma.equipment.findMany({
    orderBy: { name: 'asc' },
    include: { maintenanceLogs: { orderBy: { performedAt: 'desc' }, take: 3 } },
  })
  const now = new Date()
  return equipment.map((item) => ({
    ...item,
    isOverdue: Boolean(item.nextMaintenanceDue && item.nextMaintenanceDue < now),
  }))
}

export interface CreateEquipmentInput {
  name: string
  type: EquipmentType
  purchaseCost: number
  usefulLifeMonths: number
}

export async function createEquipment(input: CreateEquipmentInput) {
  return prisma.equipment.create({ data: { ...input, purchaseDate: new Date() } })
}

/** Registra un mantenimiento técnico y reprograma el próximo (Módulo 5). */
export async function logMaintenance(
  equipmentId: string,
  description: string,
  cost: number | undefined,
  nextDueInDays: number
) {
  const now = new Date()
  const nextDueAt = new Date(now.getTime() + nextDueInDays * 24 * 60 * 60 * 1000)

  return prisma.$transaction([
    prisma.maintenanceLog.create({ data: { equipmentId, description, cost, performedAt: now, nextDueAt } }),
    prisma.equipment.update({
      where: { id: equipmentId },
      data: { lastMaintenanceAt: now, nextMaintenanceDue: nextDueAt, status: EquipmentStatus.OPERATIONAL },
    }),
  ])
}

export async function flagEquipmentStatus(equipmentId: string, status: EquipmentStatus) {
  return prisma.equipment.update({ where: { id: equipmentId }, data: { status } })
}
