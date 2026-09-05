import { AppointmentStatus, InventoryTxType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { sizeMultiplier, STAGE_INSTRUMENT_TYPES } from '@/modules/shared/grooming'
import { computeInstrumentStatus } from './instruments'

/**
 * Citas COMPLETED sin bitácora de fórmulas registrada todavía — pendientes
 * de cerrar su consumo de inventario (Módulo 5). Se usa `formulaUsages: none`
 * como marca de "no cerrado"; asume que todo servicio con fórmulas
 * configuradas debe terminar con al menos una FormulaUsage.
 */
export async function getPendingInventoryClosures() {
  return prisma.appointment.findMany({
    where: {
      status: AppointmentStatus.COMPLETED,
      formulaUsages: { none: {} },
    },
    include: {
      pet: true,
      tutor: true,
      service: {
        include: {
          formulas: { include: { product: true } },
          stageTemplates: true,
        },
      },
    },
    orderBy: { actualEnd: 'desc' },
  })
}

/** Instrumental sugerido para el cierre, con la duración estándar de su etapa como default. */
export function suggestedInstrumentTypesForService(stageTemplates: { stageType: string; standardDurationMin: number }[]) {
  const suggestions = new Map<string, number>()
  for (const stage of stageTemplates) {
    const types = STAGE_INSTRUMENT_TYPES[stage.stageType as keyof typeof STAGE_INSTRUMENT_TYPES] ?? []
    for (const type of types) {
      suggestions.set(type, Math.max(suggestions.get(type) ?? 0, stage.standardDurationMin))
    }
  }
  return suggestions
}

export function suggestedMlForFormula(baseMlPerUse: number, sizeCategory: string | null) {
  return Math.round(baseMlPerUse * sizeMultiplier(sizeCategory) * 100) / 100
}

/**
 * Cierra el inventario de una cita: registra la bitácora cosmética
 * (FormulaUsage), descuenta el stock de los productos consumidos, y
 * actualiza horas/usos del instrumental empleado (Módulo 5).
 */
export async function closeServiceInventory(
  appointmentId: string,
  formulaEntries: { formulaId: string; mlUsed: number }[],
  instrumentEntries: { instrumentId: string; minutesUsed: number }[]
) {
  return prisma.$transaction(async (tx) => {
    for (const entry of formulaEntries) {
      if (entry.mlUsed <= 0) continue

      const formula = await tx.formula.findUniqueOrThrow({ where: { id: entry.formulaId } })

      await tx.formulaUsage.create({
        data: { appointmentId, formulaId: entry.formulaId, mlUsed: entry.mlUsed },
      })

      await tx.product.update({
        where: { id: formula.productId },
        data: { stockCurrent: { decrement: entry.mlUsed } },
      })

      await tx.inventoryTransaction.create({
        data: {
          productId: formula.productId,
          type: InventoryTxType.CONSUMPTION,
          quantity: entry.mlUsed,
          relatedAppointmentId: appointmentId,
        },
      })
    }

    for (const entry of instrumentEntries) {
      if (entry.minutesUsed <= 0) continue

      const instrument = await tx.instrument.findUniqueOrThrow({ where: { id: entry.instrumentId } })

      await tx.instrumentUsageLog.create({
        data: { instrumentId: entry.instrumentId, appointmentId, minutesUsed: entry.minutesUsed },
      })

      const usedHours = Number(instrument.usedHours) + entry.minutesUsed / 60
      const usedCount = instrument.usedCount + 1
      const status = computeInstrumentStatus({
        status: instrument.status,
        usedHours,
        expectedLifeHours: instrument.expectedLifeHours ? Number(instrument.expectedLifeHours) : null,
        usedCount,
        expectedLifeUses: instrument.expectedLifeUses,
      })

      await tx.instrument.update({
        where: { id: entry.instrumentId },
        data: { usedHours, usedCount, status },
      })
    }

    return tx.appointment.findUniqueOrThrow({ where: { id: appointmentId } })
  })
}
