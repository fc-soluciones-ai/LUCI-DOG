import { requireRole } from '@/modules/auth/profile'
import { listClientInvoices } from '@/modules/client/portal'
import { InvoicePaymentModal } from '@/components/client/InvoicePaymentModal'
import { formatCRC } from '@/lib/currency'
import { getPaymentInfoText } from '@/modules/config/settings'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  PAID: 'Pagada',
  PENDING_PROOF: 'Esperando verificación',
  OVERDUE: 'Comprobante pendiente (vencido)',
  REJECTED: 'Comprobante rechazado',
}

const STATUS_COLOR: Record<string, string> = {
  PAID: 'bg-green-100 text-green-800',
  PENDING_PROOF: 'bg-amber-100 text-amber-800',
  OVERDUE: 'bg-red-100 text-red-800',
  REJECTED: 'bg-red-100 text-red-800',
}

const NEEDS_PAYMENT = new Set(['PENDING_PROOF', 'OVERDUE', 'REJECTED'])

export default async function ClientFacturasPage() {
  const profile = await requireRole(['CLIENT'])
  const invoices = await listClientInvoices(profile.tutorId!)
  const paymentInfoText = await getPaymentInfoText()

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
              {invoice.status === 'REJECTED' && invoice.rejectionReason && (
                <p className="mt-1 text-xs text-red-600">Motivo: {invoice.rejectionReason}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[invoice.status] ?? 'bg-slate-100 text-slate-500'}`}>
                {STATUS_LABEL[invoice.status] ?? invoice.status}
              </span>
              {NEEDS_PAYMENT.has(invoice.status) && (
                <InvoicePaymentModal
                  invoiceId={invoice.id}
                  paymentInfoText={paymentInfoText}
                  rejectionReason={invoice.status === 'REJECTED' ? invoice.rejectionReason : null}
                  triggerLabel={invoice.status === 'REJECTED' ? 'Volver a enviar' : 'Subir comprobante'}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
