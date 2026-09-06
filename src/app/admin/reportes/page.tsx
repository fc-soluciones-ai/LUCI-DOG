import { computeMonthlyFinancials } from '@/modules/finance/netProfit'
import {
  getInventoryPerformanceReport,
  getProfitabilityReport,
  getReceivablesReport,
  getRetentionReport,
  getTimeEfficiencyReport,
} from '@/modules/finance/reports'
import { listFixedExpenses } from '@/modules/finance/expenses'
import { createFixedExpenseAction, setFixedExpenseActiveAction } from '@/modules/finance/actions'
import { formatCRC } from '@/lib/currency'

export const dynamic = 'force-dynamic'

function money(n: number) {
  return formatCRC(n)
}

function pct(n: number) {
  return `${n.toFixed(1)}%`
}

const FREQUENCY_LABEL: Record<string, string> = { MONTHLY: 'Mensual', YEARLY: 'Anual', ONE_TIME: 'Único' }
const BILLING_LABEL: Record<string, string> = { PENDING_PROOF: 'Comprobante pendiente', OVERDUE: 'Vencido' }

export default async function ReportesPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams
  const monthDate = month ? new Date(`${month}-01T00:00:00`) : new Date()
  const monthValue = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`

  const [financials, profitability, timeEfficiency, inventory, retention, receivables, fixedExpenses] =
    await Promise.all([
      computeMonthlyFinancials(monthDate),
      getProfitabilityReport(monthDate),
      getTimeEfficiencyReport(monthDate),
      getInventoryPerformanceReport(monthDate),
      getRetentionReport(),
      getReceivablesReport(),
      listFixedExpenses(),
    ])

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Panel Ejecutivo</h1>
        <p className="text-slate-600">Inteligencia financiera y los 5 reportes de operación.</p>
      </div>

      <form method="get" className="flex items-center gap-2">
        <label className="text-sm text-slate-600">Mes:</label>
        <input type="month" name="month" defaultValue={monthValue} className="input max-w-xs" />
        <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">
          Ver
        </button>
      </form>

      {/* Utilidad Neta Mensual */}
      <section>
        <h2 className="text-lg font-medium text-slate-900">Utilidad Neta Mensual</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Ingresos</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{money(financials.totalRevenue)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Gastos fijos</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{money(financials.totalFixedExpenses)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Insumos</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{money(financials.totalSuppliesCost)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Depreciación</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{money(financials.totalDepreciation)}</p>
          </div>
          <div
            className={`rounded-lg border p-4 ${financials.netProfit >= 0 ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">Utilidad neta</p>
            <p className={`mt-1 text-xl font-semibold ${financials.netProfit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
              {money(financials.netProfit)}
            </p>
          </div>
        </div>
      </section>

      {/* Reporte 1 */}
      <section>
        <h2 className="text-lg font-medium text-slate-900">1. Margen de rentabilidad por servicio y raza</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          {[
            { title: 'Por servicio', rows: profitability.byService },
            { title: 'Por raza', rows: profitability.byBreed },
          ].map(({ title, rows }) => (
            <div key={title} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-sm font-medium text-slate-700">{title}</p>
              {rows.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">Sin facturas este mes.</p>
              ) : (
                <table className="mt-2 w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-slate-400">
                      <th className="py-1">Nombre</th>
                      <th className="py-1 text-right">Ingresos</th>
                      <th className="py-1 text-right">Margen</th>
                      <th className="py-1 text-right">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.name} className="border-t border-slate-100">
                        <td className="py-1">{row.name}</td>
                        <td className="py-1 text-right">{money(row.revenue)}</td>
                        <td className="py-1 text-right">{money(row.margin)}</td>
                        <td className="py-1 text-right">{pct(row.marginPct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Reporte 2 */}
      <section>
        <h2 className="text-lg font-medium text-slate-900">2. Eficiencia de tiempos y procrastinación en mesa</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">A tiempo</p>
            <p className="mt-1 text-xl font-semibold text-green-800">{timeEfficiency.onTrack}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Por vencer</p>
            <p className="mt-1 text-xl font-semibold text-amber-800">{timeEfficiency.warning}</p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Con atraso</p>
            <p className="mt-1 text-xl font-semibold text-red-800">{timeEfficiency.delayed}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Atraso promedio</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {Math.round(timeEfficiency.avgDelaySeconds / 60)} min
            </p>
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {timeEfficiency.total} etapas completadas este mes · {pct(timeEfficiency.onTrackPct)} a tiempo.
        </p>
      </section>

      {/* Reporte 3 */}
      <section>
        <h2 className="text-lg font-medium text-slate-900">3. Rendimiento y mermas de inventario</h2>
        {inventory.products.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Sin movimientos de inventario este mes.</p>
        ) : (
          <table className="mt-3 w-full rounded-lg border border-slate-200 bg-white text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="p-2">Producto</th>
                <th className="p-2 text-right">Consumo</th>
                <th className="p-2 text-right">Merma</th>
                <th className="p-2 text-right">% merma</th>
                <th className="p-2 text-right">Costo consumido</th>
              </tr>
            </thead>
            <tbody>
              {inventory.products.map((p) => (
                <tr key={p.name} className="border-t border-slate-100">
                  <td className="p-2">{p.name}</td>
                  <td className="p-2 text-right">
                    {p.consumption.toFixed(1)} {p.unit}
                  </td>
                  <td className="p-2 text-right">
                    {p.waste.toFixed(1)} {p.unit}
                  </td>
                  <td className="p-2 text-right">{pct(p.wastePct)}</td>
                  <td className="p-2 text-right">{money(p.costConsumed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {inventory.instrumentStatus.map((s) => (
            <span key={s.status} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              Instrumental {s.status}: {s.count}
            </span>
          ))}
        </div>
      </section>

      {/* Reporte 4 */}
      <section>
        <h2 className="text-lg font-medium text-slate-900">4. Retención de clientes y reactivación de inactivos</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Clientes totales</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{retention.totalTutors}</p>
          </div>
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Activos (60 días)</p>
            <p className="mt-1 text-xl font-semibold text-green-800">{retention.activeCount}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Inactivos</p>
            <p className="mt-1 text-xl font-semibold text-amber-800">{retention.inactiveCount}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Tasa de retención</p>
            <p className="mt-1 text-xl font-semibold text-slate-900">{pct(retention.retentionRate)}</p>
          </div>
        </div>
        {retention.inactiveTutors.length > 0 && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-sm font-medium text-slate-700">Candidatos a reactivación</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-600">
              {retention.inactiveTutors.slice(0, 10).map((t) => (
                <li key={t.id} className="flex justify-between">
                  <span>
                    {t.fullName} · {t.phoneWhatsApp}
                  </span>
                  <span className="text-slate-400">
                    {t.lastAppointment
                      ? `Última cita: ${t.lastAppointment.toLocaleDateString('es-MX')}`
                      : 'Sin citas todavía'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Reporte 5 */}
      <section>
        <h2 className="text-lg font-medium text-slate-900">5. Cuentas por cobrar y morosidad</h2>
        <p className="mt-1 text-sm text-slate-600">
          Total por cobrar: <strong>{money(receivables.totalReceivable)}</strong> en {receivables.count} factura(s).
        </p>
        {receivables.invoices.length > 0 && (
          <table className="mt-3 w-full rounded-lg border border-slate-200 bg-white text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                <th className="p-2">Cliente</th>
                <th className="p-2">Mascota</th>
                <th className="p-2 text-right">Total</th>
                <th className="p-2 text-right">Días pendiente</th>
                <th className="p-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {receivables.invoices.map((invoice) => (
                <tr key={invoice.id} className="border-t border-slate-100">
                  <td className="p-2">{invoice.tutorName}</td>
                  <td className="p-2">{invoice.petName}</td>
                  <td className="p-2 text-right">{money(invoice.total)}</td>
                  <td className="p-2 text-right">{invoice.daysPending}</td>
                  <td className="p-2">{BILLING_LABEL[invoice.status] ?? invoice.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Gastos fijos */}
      <section>
        <h2 className="text-lg font-medium text-slate-900">Gastos fijos</h2>
        <div className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {fixedExpenses.length === 0 && <p className="p-4 text-sm text-slate-500">Sin gastos fijos registrados.</p>}
          {fixedExpenses.map((expense) => (
            <div key={expense.id} className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-slate-900">{expense.name}</p>
                <p className="text-sm text-slate-500">
                  {expense.category} · {money(Number(expense.amount))} · {FREQUENCY_LABEL[expense.frequency]}
                </p>
              </div>
              <form action={setFixedExpenseActiveAction.bind(null, expense.id, !expense.active)}>
                <button
                  type="submit"
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    expense.active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {expense.active ? 'Activo' : 'Inactivo'}
                </button>
              </form>
            </div>
          ))}
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">+ Nuevo gasto fijo</summary>
          <form action={createFixedExpenseAction} className="mt-3 grid max-w-lg gap-2 sm:grid-cols-2">
            <input name="name" required placeholder='Nombre (ej. "Renta del local")' className="input" />
            <input name="category" placeholder="Categoría (ej. Renta)" className="input" />
            <input name="amount" type="number" step="0.01" required placeholder="Monto" className="input" />
            <select name="frequency" defaultValue="MONTHLY" className="input">
              <option value="MONTHLY">Mensual</option>
              <option value="YEARLY">Anual</option>
              <option value="ONE_TIME">Único</option>
            </select>
            <input name="effectiveFrom" type="date" className="input sm:col-span-2" />
            <button type="submit" className="col-span-full w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Crear gasto fijo
            </button>
          </form>
        </details>
      </section>
    </div>
  )
}
