import { listEquipment } from '@/modules/inventory/equipment'
import {
  createEquipmentAction,
  deleteEquipmentAction,
  flagEquipmentStatusAction,
  logMaintenanceAction,
  updateEquipmentAction,
} from '@/modules/inventory/actions'
import { DataTableActions } from '@/components/admin/DataTableActions'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  OPERATIONAL: 'Operativo',
  NEEDS_MAINTENANCE: 'Requiere mantenimiento',
  OUT_OF_SERVICE: 'Fuera de servicio',
}

const STATUS_COLOR: Record<string, string> = {
  OPERATIONAL: 'bg-green-100 text-green-800',
  NEEDS_MAINTENANCE: 'bg-amber-100 text-amber-800',
  OUT_OF_SERVICE: 'bg-red-100 text-red-800',
}

export default async function EquiposPage() {
  const equipment = await listEquipment()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Equipos y Mantenimiento</h1>
        <p className="text-slate-600">Turbinas, secadores y máquinas — calendario de mantenimiento técnico.</p>
      </div>

      <div className="space-y-4">
        {equipment.length === 0 && <p className="text-sm text-slate-500">Sin equipos registrados todavía.</p>}

        {equipment.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">
                  {item.name} <span className="text-xs text-slate-400">({item.type})</span>
                </p>
                <p className="text-sm text-slate-500">
                  Próximo mantenimiento:{' '}
                  {item.nextMaintenanceDue
                    ? item.nextMaintenanceDue.toLocaleDateString('es-MX', { dateStyle: 'medium' })
                    : 'sin programar'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {item.isOverdue && (
                  <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800">Vencido</span>
                )}
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[item.status]}`}>
                  {STATUS_LABEL[item.status]}
                </span>
                <DataTableActions
                  viewLabel="Ver Ficha Técnica"
                  viewModalTitle={`Ficha técnica — ${item.name}`}
                  viewModal={
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between"><dt className="text-slate-500">Marca</dt><dd className="text-slate-900">{item.brand ?? '—'}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-500">Modelo</dt><dd className="text-slate-900">{item.model ?? '—'}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-500">Número de serie</dt><dd className="text-slate-900">{item.serialNumber ?? '—'}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-500">Costo de compra</dt><dd className="text-slate-900">{item.purchaseCost ? `$${item.purchaseCost.toString()}` : '—'}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-500">Vida útil</dt><dd className="text-slate-900">{item.usefulLifeMonths ? `${item.usefulLifeMonths} meses` : '—'}</dd></div>
                      {item.notes && (
                        <div>
                          <dt className="text-slate-500">Observaciones</dt>
                          <dd className="mt-1 whitespace-pre-wrap text-slate-900">{item.notes}</dd>
                        </div>
                      )}
                      {item.maintenanceLogs.length > 0 && (
                        <div>
                          <dt className="text-slate-500">Historial de mantenimiento</dt>
                          <dd>
                            <ul className="mt-1 space-y-1 text-slate-900">
                              {item.maintenanceLogs.map((log) => (
                                <li key={log.id}>
                                  {log.performedAt.toLocaleDateString('es-MX', { dateStyle: 'short' })} — {log.description}
                                </li>
                              ))}
                            </ul>
                          </dd>
                        </div>
                      )}
                    </dl>
                  }
                  editLabel="Editar"
                  editTitle={`Editar equipo — ${item.name}`}
                  editAction={updateEquipmentAction.bind(null, item.id)}
                  editFields={
                    <>
                      <label className="text-sm text-slate-700">
                        Nombre
                        <input name="name" required defaultValue={item.name} className="input mt-1 w-full" />
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="text-sm text-slate-700">
                          Marca
                          <input name="brand" defaultValue={item.brand ?? ''} className="input mt-1 w-full" />
                        </label>
                        <label className="text-sm text-slate-700">
                          Modelo
                          <input name="model" defaultValue={item.model ?? ''} className="input mt-1 w-full" />
                        </label>
                      </div>
                      <label className="text-sm text-slate-700">
                        Número de serie
                        <input name="serialNumber" defaultValue={item.serialNumber ?? ''} className="input mt-1 w-full" />
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="text-sm text-slate-700">
                          Estado operativo
                          <select name="status" defaultValue={item.status} className="input mt-1 w-full">
                            <option value="OPERATIONAL">Operativo</option>
                            <option value="NEEDS_MAINTENANCE">Requiere mantenimiento</option>
                            <option value="OUT_OF_SERVICE">Fuera de servicio</option>
                          </select>
                        </label>
                        <label className="text-sm text-slate-700">
                          Fecha de mantenimiento
                          <input
                            name="lastMaintenanceAt"
                            type="date"
                            defaultValue={item.maintenanceLogs[0]?.performedAt.toISOString().slice(0, 10) ?? ''}
                            className="input mt-1 w-full"
                          />
                        </label>
                      </div>
                      <label className="text-sm text-slate-700">
                        Ficha técnica / observaciones
                        <textarea name="notes" defaultValue={item.notes ?? ''} rows={3} className="input mt-1 w-full" />
                      </label>
                    </>
                  }
                  onDelete={async () => {
                    'use server'
                    await deleteEquipmentAction(item.id)
                  }}
                  deleteConfirmText={`¿Eliminar "${item.name}"? Se conservará su historial pero dejará de aparecer en Equipos.`}
                />
              </div>
            </div>

            {item.maintenanceLogs.length > 0 && (
              <ul className="mt-2 text-xs text-slate-500">
                {item.maintenanceLogs.map((log) => (
                  <li key={log.id}>
                    {log.performedAt.toLocaleDateString('es-MX', { dateStyle: 'short' })} — {log.description}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <form action={logMaintenanceAction.bind(null, item.id)} className="flex flex-wrap gap-2">
                <input name="description" required placeholder="Descripción del mantenimiento" className="input w-64" />
                <input name="cost" type="number" step="0.01" placeholder="Costo (opcional)" className="input w-32" />
                <input name="nextDueInDays" type="number" placeholder="Próximo en (días)" defaultValue={90} className="input w-32" />
                <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">
                  Registrar mantenimiento
                </button>
              </form>

              {item.status !== 'NEEDS_MAINTENANCE' && (
                <form action={flagEquipmentStatusAction.bind(null, item.id, 'NEEDS_MAINTENANCE')}>
                  <button type="submit" className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-medium text-amber-800">
                    Marcar requiere mantenimiento
                  </button>
                </form>
              )}
              {item.status !== 'OUT_OF_SERVICE' && (
                <form action={flagEquipmentStatusAction.bind(null, item.id, 'OUT_OF_SERVICE')}>
                  <button type="submit" className="rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-800">
                    Marcar fuera de servicio
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>

      <details>
        <summary className="cursor-pointer text-sm font-medium text-slate-700">+ Nuevo equipo</summary>
        <form action={createEquipmentAction} className="mt-3 grid max-w-lg gap-2 sm:grid-cols-2">
          <input name="name" required placeholder="Nombre" className="input" />
          <select name="type" defaultValue="DRYER" className="input">
            <option value="DRYER">Secador</option>
            <option value="TURBINE">Turbina</option>
            <option value="CLIPPER_MACHINE">Máquina de corte</option>
            <option value="GROOMING_TABLE">Mesa de trabajo</option>
            <option value="OTHER">Otro</option>
          </select>
          <input name="purchaseCost" type="number" step="0.01" placeholder="Costo de compra" className="input" />
          <input name="usefulLifeMonths" type="number" placeholder="Vida útil (meses)" className="input" />
          <button type="submit" className="col-span-full w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Crear equipo
          </button>
        </form>
      </details>
    </div>
  )
}
