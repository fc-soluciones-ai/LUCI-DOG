import { NextResponse } from 'next/server'
import { dispatchDueNotifications } from '@/server/jobs/dispatch-notifications'

export async function POST() {
  const result = await dispatchDueNotifications()
  return NextResponse.json(result)
}
