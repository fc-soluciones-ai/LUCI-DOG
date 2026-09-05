import { listWorkstations } from '@/modules/control-center/workstations'
import { createWorkstationAction, setWorkstationActiveAction } from '@/modules/control-center/actions'

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

export default async function StationsAdminPage() {
  const workstations = await listWorkstations()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Estaciones de trabajo</h1>
        <p className="text-slate-600">
          Configura las estaciones físicas del salón (tinas, secadores, mesas de corte). Se usan para asignar y
          mostrar la ocupación en el Dashboard TV.
        </p>
      </div>

      <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {workstations.length === 0 && <p className="p-4 text-sm text-slate-500">Sin estaciones todavía.</p>}
        {workstations.map((station) => (
          <div key={station.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-slate-900">{station.name}</p>
              <p className="text-sm text-slate-500">{STAGE_LABEL[station.category] ?? station.category}</p>
            </div>
            <form action={setWorkstationActiveAction.bind(null, station.id, !station.active)}>
              <button
                type="submit"
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  station.active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {station.active ? 'Activa' : 'Inactiva'}
              </button>
            </form>
          </div>
        ))}
      </div>

      <details open={workstations.length === 0}>
        <summary className="cursor-pointer text-sm font-medium text-slate-700">+ Nueva estación</summary>
        <form action={createWorkstationAction} className="mt-3 grid max-w-lg gap-2 sm:grid-cols-2">
          <input name="name" required placeholder='Nombre (ej. "Tina 1")' className="input" />
          <select name="category" defaultValue="BATH" className="input">
            {Object.entries(STAGE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input name="sortOrder" type="number" placeholder="Orden (opcional)" className="input" />
          <button type="submit" className="col-span-full w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Crear estación
          </button>
        </form>
      </details>
    </div>
  )
}
