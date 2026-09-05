'use server'

import { revalidatePath } from 'next/cache'
import { generateDailyPrepPlan } from './planner'

export async function regeneratePlanAction(forDateIso: string) {
  await generateDailyPrepPlan(new Date(forDateIso))
  revalidatePath('/admin/mise-en-place')
}
