import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const services = await prisma.service.findMany({
    where: { active: true },
    select: { id: true, name: true, description: true, basePrice: true, standardDurationMin: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(services)
}
