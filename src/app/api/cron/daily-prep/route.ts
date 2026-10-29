import { NextResponse, type NextRequest } from 'next/server'
import { generateDailyPrepPlan } from '@/modules/mise-en-place/planner'
import { assertCronAuthorized } from '@/lib/cron/auth'

/**
 * Pensado para correr vía cron todos los días a las 20:00 hrs: genera el
 * plan de mise en place para la agenda de MAÑANA (Módulo 3).
 */
export async function POST(request: NextRequest) {
  const unauthorized = assertCronAuthorized(request)
  if (unauthorized) return unauthorized

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  const plan = await generateDailyPrepPlan(tomorrow)
  return NextResponse.json(plan)
}
