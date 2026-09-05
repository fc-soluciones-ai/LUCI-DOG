import { AppointmentStatus, InstrumentStatus, InstrumentType, PrepItemType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { STAGE_INSTRUMENT_TYPES, sizeMultiplier } from '@/modules/shared/grooming'

const INSTRUMENT_TYPE_LABEL: Record<InstrumentType, string> = {
  BLADE: 'Cuchillas',
  COMB_GUIDE: 'Peines guía',
  SCISSORS: 'Tijeras',
  RAKE: 'Rastrillos',
  OTHER: 'Otro instrumental',
}

function dayRange(date: Date) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

async function fetchAppointmentsForDay(start: Date, end: Date) {
  return prisma.appointment.findMany({
    where: {
      scheduledStart: { gte: start, lt: end },
      status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
    },
    include: {
      pet: { include: { clinicalRecord: true } },
      service: {
        include: {
          formulas: { include: { product: true } },
          stageTemplates: true,
        },
      },
    },
  })
}

type DayAppointment = Awaited<ReturnType<typeof fetchAppointmentsForDay>>[number]
type DayFormula = DayAppointment['service']['formulas'][number]

/**
 * Genera (o regenera) el plan de mise en place para `forDate`: procesa la
 * agenda de ese día y calcula mezclas cosméticas en ml, instrumental
 * necesario y equipo de seguridad, con alertas si la demanda proyectada
 * supera el stock disponible.
 */
export async function generateDailyPrepPlan(forDate: Date) {
  const { start, end } = dayRange(forDate)
  const appointments = await fetchAppointmentsForDay(start, end)

  // --- Fórmulas cosméticas ---
  const formulaDemand = new Map<string, { formula: DayFormula; ml: number }>()
  const productDemand = new Map<string, number>()

  for (const appointment of appointments) {
    const multiplier = sizeMultiplier(appointment.pet.sizeCategory)
    for (const formula of appointment.service.formulas) {
      const ml = Number(formula.baseMlPerUse) * multiplier
      const entry = formulaDemand.get(formula.id)
      formulaDemand.set(formula.id, { formula, ml: (entry?.ml ?? 0) + ml })
      productDemand.set(formula.productId, (productDemand.get(formula.productId) ?? 0) + ml)
    }
  }

  // --- Instrumental necesario ---
  const instrumentTypeDemand = new Map<InstrumentType, number>()
  for (const appointment of appointments) {
    const typesNeeded = new Set<InstrumentType>()
    for (const stage of appointment.service.stageTemplates) {
      for (const type of STAGE_INSTRUMENT_TYPES[stage.stageType] ?? []) {
        typesNeeded.add(type)
      }
    }
    for (const type of typesNeeded) {
      instrumentTypeDemand.set(type, (instrumentTypeDemand.get(type) ?? 0) + 1)
    }
  }

  const availableInstrumentsByType = await prisma.instrument.groupBy({
    by: ['type'],
    where: { status: InstrumentStatus.OK },
    _count: { _all: true },
  })
  const availableByType = new Map(availableInstrumentsByType.map((row) => [row.type, row._count._all]))

  // --- Equipo de seguridad (Happy Hoodies, bozales) ---
  const safetyItems: string[] = []
  for (const appointment of appointments) {
    if (appointment.pet.clinicalRecord?.requiresHappyHoodie) {
      safetyItems.push(`Happy Hoodie para ${appointment.pet.name}`)
    }
    if (appointment.pet.clinicalRecord?.requiresMuzzle) {
      safetyItems.push(`Bozal para ${appointment.pet.name}`)
    }
  }

  return prisma.$transaction(async (tx) => {
    await tx.dailyPrepPlan.deleteMany({ where: { forDate: start } })
    const plan = await tx.dailyPrepPlan.create({ data: { forDate: start } })

    const items: {
      planId: string
      type: PrepItemType
      productId?: string
      instrumentId?: string
      description: string
      quantityNeeded: number
      stockAvailable: number
      stockAlert: boolean
    }[] = []

    for (const { formula, ml } of formulaDemand.values()) {
      const productTotalMl = productDemand.get(formula.productId) ?? ml
      const stockCurrent = Number(formula.product.stockCurrent)
      items.push({
        planId: plan.id,
        type: PrepItemType.FORMULA,
        productId: formula.productId,
        description: `${formula.name} (${formula.dilutionRatio ?? 's/dilución'})`,
        quantityNeeded: ml,
        stockAvailable: stockCurrent,
        stockAlert: productTotalMl > stockCurrent,
      })
    }

    for (const [type, count] of instrumentTypeDemand.entries()) {
      const available = availableByType.get(type) ?? 0
      items.push({
        planId: plan.id,
        type: PrepItemType.INSTRUMENT,
        description: `${INSTRUMENT_TYPE_LABEL[type]} — se usarán en ${count} cita${count === 1 ? '' : 's'}`,
        quantityNeeded: count,
        stockAvailable: available,
        stockAlert: available === 0,
      })
    }

    for (const description of safetyItems) {
      items.push({
        planId: plan.id,
        type: PrepItemType.SAFETY_EQUIPMENT,
        description,
        quantityNeeded: 1,
        stockAvailable: 1,
        stockAlert: false,
      })
    }

    if (items.length > 0) {
      await tx.dailyPrepItem.createMany({ data: items })
    }

    return tx.dailyPrepPlan.findUniqueOrThrow({
      where: { id: plan.id },
      include: { items: { orderBy: { type: 'asc' } } },
    })
  })
}

export async function getDailyPrepPlan(forDate: Date) {
  const { start } = dayRange(forDate)
  return prisma.dailyPrepPlan.findUnique({
    where: { forDate: start },
    include: { items: { orderBy: { type: 'asc' } } },
  })
}
