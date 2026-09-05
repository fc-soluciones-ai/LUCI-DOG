import { InstrumentType, PrismaClient, Role, ServiceStageType } from '@prisma/client'

const prisma = new PrismaClient()

const SERVICES: Array<{
  name: string
  description: string
  basePrice: number
  standardDurationMin: number
  stages: Array<{ stageType: ServiceStageType; order: number; standardDurationMin: number }>
}> = [
  {
    name: 'Baño y secado básico',
    description: 'Baño con shampoo neutro, secado y cepillado.',
    basePrice: 350,
    standardDurationMin: 60,
    stages: [
      { stageType: ServiceStageType.BATH, order: 1, standardDurationMin: 30 },
      { stageType: ServiceStageType.DRYING, order: 2, standardDurationMin: 30 },
    ],
  },
  {
    name: 'Baño y corte de raza',
    description: 'Baño completo + corte según estándar de raza.',
    basePrice: 550,
    standardDurationMin: 100,
    stages: [
      { stageType: ServiceStageType.BATH, order: 1, standardDurationMin: 30 },
      { stageType: ServiceStageType.DRYING, order: 2, standardDurationMin: 30 },
      { stageType: ServiceStageType.HAIRCUT, order: 3, standardDurationMin: 40 },
    ],
  },
  {
    name: 'Deshedding (control de muda)',
    description: 'Tratamiento para reducir la caída de pelo en doble manto.',
    basePrice: 480,
    standardDurationMin: 90,
    stages: [
      { stageType: ServiceStageType.BATH, order: 1, standardDurationMin: 30 },
      { stageType: ServiceStageType.DESHEDDING, order: 2, standardDurationMin: 45 },
      { stageType: ServiceStageType.DRYING, order: 3, standardDurationMin: 15 },
    ],
  },
]

const PRODUCTS: Array<{ name: string; stockCurrent: number; stockMin: number; costPerUnit: number }> = [
  { name: 'Shampoo Neutro', stockCurrent: 3000, stockMin: 500, costPerUnit: 0.15 },
  { name: 'Acondicionador Deshedding', stockCurrent: 2000, stockMin: 400, costPerUnit: 0.2 },
  { name: 'Mascarilla Hidratante', stockCurrent: 1000, stockMin: 200, costPerUnit: 0.35 },
]

// serviceName -> fórmulas a asociar (por nombre de producto ya creado arriba)
const FORMULAS: Array<{
  serviceName: string
  productName: string
  name: string
  dilutionRatio: string
  baseMlPerUse: number
}> = [
  {
    serviceName: 'Baño y secado básico',
    productName: 'Shampoo Neutro',
    name: 'Shampoo Neutro',
    dilutionRatio: '1:8',
    baseMlPerUse: 40,
  },
  {
    serviceName: 'Baño y corte de raza',
    productName: 'Shampoo Neutro',
    name: 'Shampoo Neutro',
    dilutionRatio: '1:8',
    baseMlPerUse: 40,
  },
  {
    serviceName: 'Baño y corte de raza',
    productName: 'Mascarilla Hidratante',
    name: 'Mascarilla Hidratante',
    dilutionRatio: 'sin diluir',
    baseMlPerUse: 25,
  },
  {
    serviceName: 'Deshedding (control de muda)',
    productName: 'Acondicionador Deshedding',
    name: 'Acondicionador Deshedding',
    dilutionRatio: '1:4',
    baseMlPerUse: 60,
  },
]

const GROOMERS: Array<{ fullName: string; phone: string }> = [
  { fullName: 'Ana Torres', phone: '+5215500000001' },
  { fullName: 'Luis Fernández', phone: '+5215500000002' },
]

const INSTRUMENTS: Array<{ name: string; type: InstrumentType; expectedLifeHours: number }> = [
  { name: 'Tijera recta 7"', type: InstrumentType.SCISSORS, expectedLifeHours: 500 },
  { name: 'Peine guía 6mm', type: InstrumentType.COMB_GUIDE, expectedLifeHours: 800 },
  { name: 'Rastrillo deshedding', type: InstrumentType.RAKE, expectedLifeHours: 400 },
  { name: 'Cuchilla #10', type: InstrumentType.BLADE, expectedLifeHours: 150 },
]

async function main() {
  let servicesCreated = 0
  for (const { stages, ...service } of SERVICES) {
    const exists = await prisma.service.findFirst({ where: { name: service.name } })
    if (exists) continue
    await prisma.service.create({ data: { ...service, stageTemplates: { create: stages } } })
    servicesCreated++
  }

  let productsCreated = 0
  for (const product of PRODUCTS) {
    const exists = await prisma.product.findFirst({ where: { name: product.name } })
    if (exists) continue
    await prisma.product.create({ data: product })
    productsCreated++
  }

  let formulasCreated = 0
  for (const formula of FORMULAS) {
    const service = await prisma.service.findFirstOrThrow({ where: { name: formula.serviceName } })
    const product = await prisma.product.findFirstOrThrow({ where: { name: formula.productName } })

    const exists = await prisma.formula.findFirst({ where: { name: formula.name, serviceId: service.id } })
    if (exists) continue

    await prisma.formula.create({
      data: {
        serviceId: service.id,
        productId: product.id,
        name: formula.name,
        dilutionRatio: formula.dilutionRatio,
        baseMlPerUse: formula.baseMlPerUse,
      },
    })
    formulasCreated++
  }

  let instrumentsCreated = 0
  for (const instrument of INSTRUMENTS) {
    const exists = await prisma.instrument.findFirst({ where: { name: instrument.name } })
    if (exists) continue
    await prisma.instrument.create({
      data: {
        name: instrument.name,
        type: instrument.type,
        purchaseDate: new Date(),
        expectedLifeHours: instrument.expectedLifeHours,
      },
    })
    instrumentsCreated++
  }

  let groomersCreated = 0
  for (const groomer of GROOMERS) {
    const exists = await prisma.staff.findFirst({ where: { fullName: groomer.fullName } })
    if (exists) continue
    await prisma.staff.create({ data: { fullName: groomer.fullName, phone: groomer.phone, role: Role.GROOMER } })
    groomersCreated++
  }

  console.log(
    `Seed completo: ${servicesCreated} servicios, ${productsCreated} productos, ${formulasCreated} fórmulas, ${instrumentsCreated} instrumentos, ${groomersCreated} groomers creados (el resto ya existía).`
  )
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
