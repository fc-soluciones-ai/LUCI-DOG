import { getUpcomingMaintenanceAlerts, listEquipment } from '@/modules/inventory/equipment'
import { listActiveEquipmentCategories } from '@/modules/config/equipmentCategories'
import {
  createEquipmentAction,
  deleteEquipmentAction,
  flagEquipmentStatusAction,
  logMaintenanceAction,
  updateEquipmentAction,
} from '@/modules/inventory/actions'
import { DataTableActions } from '@/components/admin/DataTableActions'
import { HealthProgressBar } from '@/components/admin/HealthProgressBar'
import { formatCRC } from '@/lib/currency'

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
  const [equipment, categories, maintenanceAlerts] = await Promise.all([
    listEquipment(),
    listActiveEquipmentCategories(),
    getUpcomingMaintenanceAlerts(),
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Equipos y Mantenimiento</h1>
        <p className="text-slate-600">Turbinas, secadores y máquinas — calendario de mantenimiento técnico.</p>
      </div>

      {maintenanceAlerts.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <p className="font-medium text-amber-900">
            {maintenanceAlerts.length} equipo{maintenanceAlerts.length === 1 ? '' : 's'} requiere
            {maintenanceAlerts.length === 1 ? '' : 'n'} mantenimiento pronto
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-800">
            {maintenanceAlerts.map((alert) => (
              <li key={alert.equipmentId}>
                {alert.name} —{' '}
                {alert.isOverdue ? (
                  <span className="font-medium">vencido desde {alert.dueDate.toLocaleDateString('es-CR', { dateStyle: 'medium' })}</span>
                ) : (
                  <>vence el {alert.dueDate.toLocaleDateString('es-CR', { dateStyle: 'medium' })}</>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        {equipment.length === 0 && <p className="text-sm text-slate-500">Sin equipos registrados todavía.</p>}

        {equipment.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">
                  {item.name} <span className="text-xs text-slate-400">({item.category?.name ?? 'Sin tipo'})</span>
                </p>
                <p className="text-sm text-slate-500">
                  Próximo mantenimiento:{' '}
                  {item.nextMaintenanceDue
                    ? item.nextMaintenanceDue.toLocaleDateString('es-CR', { dateStyle: 'medium' })
                    : 'sin programar'}
                </p>
                <div className="mt-2">
                  <HealthProgressBar ratio={item.healthRatio} label="vida útil" />
                </div>
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
                      <div className="flex justify-between"><dt className="text-slate-500">Tipo</dt><dd className="text-slate-900">{item.category?.name ?? '—'}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-500">Marca</dt><dd className="text-slate-900">{item.brand ?? '—'}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-500">Modelo</dt><dd className="text-slate-900">{item.model ?? '—'}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-500">Número de serie</dt><dd className="text-slate-900">{item.serialNumber ?? '—'}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-500">Proveedor</dt><dd className="text-slate-900">{item.supplier ?? '—'}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-500">Fecha de compra</dt><dd className="text-slate-900">{item.purchaseDate.toLocaleDateString('es-CR', { dateStyle: 'medium' })}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-500">Costo de compra</dt><dd className="text-slate-900">{formatCRC(item.purchaseCost)}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-500">Vida útil</dt><dd className="text-slate-900">{item.usefulLifeMonths ? `${item.usefulLifeMonths} meses` : '—'}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-500">Frecuencia de mantenimiento</dt><dd className="text-slate-900">{item.maintenanceFrequencyMonths ? `cada ${item.maintenanceFrequencyMonths} meses` : '—'}</dd></div>
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
                                  {log.performedAt.toLocaleDateString('es-CR', { dateStyle: 'short' })} — {log.description}
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
                          Tipo
                          <select name="categoryId" defaultValue={item.categoryId ?? ''} className="input mt-1 w-full">
                            <option value="">Sin tipo</option>
                            {categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-sm text-slate-700">
                          Proveedor
                          <input name="supplier" defaultValue={item.supplier ?? ''} className="input mt-1 w-full" />
                        </label>
                      </div>
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
                        Frecuencia de mantenimiento (meses)
                        <input
                          name="maintenanceFrequencyMonths"
                          type="number"
                          min="1"
                          defaultValue={item.maintenanceFrequencyMonths ?? ''}
                          className="input mt-1 w-full"
                        />
                      </label>
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
                    {log.performedAt.toLocaleDateString('es-CR', { dateStyle: 'short' })} — {log.description}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <form action={logMaintenanceAction.bind(null, item.id)} className="flex flex-wrap gap-2">
                <input name="description" required placeholder="Descripción del mantenimiento" className="input w-64" />
                <input name="cost" type="number" step="0.01" placeholder="Costo ₡ (opcional)" className="input w-32" />
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
          <select name="categoryId" defaultValue="" className="input">
            <option value="">Tipo (opcional)</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input name="supplier" placeholder="Proveedor" className="input" />
          <label className="text-sm text-slate-600">
            Fecha de compra
            <input name="purchaseDate" type="date" className="input mt-1 w-full" />
          </label>
          <input name="purchaseCost" type="number" step="0.01" placeholder="Costo ₡" className="input" />
          <input name="usefulLifeMonths" type="number" placeholder="Vida útil (meses)" className="input" />
          <input
            name="maintenanceFrequencyMonths"
            type="number"
            min="1"
            placeholder="Frecuencia de mantenimiento (meses)"
            className="input"
          />
          <button type="submit" className="col-span-full w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Crear equipo
          </button>
        </form>
      </details>
    </div>
  )
}
