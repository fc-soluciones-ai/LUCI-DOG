import { NextResponse, type NextRequest } from 'next/server'
import { flagOverdueInvoices } from '@/modules/billing/invoices'
import { assertCronAuthorized } from '@/lib/cron/auth'

/** Pensado para correr diario: marca OVERDUE las facturas con comprobante pendiente hace >3 días. */
export async function POST(request: NextRequest) {
  const unauthorized = assertCronAuthorized(request)
  if (unauthorized) return unauthorized

  const result = await flagOverdueInvoices()
  return NextResponse.json(result)
}
