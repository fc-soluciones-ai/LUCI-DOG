import { NextResponse } from 'next/server'
import { generateDailyPrepPlan } from '@/modules/mise-en-place/planner'

/**
 * Pensado para correr vía cron todos los días a las 20:00 hrs: genera el
 * plan de mise en place para la agenda de MAÑANA (Módulo 3).
 */
export async function POST() {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  const plan = await generateDailyPrepPlan(tomorrow)
  return NextResponse.json(plan)
}
