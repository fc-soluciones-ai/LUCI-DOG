import { listPipelines, listServicesWithoutPipeline } from '@/modules/control-center/pipelines'
import {
  createPipelineAction,
  createProcessStepAction,
  createSubProcessAction,
  deleteProcessStepAction,
  deleteSubProcessAction,
  setPipelineActiveAction,
} from '@/modules/control-center/actions'

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

export default async function PipelinesAdminPage() {
  const [pipelines, servicesWithoutPipeline] = await Promise.all([listPipelines(), listServicesWithoutPipeline()])

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Pipelines de servicio</h1>
        <p className="text-slate-600">
          Plantillas de proceso (ej. &quot;Baño Completo&quot;) con sus etapas y subprocesos. Un servicio con
          pipeline vinculado se rastrea en el Dashboard TV; sin pipeline, sigue el flujo simple de siempre.
        </p>
      </div>

      <div className="space-y-6">
        {pipelines.length === 0 && <p className="text-sm text-slate-500">Sin pipelines todavía.</p>}

        {pipelines.map((pipeline) => (
          <div key={pipeline.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">{pipeline.name}</p>
                <p className="text-sm text-slate-500">
                  {pipeline.service ? `Vinculado a: ${pipeline.service.name}` : 'Sin servicio vinculado'}
                  {pipeline.description ? ` · ${pipeline.description}` : ''}
                </p>
              </div>
              <form action={setPipelineActiveAction.bind(null, pipeline.id, !pipeline.active)}>
                <button
                  type="submit"
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    pipeline.active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {pipeline.active ? 'Activo' : 'Inactivo'}
                </button>
              </form>
            </div>

            <div className="mt-4 space-y-3">
              {pipeline.steps.map((step) => (
                <div key={step.id} className="rounded border border-slate-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-900">
                      {step.order}. {step.name} — {STAGE_LABEL[step.stageType] ?? step.stageType} ·{' '}
                      {step.standardDurationMin} min
                    </p>
                    <form action={deleteProcessStepAction.bind(null, step.id)}>
                      <button type="submit" className="text-xs text-red-600 hover:underline">
                        Eliminar etapa
                      </button>
                    </form>
                  </div>

                  {step.subProcesses.length > 0 && (
                    <ul className="mt-2 space-y-1 pl-4 text-xs text-slate-600">
                      {step.subProcesses.map((sub) => (
                        <li key={sub.id} className="flex items-center justify-between">
                          <span>
                            {sub.order}. {sub.name}
                          </span>
                          <form action={deleteSubProcessAction.bind(null, sub.id)}>
                            <button type="submit" className="text-red-600 hover:underline">
                              eliminar
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}

                  <form action={createSubProcessAction.bind(null, step.id)} className="mt-2 flex gap-2">
                    <input name="name" required placeholder="Subproceso (ej. Desmotado)" className="input text-xs" />
                    <input name="order" type="number" placeholder="#" className="input w-16 text-xs" />
                    <button type="submit" className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white">
                      + Subproceso
                    </button>
                  </form>
                </div>
              ))}
            </div>

            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium text-slate-700">+ Nueva etapa</summary>
              <form action={createProcessStepAction.bind(null, pipeline.id)} className="mt-2 grid max-w-xl gap-2 sm:grid-cols-2">
                <input name="name" required placeholder='Nombre (ej. "Baño")' className="input text-xs" />
                <select name="stageType" defaultValue="BATH" className="input text-xs">
                  {Object.entries(STAGE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input name="order" type="number" placeholder="Orden" className="input text-xs" />
                <input name="standardDurationMin" type="number" placeholder="Duración estándar (min, talla M)" className="input text-xs" />
                <button type="submit" className="col-span-full w-fit rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white">
                  Crear etapa
                </button>
              </form>
            </details>
          </div>
        ))}
      </div>

      <details>
        <summary className="cursor-pointer text-sm font-medium text-slate-700">+ Nuevo pipeline</summary>
        <form action={createPipelineAction} className="mt-3 grid max-w-lg gap-2 sm:grid-cols-2">
          <input name="name" required placeholder='Nombre (ej. "Baño Completo")' className="input" />
          <select name="serviceId" defaultValue="" className="input">
            <option value="">Sin vincular a servicio</option>
            {servicesWithoutPipeline.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name}
              </option>
            ))}
          </select>
          <input name="description" placeholder="Descripción (opcional)" className="input sm:col-span-2" />
          <button type="submit" className="col-span-full w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Crear pipeline
          </button>
        </form>
      </details>
    </div>
  )
}
