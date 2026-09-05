import { InstrumentStatus, type InstrumentType } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * Vida útil restante (Módulo 5): alerta preventiva de afilado/reemplazo al
 * 20% de vida útil restante, por horas de uso o por número de usos.
 */
export function computeInstrumentStatus(instrument: {
  status: InstrumentStatus
  usedHours: number
  expectedLifeHours: number | null
  usedCount: number
  expectedLifeUses: number | null
}): InstrumentStatus {
  if (instrument.status === InstrumentStatus.RETIRED) return InstrumentStatus.RETIRED

  if (instrument.expectedLifeHours) {
    const remainingRatio = 1 - instrument.usedHours / instrument.expectedLifeHours
    if (remainingRatio <= 0) return InstrumentStatus.NEEDS_REPLACEMENT
    if (remainingRatio <= 0.2) return InstrumentStatus.NEEDS_SHARPENING
    return InstrumentStatus.OK
  }

  if (instrument.expectedLifeUses) {
    const remainingRatio = 1 - instrument.usedCount / instrument.expectedLifeUses
    if (remainingRatio <= 0) return InstrumentStatus.NEEDS_REPLACEMENT
    if (remainingRatio <= 0.2) return InstrumentStatus.NEEDS_SHARPENING
    return InstrumentStatus.OK
  }

  return InstrumentStatus.OK
}

export async function listInstruments() {
  const instruments = await prisma.instrument.findMany({ orderBy: { name: 'asc' } })
  return instruments.map((instrument) => {
    const life = instrument.expectedLifeHours ? Number(instrument.expectedLifeHours) : null
    const used = Number(instrument.usedHours)
    const remainingRatio = life ? Math.max(0, 1 - used / life) : null
    return { ...instrument, remainingRatio }
  })
}

export interface CreateInstrumentInput {
  name: string
  type: InstrumentType
  expectedLifeHours?: number
  expectedLifeUses?: number
}

export async function createInstrument(input: CreateInstrumentInput) {
  return prisma.instrument.create({
    data: {
      name: input.name,
      type: input.type,
      purchaseDate: new Date(),
      expectedLifeHours: input.expectedLifeHours,
      expectedLifeUses: input.expectedLifeUses,
    },
  })
}

/** Afilado/servicio del instrumento: reinicia el contador de horas de uso. */
export async function markInstrumentSharpened(instrumentId: string) {
  return prisma.instrument.update({
    where: { id: instrumentId },
    data: { usedHours: 0, usedCount: 0, status: InstrumentStatus.OK, lastMaintenanceAt: new Date() },
  })
}

export async function retireInstrument(instrumentId: string) {
  return prisma.instrument.update({ where: { id: instrumentId }, data: { status: InstrumentStatus.RETIRED } })
}
