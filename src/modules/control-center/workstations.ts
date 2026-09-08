import type { ServiceStageType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function listWorkstations(query?: string) {
  return prisma.workstation.findMany({
    where: query ? { name: { contains: query, mode: 'insensitive' } } : undefined,
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
  })
}

export interface CreateWorkstationInput {
  name: string
  category: ServiceStageType
  sortOrder?: number
}

export async function createWorkstation(input: CreateWorkstationInput) {
  return prisma.workstation.create({ data: input })
}

export async function setWorkstationActive(workstationId: string, active: boolean) {
  return prisma.workstation.update({ where: { id: workstationId }, data: { active } })
}

export interface UpdateWorkstationInput {
  name: string
  category: ServiceStageType
  sortOrder?: number
}

/** Edición de una estación existente (Estandarización CRUD). */
export async function updateWorkstation(workstationId: string, input: UpdateWorkstationInput) {
  return prisma.workstation.update({ where: { id: workstationId }, data: input })
}
