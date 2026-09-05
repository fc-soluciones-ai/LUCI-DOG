import { InstrumentStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { listProducts } from '@/modules/inventory/products'
import { listInstruments } from '@/modules/inventory/instruments'
import { getPendingInventoryClosures, suggestedInstrumentTypesForService, suggestedMlForFormula } from '@/modules/inventory/serviceClosure'
import {
  closeServiceInventoryAction,
  createInstrumentAction,
  createProductAction,
  markInstrumentSharpenedAction,
  restockProductAction,
  retireInstrumentAction,
} from '@/modules/inventory/actions'

export const dynamic = 'force-dynamic'

const INSTRUMENT_TYPE_LABEL: Record<string, string> = {
  BLADE: 'Cuchilla',
  COMB_GUIDE: 'Peine guía',
  SCISSORS: 'Tijeras',
  RAKE: 'Rastrillo',
  OTHER: 'Otro',
}

export default async function InventarioPage() {
  const [products, instruments, pendingClosures, availableInstruments] = await Promise.all([
    listProducts(),
    listInstruments(),
    getPendingInventoryClosures(),
    prisma.instrument.findMany({ where: { status: InstrumentStatus.OK } }),
  ])

  const instrumentsByType = new Map<string, typeof availableInstruments>()
  for (const instrument of availableInstruments) {
    const list = instrumentsByType.get(instrument.type) ?? []
    list.push(instrument)
    instrumentsByType.set(instrument.type, list)
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Inventario</h1>
        <p className="text-slate-600">Consumibles, instrumental y cierres de servicio pendientes.</p>
      </div>

      {/* Cierres de servicio pendientes */}
      <section>
        <h2 className="text-lg font-medium text-slate-900">Cierres de servicio pendientes</h2>
        {pendingClosures.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No hay citas completadas pendientes de registrar consumo.</p>
        ) : (
          <div className="mt-3 space-y-4">
            {pendingClosures.map((appointment) => {
              const instrumentSuggestions = suggestedInstrumentTypesForService(appointment.service.stageTemplates)

              return (
                <form
                  key={appointment.id}
                  action={closeServiceInventoryAction.bind(null, appointment.id)}
                  className="rounded-lg border border-slate-200 bg-white p-4"
                >
                  <p className="font-medium text-slate-900">
                    {appointment.pet.name} · {appointment.service.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {appointment.tutor.fullName} ·{' '}
                    {appointment.actualEnd?.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>

                  {appointment.service.formulas.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-slate-700">Fórmulas usadas (ml)</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {appointment.service.formulas.map((formula) => (
                          <label key={formula.id} className="text-xs text-slate-600">
                            {formula.name}
                            <input
                              type="number"
                              step="0.1"
                              name={`formula_${formula.id}`}
                              defaultValue={suggestedMlForFormula(Number(formula.baseMlPerUse), appointment.pet.sizeCategory)}
                              className="input mt-1"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {instrumentSuggestions.size > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium text-slate-700">Instrumental usado</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {Array.from(instrumentSuggestions.entries()).map(([type, suggestedMinutes]) => (
                          <div key={type} className="flex gap-2">
                            <select name={`instrument_${type}`} defaultValue="" className="input text-xs">
                              <option value="">{INSTRUMENT_TYPE_LABEL[type] ?? type} (ninguno)</option>
                              {(instrumentsByType.get(type) ?? []).map((instrument) => (
                                <option key={instrument.id} value={instrument.id}>
                                  {instrument.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              name={`minutes_${type}`}
                              defaultValue={suggestedMinutes}
                              className="input w-24 text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button type="submit" className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                    Registrar consumo y cerrar
                  </button>
                </form>
              )
            })}
          </div>
        )}
      </section>

      {/* Productos */}
      <section>
        <h2 className="text-lg font-medium text-slate-900">Productos</h2>
        <div className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {products.map((product) => {
            const belowMin = Number(product.stockCurrent) < Number(product.stockMin)
            return (
              <div key={product.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-slate-900">{product.name}</p>
                  <p className="text-sm text-slate-500">
                    Stock: {Number(product.stockCurrent).toFixed(1)} {product.unit} · Mínimo:{' '}
                    {Number(product.stockMin).toFixed(1)} {product.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {belowMin && (
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800">
                      Bajo mínimo
                    </span>
                  )}
                  <form action={restockProductAction.bind(null, product.id)} className="flex gap-1">
                    <input type="number" name="quantity" placeholder="cantidad" className="input w-24 text-xs" />
                    <button type="submit" className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white">
                      Reabastecer
                    </button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">+ Nuevo producto</summary>
          <form action={createProductAction} className="mt-3 grid max-w-lg gap-2 sm:grid-cols-2">
            <input name="name" required placeholder="Nombre" className="input" />
            <select name="unit" defaultValue="ML" className="input">
              <option value="ML">Mililitros</option>
              <option value="GRAM">Gramos</option>
              <option value="UNIT">Unidades</option>
            </select>
            <input name="stockCurrent" type="number" step="0.1" placeholder="Stock actual" className="input" />
            <input name="stockMin" type="number" step="0.1" placeholder="Stock mínimo" className="input" />
            <input name="costPerUnit" type="number" step="0.0001" placeholder="Costo por unidad" className="input" />
            <input name="supplier" placeholder="Proveedor (opcional)" className="input" />
            <button type="submit" className="col-span-full w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Crear producto
            </button>
          </form>
        </details>
      </section>

      {/* Instrumental */}
      <section>
        <h2 className="text-lg font-medium text-slate-900">Instrumental</h2>
        <div className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {instruments.map((instrument) => {
            const pct = instrument.remainingRatio !== null ? Math.round(instrument.remainingRatio * 100) : null
            const statusColor =
              instrument.status === 'OK'
                ? 'bg-green-100 text-green-800'
                : instrument.status === 'NEEDS_SHARPENING'
                  ? 'bg-amber-100 text-amber-800'
                  : instrument.status === 'NEEDS_REPLACEMENT'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-slate-100 text-slate-600'

            return (
              <div key={instrument.id} className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-slate-900">
                    {instrument.name} <span className="text-xs text-slate-400">({instrument.type})</span>
                  </p>
                  <p className="text-sm text-slate-500">
                    {Number(instrument.usedHours).toFixed(1)}h usadas
                    {instrument.expectedLifeHours ? ` / ${Number(instrument.expectedLifeHours)}h` : ''}
                    {pct !== null ? ` · ${pct}% vida útil restante` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColor}`}>{instrument.status}</span>
                  {instrument.status !== 'RETIRED' && (
                    <>
                      <form action={markInstrumentSharpenedAction.bind(null, instrument.id)}>
                        <button type="submit" className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white">
                          Afilar/Servicio
                        </button>
                      </form>
                      <form action={retireInstrumentAction.bind(null, instrument.id)}>
                        <button type="submit" className="rounded bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700">
                          Retirar
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">+ Nuevo instrumento</summary>
          <form action={createInstrumentAction} className="mt-3 grid max-w-lg gap-2 sm:grid-cols-2">
            <input name="name" required placeholder="Nombre" className="input" />
            <select name="type" defaultValue="SCISSORS" className="input">
              <option value="BLADE">Cuchilla</option>
              <option value="COMB_GUIDE">Peine guía</option>
              <option value="SCISSORS">Tijeras</option>
              <option value="RAKE">Rastrillo</option>
              <option value="OTHER">Otro</option>
            </select>
            <input name="expectedLifeHours" type="number" placeholder="Vida útil (horas, opcional)" className="input" />
            <input name="expectedLifeUses" type="number" placeholder="Vida útil (usos, opcional)" className="input" />
            <button type="submit" className="col-span-full w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Crear instrumento
            </button>
          </form>
        </details>
      </section>
    </div>
  )
}
