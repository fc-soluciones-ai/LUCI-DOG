import { listServices } from '@/modules/services/services'
import { deleteServiceAction } from '@/modules/services/actions'
import { DataTableActions } from '@/components/admin/DataTableActions'
import { ServiceFormModal } from '@/components/admin/ServiceFormModal'
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
            <div className="flex min-w-0 items-center gap-3">
              {service.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={service.imageUrl} alt={service.name} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xl">
                  ✂️
                </div>
              )}
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{service.name}</p>
                <p className="text-sm text-slate-500">
                  {formatCRC(service.basePrice)} · {service.standardDurationMin} min
                  {service.description ? ` · ${service.description}` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  service.active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {service.active ? 'Activo' : 'Inactivo'}
              </span>
              <ServiceFormModal
                mode="edit"
                service={{
                  id: service.id,
                  name: service.name,
                  basePrice: Number(service.basePrice),
                  standardDurationMin: service.standardDurationMin,
                  description: service.description,
                  imageUrl: service.imageUrl,
                }}
              />
              <DataTableActions
                onDelete={async () => {
                  'use server'
                  await deleteServiceAction(service.id)
                }}
                deleteLabel="Eliminar"
                deleteConfirmText={`¿Eliminar "${service.name}"? Se conservará su historial pero dejará de ofrecerse en /book.`}
              />
            </div>
          </div>
        ))}
      </div>

      <ServiceFormModal mode="create" />
    </div>
  )
}
