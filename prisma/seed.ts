import { PrismaClient, ServiceStageType } from '@prisma/client'

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

async function main() {
  let createdCount = 0

  for (const { stages, ...service } of SERVICES) {
    const exists = await prisma.service.findFirst({ where: { name: service.name } })
    if (exists) continue

    await prisma.service.create({
      data: {
        ...service,
        stageTemplates: { create: stages },
      },
    })
    createdCount++
  }

  console.log(`Seed completo: ${createdCount} servicios creados (${SERVICES.length - createdCount} ya existían).`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
