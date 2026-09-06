import { EquipmentStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/** Antigüedad vs. vida útil declarada — proxy de "salud"/depreciación del activo. */
function getEquipmentHealthRatio(purchaseDate: Date, usefulLifeMonths: number, now: Date): number {
  if (usefulLifeMonths <= 0) return 1
  const ageMonths = (now.getTime() - purchaseDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000)
  return Math.max(0, Math.min(1, 1 - ageMonths / usefulLifeMonths))
}

export async function listEquipment() {
  const equipment = await prisma.equipment.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
    include: {
      category: true,
      maintenanceLogs: { orderBy: { performedAt: 'desc' }, take: 3 },
    },
  })
  const now = new Date()
  return equipment.map((item) => ({
    ...item,
    isOverdue: Boolean(item.nextMaintenanceDue && item.nextMaintenanceDue < now),
    healthRatio: getEquipmentHealthRatio(item.purchaseDate, item.usefulLifeMonths, now),
  }))
}

export interface CreateEquipmentInput {
  name: string
  categoryId?: string
  supplier?: string
  purchaseDate?: Date
  purchaseCost: number
  usefulLifeMonths: number
  maintenanceFrequencyMonths?: number
}

export async function createEquipment(input: CreateEquipmentInput) {
  return prisma.equipment.create({ data: { ...input, purchaseDate: input.purchaseDate ?? new Date() } })
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

export interface UpdateEquipmentInput {
  name: string
  brand?: string
  model?: string
  serialNumber?: string
  categoryId?: string
  supplier?: string
  maintenanceFrequencyMonths?: number
  status: EquipmentStatus
  lastMaintenanceAt?: Date
  notes?: string
}

/** Edición completa de la ficha técnica de un equipo (Estandarización CRUD). */
export async function updateEquipment(equipmentId: string, input: UpdateEquipmentInput) {
  return prisma.equipment.update({ where: { id: equipmentId }, data: input })
}

/** Borrado lógico: el equipo deja de listarse pero conserva su historial de mantenimiento. */
export async function softDeleteEquipment(equipmentId: string) {
  return prisma.equipment.update({ where: { id: equipmentId }, data: { deletedAt: new Date() } })
}

function addMonths(date: Date, months: number) {
  const result = new Date(date)
  result.setMonth(result.getMonth() + months)
  return result
}

export interface MaintenanceAlert {
  equipmentId: string
  name: string
  dueDate: Date
  isOverdue: boolean
}

/**
 * Próximos mantenimientos dentro de `withinDays` días (o ya vencidos). Prioriza
 * `nextMaintenanceDue` (fijado por logMaintenance); si el equipo nunca tuvo un
 * mantenimiento registrado, lo estima desde purchaseDate + maintenanceFrequencyMonths.
 */
export async function getUpcomingMaintenanceAlerts(withinDays = 14): Promise<MaintenanceAlert[]> {
  const equipment = await prisma.equipment.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      purchaseDate: true,
      lastMaintenanceAt: true,
      nextMaintenanceDue: true,
      maintenanceFrequencyMonths: true,
    },
  })

  const now = new Date()
  const horizon = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000)
  const alerts: MaintenanceAlert[] = []

  for (const item of equipment) {
    const dueDate =
      item.nextMaintenanceDue ??
      (item.maintenanceFrequencyMonths
        ? addMonths(item.lastMaintenanceAt ?? item.purchaseDate, item.maintenanceFrequencyMonths)
        : null)

    if (!dueDate || dueDate > horizon) continue

    alerts.push({ equipmentId: item.id, name: item.name, dueDate, isOverdue: dueDate < now })
  }

  return alerts.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
}
