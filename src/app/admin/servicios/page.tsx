import { listServices } from '@/modules/services/services'
import { createServiceAction, deleteServiceAction, updateServiceAction } from '@/modules/services/actions'
import { DataTableActions } from '@/components/admin/DataTableActions'
import { formatCRC } from '@/lib/currency'

export const dynamic = 'force-dynamic'

export default async function ServiciosPage() {
  const services = await listServices()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Servicios y Precios</h1>
        <p className="text-slate-600">Catálogo de servicios que se ofrecen en /book y se usan para facturar.</p>
      </div>

      <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {services.length === 0 && <p className="p-4 text-sm text-slate-500">Sin servicios registrados todavía.</p>}
        {services.map((service) => (
          <div key={service.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-medium text-slate-900">{service.name}</p>
              <p className="text-sm text-slate-500">
                {formatCRC(service.basePrice)} · {service.standardDurationMin} min
                {service.description ? ` · ${service.description}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  service.active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {service.active ? 'Activo' : 'Inactivo'}
              </span>
              <DataTableActions
                editLabel="Editar"
                editTitle={`Editar servicio — ${service.name}`}
                editAction={updateServiceAction.bind(null, service.id)}
                editFields={
                  <>
                    <label className="text-sm text-slate-700">
                      Nombre del servicio
                      <input name="name" required defaultValue={service.name} className="input mt-1 w-full" />
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-sm text-slate-700">
                        Monto a cobrar ₡
                        <input
                          name="basePrice"
                          type="number"
                          step="0.01"
                          required
                          defaultValue={Number(service.basePrice)}
                          className="input mt-1 w-full"
                        />
                      </label>
                      <label className="text-sm text-slate-700">
                        Duración estándar (min)
                        <input
                          name="standardDurationMin"
                          type="number"
                          required
                          defaultValue={service.standardDurationMin}
                          className="input mt-1 w-full"
                        />
                      </label>
                    </div>
                    <label className="text-sm text-slate-700">
                      Descripción
                      <textarea name="description" defaultValue={service.description ?? ''} rows={2} className="input mt-1 w-full" />
                    </label>
                  </>
                }
                onDelete={async () => {
                  'use server'
                  await deleteServiceAction(service.id)
                }}
                deleteConfirmText={`¿Eliminar "${service.name}"? Se conservará su historial pero dejará de ofrecerse en /book.`}
              />
            </div>
          </div>
        ))}
      </div>

      <details>
        <summary className="cursor-pointer text-sm font-medium text-slate-700">+ Nuevo servicio</summary>
        <form action={createServiceAction} className="mt-3 grid max-w-lg gap-2 sm:grid-cols-2">
          <input name="name" required placeholder="Nombre del servicio" className="input sm:col-span-2" />
          <input name="basePrice" type="number" step="0.01" required placeholder="Monto a cobrar ₡" className="input" />
          <input name="standardDurationMin" type="number" required placeholder="Duración estándar (min)" className="input" />
          <textarea name="description" placeholder="Descripción (opcional)" rows={2} className="input sm:col-span-2" />
          <button type="submit" className="col-span-full w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Crear servicio
          </button>
        </form>
      </details>
    </div>
  )
}
