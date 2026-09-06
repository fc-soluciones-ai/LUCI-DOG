import Link from 'next/link'
import { requireRole } from '@/modules/auth/profile'
import { listClientInvoices } from '@/modules/client/portal'
import { formatCRC } from '@/lib/currency'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  PAID: 'Pagada',
  PENDING_PROOF: 'Esperando tu comprobante',
  OVERDUE: 'Comprobante pendiente (vencido)',
}

const STATUS_COLOR: Record<string, string> = {
  PAID: 'bg-green-100 text-green-800',
  PENDING_PROOF: 'bg-amber-100 text-amber-800',
  OVERDUE: 'bg-red-100 text-red-800',
}

export default async function ClientFacturasPage() {
  const profile = await requireRole(['CLIENT'])
  const invoices = await listClientInvoices(profile.tutorId!)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Mis Facturas</h1>

      <div className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {invoices.length === 0 && <p className="p-4 text-sm text-slate-500">Sin facturas todavía.</p>}
        {invoices.map((invoice) => (
          <div key={invoice.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium text-slate-900">
                {invoice.appointment.pet.name} — {invoice.appointment.service.name}
              </p>
              <p className="text-sm text-slate-500">
                {invoice.createdAt.toLocaleDateString('es-CR', { dateStyle: 'medium' })} · {formatCRC(invoice.total)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[invoice.status] ?? 'bg-slate-100 text-slate-500'}`}>
                {STATUS_LABEL[invoice.status] ?? invoice.status}
              </span>
              {invoice.status !== 'PAID' && (
                <Link href={`/pagar/${invoice.id}`} className="text-sm text-slate-600 hover:text-slate-900 hover:underline">
                  Subir comprobante
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
