import type { ServiceStageType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function listWorkstations() {
  return prisma.workstation.findMany({ orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] })
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
