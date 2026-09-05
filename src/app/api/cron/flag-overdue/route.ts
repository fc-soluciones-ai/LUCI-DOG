import { NextResponse } from 'next/server'
import { flagOverdueInvoices } from '@/modules/billing/invoices'

/** Pensado para correr diario: marca OVERDUE las facturas con comprobante pendiente hace >3 días. */
export async function POST() {
  const result = await flagOverdueInvoices()
  return NextResponse.json(result)
}
