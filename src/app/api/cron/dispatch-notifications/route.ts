import { NextResponse, type NextRequest } from 'next/server'
import { dispatchDueNotifications } from '@/server/jobs/dispatch-notifications'
import { assertCronAuthorized } from '@/lib/cron/auth'

export async function POST(request: NextRequest) {
  const unauthorized = assertCronAuthorized(request)
  if (unauthorized) return unauthorized

  const result = await dispatchDueNotifications()
  return NextResponse.json(result)
}
