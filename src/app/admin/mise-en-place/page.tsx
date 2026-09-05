import { getDailyPrepPlan } from '@/modules/mise-en-place/planner'
import { regeneratePlanAction } from '@/modules/mise-en-place/actions'

export const dynamic = 'force-dynamic'

const TYPE_LABEL: Record<string, string> = {
  FORMULA: 'Mezclas cosméticas',
  INSTRUMENT: 'Instrumental',
  SAFETY_EQUIPMENT: 'Equipo de seguridad',
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10)
}

export default async function MiseEnPlacePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date } = await searchParams
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  const forDate = date ? new Date(`${date}T00:00:00`) : tomorrow
  const plan = await getDailyPrepPlan(forDate)

  const groups: Record<string, NonNullable<typeof plan>['items']> = {
    FORMULA: [],
    INSTRUMENT: [],
    SAFETY_EQUIPMENT: [],
  }
  for (const item of plan?.items ?? []) {
    groups[item.type]?.push(item)
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Mise en Place</h1>
          <p className="text-slate-600">
            Preparación para el <strong>{forDate.toLocaleDateString('es-MX', { dateStyle: 'full' })}</strong>
          </p>
        </div>
        <form action={regeneratePlanAction.bind(null, forDate.toISOString())}>
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            {plan ? 'Regenerar plan' : 'Generar plan'}
          </button>
        </form>
      </div>

      <form method="get" className="mt-4">
        <input type="date" name="date" defaultValue={toDateInputValue(forDate)} className="input max-w-xs" />
      </form>

      {!plan ? (
        <p className="mt-8 text-sm text-slate-500">
          Aún no se ha generado el plan para este día. El cron lo corre automáticamente a las 20:00 hrs del día
          anterior, o puedes generarlo manualmente con el botón de arriba.
        </p>
      ) : (
        <div className="mt-8 space-y-8">
          {(['FORMULA', 'INSTRUMENT', 'SAFETY_EQUIPMENT'] as const).map((type) => (
            <section key={type}>
              <h2 className="text-lg font-medium text-slate-900">{TYPE_LABEL[type]}</h2>
              {groups[type].length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">Nada proyectado para este día.</p>
              ) : (
                <div className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                  {groups[type].map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium text-slate-900">{item.description}</p>
                        <p className="text-sm text-slate-500">
                          Necesario: {item.quantityNeeded.toString()}
                          {type === 'FORMULA' ? ' ml' : ''} · Disponible: {item.stockAvailable.toString()}
                          {type === 'FORMULA' ? ' ml' : ''}
                        </p>
                      </div>
                      {item.stockAlert && (
                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800">
                          Alerta de stock
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
