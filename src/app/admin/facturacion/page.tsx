import { getInvoicesNeedingAttention, getPendingClosures } from '@/modules/billing/invoices'
import { closeServiceAction, manuallyUnblockAction, verifyProofAction } from '@/modules/billing/actions'

export const dynamic = 'force-dynamic'

const BILLING_LABEL: Record<string, string> = {
  PENDING_PROOF: 'Comprobante pendiente',
  OVERDUE: 'Vencido',
  BLOCKED: 'Bloqueado',
}

const BILLING_COLOR: Record<string, string> = {
  PENDING_PROOF: 'bg-amber-100 text-amber-800',
  OVERDUE: 'bg-red-100 text-red-800',
  BLOCKED: 'bg-red-100 text-red-800',
}

export default async function FacturacionPage() {
  const [pendingClosures, invoicesNeedingAttention] = await Promise.all([
    getPendingClosures(),
    getInvoicesNeedingAttention(),
  ])

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Facturación y cobro</h1>
        <p className="text-slate-600">
          Cierre de servicio con foto + desglose por WhatsApp, y verificación de comprobantes (regla anti-morosidad).
        </p>
      </div>

      <section>
        <h2 className="text-lg font-medium text-slate-900">Cierres de servicio pendientes</h2>
        {pendingClosures.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No hay citas completadas pendientes de facturar.</p>
        ) : (
          <div className="mt-3 space-y-4">
            {pendingClosures.map((appointment) => (
              <form
                key={appointment.id}
                action={closeServiceAction.bind(null, appointment.id)}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <p className="font-medium text-slate-900">
                  {appointment.pet.name} · {appointment.service.name}
                </p>
                <p className="text-sm text-slate-500">
                  {appointment.tutor.fullName} ·{' '}
                  {appointment.actualEnd?.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                </p>

                <div className="mt-3 space-y-2">
                  <p className="text-sm font-medium text-slate-700">Desglose de cuenta</p>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        name="itemDescription"
                        placeholder={i === 0 ? `Servicio: ${appointment.service.name}` : 'Concepto adicional (opcional)'}
                        defaultValue={i === 0 ? appointment.service.name : ''}
                        className="input flex-1 text-sm"
                      />
                      <input
                        name="itemAmount"
                        type="number"
                        step="0.01"
                        placeholder="Monto"
                        defaultValue={i === 0 ? Number(appointment.quoteEstimated ?? 0) : ''}
                        className="input w-32 text-sm"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <input name="finishedPhotoUrl" placeholder="URL de la foto del trabajo terminado" className="input text-sm" />
                  <select name="paymentMethod" defaultValue="TRANSFER" className="input text-sm">
                    <option value="CASH">Efectivo (se marca pagado de inmediato)</option>
                    <option value="TRANSFER">Transferencia (requiere comprobante)</option>
                    <option value="CARD">Tarjeta (requiere comprobante)</option>
                    <option value="OTHER">Otro (requiere comprobante)</option>
                  </select>
                </div>

                <button type="submit" className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                  Cerrar servicio y enviar por WhatsApp
                </button>
              </form>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-900">Comprobantes pendientes de verificar</h2>
        {invoicesNeedingAttention.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Sin comprobantes pendientes.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {invoicesNeedingAttention.map((invoice) => (
              <div key={invoice.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {invoice.tutor.fullName} — {invoice.appointment.pet.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      Total: ${Number(invoice.total).toFixed(2)} ·{' '}
                      {invoice.proofUrl ? (
                        <a href={invoice.proofUrl} target="_blank" rel="noreferrer" className="text-slate-700 underline">
                          Ver comprobante subido
                        </a>
                      ) : (
                        'Sin comprobante subido todavía'
                      )}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${BILLING_COLOR[invoice.status]}`}>
                    {BILLING_LABEL[invoice.status] ?? invoice.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={verifyProofAction.bind(null, invoice.id)} className="flex gap-2">
                    <input name="verifiedBy" required placeholder="Tu nombre" className="input w-40 text-xs" />
                    <button type="submit" className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white">
                      Verificar comprobante
                    </button>
                  </form>
                  <form action={manuallyUnblockAction.bind(null, invoice.tutorId)} className="flex gap-2">
                    <input name="unblockedBy" required placeholder="Tu nombre" className="input w-40 text-xs" />
                    <button type="submit" className="rounded bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800">
                      Desautorizar bloqueo manualmente
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
