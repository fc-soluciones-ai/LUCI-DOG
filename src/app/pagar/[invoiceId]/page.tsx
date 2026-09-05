import { notFound } from 'next/navigation'
import { getInvoiceForProofPage } from '@/modules/billing/invoices'
import { submitProofAction } from '@/modules/billing/actions'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  PAID: 'Pagado y verificado',
  PENDING_PROOF: 'Esperando tu comprobante',
  OVERDUE: 'Comprobante pendiente (vencido)',
}

export default async function ProofPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params
  const invoice = await getInvoiceForProofPage(invoiceId)
  if (!invoice) notFound()

  const alreadyPaid = invoice.status === 'PAID'

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Comprobante de pago</h1>
      <p className="mt-1 text-slate-600">
        {invoice.appointment.pet.name} — {invoice.appointment.service.name}
      </p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <p className="font-medium text-slate-900">Desglose</p>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          {invoice.items.map((item) => (
            <li key={item.id} className="flex justify-between">
              <span>{item.description}</span>
              <span>${Number(item.amount).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-medium text-slate-900">
          <span>Total</span>
          <span>${Number(invoice.total).toFixed(2)}</span>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-700">Estado</p>
        <p className="mt-1 text-sm text-slate-600">{STATUS_LABEL[invoice.status] ?? invoice.status}</p>
      </div>

      {alreadyPaid ? (
        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          Tu pago ya fue verificado. ¡Gracias! Ya puedes agendar tu próxima cita con normalidad.
        </div>
      ) : (
        <form action={submitProofAction.bind(null, invoice.id)} className="mt-6 space-y-3">
          <label className="block text-sm text-slate-600">
            Pega aquí el link de tu comprobante de transferencia (captura de pantalla subida a cualquier servicio de
            imágenes, o el link que te compartió tu banco).
            <input name="proofUrl" required defaultValue={invoice.proofUrl ?? ''} placeholder="https://..." className="input mt-1" />
          </label>
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Enviar comprobante
          </button>
          {invoice.proofUrl && (
            <p className="text-xs text-slate-500">
              Ya recibimos un comprobante tuyo, en revisión. Puedes reemplazarlo si es necesario.
            </p>
          )}
        </form>
      )}
    </main>
  )
}
