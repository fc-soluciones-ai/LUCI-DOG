import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { listFormulasForService } from '@/modules/services/formulas'
import { listStageTemplatesForService } from '@/modules/services/stageTemplates'
import { listProducts } from '@/modules/inventory/products'
import {
  createFormulaAction,
  createStageTemplateAction,
  deleteFormulaAction,
  deleteStageTemplateAction,
  updateFormulaAction,
  updateStageTemplateAction,
} from '@/modules/services/actions'
import { DataTableActions } from '@/components/admin/DataTableActions'

export const dynamic = 'force-dynamic'

const STAGE_LABEL: Record<string, string> = {
  BATH: 'Baño',
  DRYING: 'Secado',
  HAIRCUT: 'Corte',
  NAILS: 'Uñas',
  EARS: 'Oídos',
  DESHEDDING: 'Deslanado',
  FINISHING: 'Acabado',
  OTHER: 'Otro',
}

const STAGE_OPTIONS = Object.keys(STAGE_LABEL)

export default async function ServiceDetailPage({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { pipeline: { include: { steps: { orderBy: { order: 'asc' } } } } },
  })
  if (!service) notFound()

  const [formulas, stageTemplates, products] = await Promise.all([
    listFormulasForService(serviceId),
    listStageTemplatesForService(serviceId),
    listProducts(),
  ])

  // Si el servicio tiene un Proceso activo con etapas, ese es el que manda para
  // Mise en Place y el cierre de inventario (ver resolveServiceStages) — evita
  // que el admin edite Etapas estándar creyendo que se usan cuando no es así.
  const governingPipeline =
    service.pipeline && service.pipeline.active && service.pipeline.steps.length > 0 ? service.pipeline : null

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin/servicios" className="text-sm text-slate-500 hover:text-slate-900">
          ← Servicios
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{service.name}</h1>
        <p className="text-slate-600">
          Fórmulas cosméticas y etapas estándar — alimentan la proyección de Mise en Place (mezclas e instrumental
          necesarios cada día).
        </p>
      </div>

      <section>
        <h2 className="text-lg font-medium text-slate-900">Fórmulas cosméticas</h2>
        <p className="mt-1 text-sm text-slate-500">
          Producto y ml estimados por aplicación (talla M) — Mise en Place escala esto por la talla real de cada
          mascota.
        </p>

        <div className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {formulas.length === 0 && <p className="p-4 text-sm text-slate-500">Sin fórmulas registradas todavía.</p>}
          {formulas.map((formula) => (
            <div key={formula.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium text-slate-900">
                  {formula.name} {formula.dilutionRatio ? <span className="text-slate-400">({formula.dilutionRatio})</span> : null}
                </p>
                <p className="text-sm text-slate-500">
                  {formula.product.name} · {formula.baseMlPerUse.toString()} ml (talla M)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    formula.active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {formula.active ? 'Activa' : 'Inactiva'}
                </span>
                <DataTableActions
                  editLabel="Editar"
                  editTitle={`Editar fórmula — ${formula.name}`}
                  editAction={updateFormulaAction.bind(null, serviceId, formula.id)}
                  editFields={
                    <>
                      <label className="text-sm text-slate-700">
                        Nombre
                        <input name="name" required defaultValue={formula.name} className="input mt-1 w-full" />
                      </label>
                      <label className="text-sm text-slate-700">
                        Producto
                        <select name="productId" required defaultValue={formula.productId} className="input mt-1 w-full">
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm text-slate-700">
                        Dilución (opcional)
                        <input name="dilutionRatio" defaultValue={formula.dilutionRatio ?? ''} placeholder="1:8" className="input mt-1 w-full" />
                      </label>
                      <label className="text-sm text-slate-700">
                        ml por aplicación (talla M)
                        <input
                          name="baseMlPerUse"
                          type="number"
                          step="0.01"
                          required
                          defaultValue={formula.baseMlPerUse.toString()}
                          className="input mt-1 w-full"
                        />
                      </label>
                      <label className="text-sm text-slate-700">
                        Instrucciones (opcional)
                        <textarea name="instructions" defaultValue={formula.instructions ?? ''} rows={2} className="input mt-1 w-full" />
                      </label>
                    </>
                  }
                  onDelete={async () => {
                    'use server'
                    await deleteFormulaAction(serviceId, formula.id)
                  }}
                  deleteLabel="Desactivar"
                  deleteConfirmText={`¿Desactivar "${formula.name}"? Dejará de proyectarse en Mise en Place, pero se conserva su historial de uso.`}
                />
              </div>
            </div>
          ))}
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">+ Nueva fórmula</summary>
          <form action={createFormulaAction.bind(null, serviceId)} className="mt-3 grid max-w-lg gap-2 sm:grid-cols-2">
            <input name="name" required placeholder='Nombre (ej. "Shampoo hipoalergénico")' className="input sm:col-span-2" />
            <select name="productId" required defaultValue="" className="input">
              <option value="" disabled>
                Producto
              </option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <input name="dilutionRatio" placeholder="Dilución (ej. 1:8, opcional)" className="input" />
            <input name="baseMlPerUse" type="number" step="0.01" required placeholder="ml por aplicación (talla M)" className="input" />
            <textarea name="instructions" placeholder="Instrucciones (opcional)" rows={2} className="input sm:col-span-2" />
            <button type="submit" className="col-span-full w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Crear fórmula
            </button>
          </form>
        </details>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-900">Etapas estándar</h2>
        <p className="mt-1 text-sm text-slate-500">
          Secuencia del servicio (Baño, Secado, Corte...) — Mise en Place y el cierre de inventario usan esto para
          proyectar cuánto instrumental hace falta.
        </p>

        {governingPipeline ? (
          <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
            <p className="text-sm text-indigo-900">
              Este servicio tiene un <strong>Proceso vinculado</strong> en Dashboard TV (
              <strong>{governingPipeline.name}</strong>) — mientras esté activo, sus etapas son la fuente que usa
              Mise en Place y el cierre de inventario, no las de abajo.{' '}
              <Link href="/admin/procesos" className="font-medium underline">
                Editar etapas en Procesos →
              </Link>
            </p>
            <div className="mt-3 divide-y divide-indigo-200 rounded-md border border-indigo-200 bg-white">
              {governingPipeline.steps.map((step) => (
                <div key={step.id} className="flex items-center justify-between p-3 text-sm">
                  <span className="text-slate-900">
                    {step.order}. {step.name} — {STAGE_LABEL[step.stageType] ?? step.stageType}
                  </span>
                  <span className="text-slate-500">{step.standardDurationMin} min</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div
          className={`mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white ${
            governingPipeline ? 'pointer-events-none opacity-50' : ''
          }`}
        >
          {stageTemplates.length === 0 && <p className="p-4 text-sm text-slate-500">Sin etapas registradas todavía.</p>}
          {stageTemplates.map((stage) => (
            <div key={stage.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium text-slate-900">
                  {stage.order}. {STAGE_LABEL[stage.stageType] ?? stage.stageType}
                </p>
                <p className="text-sm text-slate-500">{stage.standardDurationMin} min estándar (talla M)</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    stage.active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {stage.active ? 'Activa' : 'Inactiva'}
                </span>
                <DataTableActions
                  editLabel="Editar"
                  editTitle={`Editar etapa — ${STAGE_LABEL[stage.stageType] ?? stage.stageType}`}
                  editAction={updateStageTemplateAction.bind(null, serviceId, stage.id)}
                  editFields={
                    <>
                      <label className="text-sm text-slate-700">
                        Etapa
                        <select name="stageType" required defaultValue={stage.stageType} className="input mt-1 w-full">
                          {STAGE_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {STAGE_LABEL[option]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm text-slate-700">
                        Orden
                        <input name="order" type="number" required defaultValue={stage.order} className="input mt-1 w-full" />
                      </label>
                      <label className="text-sm text-slate-700">
                        Duración estándar (min, talla M)
                        <input
                          name="standardDurationMin"
                          type="number"
                          required
                          defaultValue={stage.standardDurationMin}
                          className="input mt-1 w-full"
                        />
                      </label>
                    </>
                  }
                  onDelete={async () => {
                    'use server'
                    await deleteStageTemplateAction(serviceId, stage.id)
                  }}
                  deleteLabel="Desactivar"
                  deleteConfirmText="¿Desactivar esta etapa? Dejará de proyectarse en Mise en Place."
                />
              </div>
            </div>
          ))}
        </div>

        {governingPipeline ? null : (
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">+ Nueva etapa</summary>
            <form action={createStageTemplateAction.bind(null, serviceId)} className="mt-3 grid max-w-lg gap-2 sm:grid-cols-3">
              <select name="stageType" required defaultValue="" className="input">
                <option value="" disabled>
                  Etapa
                </option>
                {STAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {STAGE_LABEL[option]}
                  </option>
                ))}
              </select>
              <input name="order" type="number" required placeholder="Orden" className="input" />
              <input name="standardDurationMin" type="number" required placeholder="Duración (min)" className="input" />
              <button type="submit" className="col-span-full w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                Crear etapa
              </button>
            </form>
          </details>
        )}
      </section>
    </div>
  )
}
