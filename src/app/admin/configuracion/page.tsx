import { listEquipmentCategories } from '@/modules/config/equipmentCategories'
import { listProductCategories, listUnitsOfMeasure } from '@/modules/config/productCatalogs'
import { listCustomerTags } from '@/modules/config/customerTags'
import { getRawPaymentInfoText } from '@/modules/config/settings'
import {
  createCustomerTagAction,
  createEquipmentCategoryAction,
  createProductCategoryAction,
  createUnitOfMeasureAction,
  deleteCustomerTagAction,
  deleteEquipmentCategoryAction,
  deleteProductCategoryAction,
  deleteUnitOfMeasureAction,
  updateCustomerTagAction,
  updateEquipmentCategoryAction,
  updatePaymentInfoTextAction,
  updateProductCategoryAction,
  updateUnitOfMeasureAction,
} from '@/modules/config/actions'
import { DataTableActions } from '@/components/admin/DataTableActions'

export const dynamic = 'force-dynamic'

export default async function ConfiguracionPage() {
  const [equipmentCategories, productCategories, units, tags, paymentInfoText] = await Promise.all([
    listEquipmentCategories(),
    listProductCategories(),
    listUnitsOfMeasure(),
    listCustomerTags(),
    getRawPaymentInfoText(),
  ])

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
          {equipmentCategories.length === 0 && <p className="p-4 text-sm text-slate-500">Sin tipos registrados todavía.</p>}
          {equipmentCategories.map((category) => (
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
        <h2 className="text-lg font-medium text-slate-900">Categorías de producto</h2>
        <p className="mt-1 text-sm text-slate-500">Opciones del selector &quot;Categoría&quot; en Inventario.</p>

        <div className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {productCategories.length === 0 && <p className="p-4 text-sm text-slate-500">Sin categorías registradas todavía.</p>}
          {productCategories.map((category) => (
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
                  editTitle={`Editar categoría — ${category.name}`}
                  editAction={updateProductCategoryAction.bind(null, category.id)}
                  editFields={
                    <>
                      <label className="text-sm text-slate-700">
                        Nombre
                        <input name="name" required defaultValue={category.name} className="input mt-1 w-full" />
                      </label>
                      <label className="text-sm text-slate-700">
                        Orden
                        <input name="sortOrder" type="number" defaultValue={category.sortOrder} className="input mt-1 w-full" />
                      </label>
                    </>
                  }
                  onDelete={async () => {
                    'use server'
                    await deleteProductCategoryAction(category.id)
                  }}
                  deleteConfirmText={`¿Eliminar "${category.name}"? Los productos ya clasificados con ella la conservan, pero dejará de aparecer en el selector.`}
                />
              </div>
            </div>
          ))}
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">+ Nueva categoría</summary>
          <form action={createProductCategoryAction} className="mt-3 grid max-w-lg gap-2 sm:grid-cols-2">
            <input name="name" required placeholder='Nombre (ej. "Shampoo")' className="input" />
            <input name="sortOrder" type="number" placeholder="Orden (opcional)" className="input" />
            <button type="submit" className="col-span-full w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Crear categoría
            </button>
          </form>
        </details>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-900">Unidades de medida</h2>
        <p className="mt-1 text-sm text-slate-500">Opciones del selector &quot;Unidad&quot; en Inventario.</p>

        <div className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {units.length === 0 && <p className="p-4 text-sm text-slate-500">Sin unidades registradas todavía.</p>}
          {units.map((unit) => (
            <div key={unit.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium text-slate-900">
                  {unit.name} <span className="text-slate-400">({unit.abbreviation})</span>
                </p>
                <p className="text-sm text-slate-500">Orden: {unit.sortOrder}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    unit.active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {unit.active ? 'Activo' : 'Inactivo'}
                </span>
                <DataTableActions
                  editLabel="Editar"
                  editTitle={`Editar unidad — ${unit.name}`}
                  editAction={updateUnitOfMeasureAction.bind(null, unit.id)}
                  editFields={
                    <>
                      <label className="text-sm text-slate-700">
                        Nombre
                        <input name="name" required defaultValue={unit.name} className="input mt-1 w-full" />
                      </label>
                      <label className="text-sm text-slate-700">
                        Abreviatura
                        <input name="abbreviation" required defaultValue={unit.abbreviation} className="input mt-1 w-full" />
                      </label>
                      <label className="text-sm text-slate-700">
                        Orden
                        <input name="sortOrder" type="number" defaultValue={unit.sortOrder} className="input mt-1 w-full" />
                      </label>
                    </>
                  }
                  onDelete={async () => {
                    'use server'
                    await deleteUnitOfMeasureAction(unit.id)
                  }}
                  deleteConfirmText={`¿Eliminar "${unit.name}"? Los productos que ya la usan la conservan, pero dejará de aparecer en el selector.`}
                />
              </div>
            </div>
          ))}
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">+ Nueva unidad</summary>
          <form action={createUnitOfMeasureAction} className="mt-3 grid max-w-lg gap-2 sm:grid-cols-2">
            <input name="name" required placeholder='Nombre (ej. "Mililitros")' className="input" />
            <input name="abbreviation" required placeholder="Abreviatura (ej. ml)" className="input" />
            <input name="sortOrder" type="number" placeholder="Orden (opcional)" className="input" />
            <button type="submit" className="col-span-full w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Crear unidad
            </button>
          </form>
        </details>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-900">Etiquetas de clientes</h2>
        <p className="mt-1 text-sm text-slate-500">
          Badges asignables a un cliente (ej. &quot;VIP&quot;, &quot;Frecuente&quot;, &quot;Problemático&quot;) desde su ficha en Clientes.
        </p>

        <div className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {tags.length === 0 && <p className="p-4 text-sm text-slate-500">Sin etiquetas registradas todavía.</p>}
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center justify-between gap-3 p-4">
              <span
                className="rounded-full px-2.5 py-1 text-xs font-medium text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    tag.active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {tag.active ? 'Activa' : 'Inactiva'}
                </span>
                <DataTableActions
                  editLabel="Editar"
                  editTitle={`Editar etiqueta — ${tag.name}`}
                  editAction={updateCustomerTagAction.bind(null, tag.id)}
                  editFields={
                    <>
                      <label className="text-sm text-slate-700">
                        Nombre
                        <input name="name" required defaultValue={tag.name} className="input mt-1 w-full" />
                      </label>
                      <label className="text-sm text-slate-700">
                        Color
                        <input name="color" type="color" defaultValue={tag.color} className="input mt-1 h-10 w-full p-1" />
                      </label>
                    </>
                  }
                  onDelete={async () => {
                    'use server'
                    await deleteCustomerTagAction(tag.id)
                  }}
                  deleteConfirmText={`¿Eliminar "${tag.name}"? Se quita de los clientes que ya la tenían asignada.`}
                />
              </div>
            </div>
          ))}
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">+ Nueva etiqueta</summary>
          <form action={createCustomerTagAction} className="mt-3 grid max-w-lg gap-2 sm:grid-cols-2">
            <input name="name" required placeholder='Nombre (ej. "VIP")' className="input" />
            <input name="color" type="color" defaultValue="#64748b" className="input h-10 p-1" />
            <button type="submit" className="col-span-full w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Crear etiqueta
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
