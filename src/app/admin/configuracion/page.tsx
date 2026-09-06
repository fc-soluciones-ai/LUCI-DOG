import { listEquipmentCategories } from '@/modules/config/equipmentCategories'
import { getRawPaymentInfoText } from '@/modules/config/settings'
import {
  createEquipmentCategoryAction,
  deleteEquipmentCategoryAction,
  updateEquipmentCategoryAction,
  updatePaymentInfoTextAction,
} from '@/modules/config/actions'
import { DataTableActions } from '@/components/admin/DataTableActions'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionPage() {
  const [categories, paymentInfoText] = await Promise.all([listEquipmentCategories(), getRawPaymentInfoText()])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Configuración</h1>
        <p className="text-slate-600">Catálogos que alimentan los selectores del sistema.</p>
      </div>

      <section>
        <h2 className="text-lg font-medium text-slate-900">Tipo de equipo</h2>
        <p className="mt-1 text-sm text-slate-500">
          Opciones del selector &quot;Tipo&quot; en Equipos y Mantenimiento.
        </p>

        <div className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {categories.length === 0 && <p className="p-4 text-sm text-slate-500">Sin tipos registrados todavía.</p>}
          {categories.map((category) => (
            <div key={category.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium text-slate-900">{category.name}</p>
                <p className="text-sm text-slate-500">Orden: {category.sortOrder}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    category.active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {category.active ? 'Activo' : 'Inactivo'}
                </span>
                <DataTableActions
                  editLabel="Editar"
                  editTitle={`Editar tipo — ${category.name}`}
                  editAction={updateEquipmentCategoryAction.bind(null, category.id)}
                  editFields={
                    <>
                      <label className="text-sm text-slate-700">
                        Nombre
                        <input name="name" required defaultValue={category.name} className="input mt-1 w-full" />
                      </label>
                      <label className="text-sm text-slate-700">
                        Orden
                        <input
                          name="sortOrder"
                          type="number"
                          defaultValue={category.sortOrder}
                          className="input mt-1 w-full"
                        />
                      </label>
                    </>
                  }
                  onDelete={async () => {
                    'use server'
                    await deleteEquipmentCategoryAction(category.id)
                  }}
                  deleteConfirmText={`¿Eliminar "${category.name}"? Los equipos ya clasificados con este tipo lo conservan, pero dejará de aparecer en el selector.`}
                />
              </div>
            </div>
          ))}
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">+ Nuevo tipo de equipo</summary>
          <form action={createEquipmentCategoryAction} className="mt-3 grid max-w-lg gap-2 sm:grid-cols-2">
            <input name="name" required placeholder='Nombre (ej. "Cortadora")' className="input" />
            <input name="sortOrder" type="number" placeholder="Orden (opcional)" className="input" />
            <button type="submit" className="col-span-full w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Crear tipo
            </button>
          </form>
        </details>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-900">Datos de pago</h2>
        <p className="mt-1 text-sm text-slate-500">
          Se muestra a los clientes al pagar (portal del cliente) y en el recibo de WhatsApp cuando el
          cobro requiere transferencia/SINPE.
        </p>
        <form action={updatePaymentInfoTextAction} className="mt-3 max-w-lg space-y-2">
          <textarea
            name="paymentInfoText"
            defaultValue={paymentInfoText}
            rows={3}
            placeholder="Ej. SINPE Móvil: 8888-8888 (Nombre del titular)"
            className="input w-full"
          />
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Guardar datos de pago
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-900">Tipo de estación</h2>
        <p className="mt-1 text-sm text-slate-500">
          Este catálogo no es editable desde aquí: las categorías de estación (Baño, Secado, Corte, Uñas,
          Oídos, Deslanado, Acabado, Otro) también controlan la duración estimada por talla, el semáforo de
          tiempos y el reconocimiento de voz en Mise en Place. Cambiarlas libremente rompería esa lógica, así
          que quedan fijas. Puedes editar el nombre y el tipo de cada estación física en{' '}
          <a href="/admin/stations" className="underline">
            Estaciones de trabajo
          </a>
          .
        </p>
      </section>
    </div>
  )
}
