import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateRecurringBatch } from '@/modules/agenda/recurrence'

/**
 * Genera el lote de próximas citas para programaciones recurrentes (7/15/21/30 días).
 * Pensado para invocarse desde un cron diario. Body opcional: { scheduleId, count }.
 * Sin scheduleId, procesa todas las programaciones activas.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const { scheduleId, count } = body as { scheduleId?: string; count?: number }

  if (scheduleId) {
    const result = await generateRecurringBatch(prisma, scheduleId, count ?? 4)
    return NextResponse.json(result)
  }

  const activeSchedules = await prisma.recurringSchedule.findMany({
    where: { active: true },
    select: { id: true },
  })

  const results = []
  for (const schedule of activeSchedules) {
    results.push({
      scheduleId: schedule.id,
      ...(await generateRecurringBatch(prisma, schedule.id, count ?? 4)),
    })
  }

  return NextResponse.json({ schedules: results })
}
