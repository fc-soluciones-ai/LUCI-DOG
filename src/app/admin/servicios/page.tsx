import Link from 'next/link'
import { listServices } from '@/modules/services/services'
import { deleteServiceAction } from '@/modules/services/actions'
import { DataTableActions } from '@/components/admin/DataTableActions'
import { ServiceFormModal } from '@/components/admin/ServiceFormModal'
import { EmptyState } from '@/components/admin/EmptyState'
import { formatCRC } from '@/lib/currency'
import { serviceFamilyIcon } from '@/modules/shared/serviceFamily'
import { parseServiceDescription } from '@/modules/shared/serviceDescription'

export const dynamic = 'force-dynamic'

export default async function ServiciosPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const services = await listServices(q)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Servicios y Precios</h1>
        <p className="text-slate-600">Catálogo de servicios que se ofrecen en /book y se usan para facturar.</p>
      </div>

      <form method="get">
        <input name="q" defaultValue={q ?? ''} placeholder="Buscar por nombre..." className="input max-w-sm" />
      </form>

      {services.length === 0 ? (
        <EmptyState
          icon="✂️"
          title={q ? `Sin servicios que coincidan con "${q}".` : 'Sin servicios registrados todavía.'}
          action={q ? undefined : { label: '+ Crear el primer servicio', href: '#nuevo-servicio' }}
        />
      ) : (
        <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {services.map((service) => {
            const { items, note } = parseServiceDescription(service.description)
            return (
              <div key={service.id} className="flex items-start justify-between gap-3 p-4">
                <div className="flex min-w-0 items-start gap-3">
                  {service.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={service.imageUrl} alt={service.name} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xl">
                      {serviceFamilyIcon(service.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{service.name}</p>
                    <p className="text-sm text-slate-500">
                      {formatCRC(service.basePrice)} · {service.standardDurationMin} min
                    </p>
                    {items.length > 0 && (
                      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                        {items.map((item, index) => (
                          <li key={index} className="flex items-center gap-1">
                            <span className="text-slate-300">•</span> {item}
                          </li>
                        ))}
                      </ul>
                    )}
                    {note && (
                      <p className="mt-1.5 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">⚠ {note}</p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
                      service.active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {service.active ? 'Activo' : 'Inactivo'}
                  </span>
                  <Link
                    href={`/admin/servicios/${service.id}`}
                    className="whitespace-nowrap text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline"
                  >
                    Fórmulas y etapas
                  </Link>
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
            )
          })}
        </div>
      )}

      <div id="nuevo-servicio">
        <ServiceFormModal mode="create" />
      </div>
    </div>
  )
}
