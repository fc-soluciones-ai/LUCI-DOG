'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

interface Props {
  label: string
  dateStr: string
  prevDateStr: string
  nextDateStr: string
  todayDateStr: string
}

/** Navegación de la vista de calendario por día en Citas/Agenda — mantiene los demás filtros (estado, estación) al cambiar de día. */
export function AppointmentDayNav({ label, dateStr, prevDateStr, nextDateStr, todayDateStr }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function goTo(date: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (date === todayDateStr) params.delete('date')
    else params.set('date', date)
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => goTo(prevDateStr)}
          aria-label="Día anterior"
          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          ←
        </button>
        <button
          type="button"
          onClick={() => goTo(todayDateStr)}
          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          Hoy
        </button>
        <button
          type="button"
          onClick={() => goTo(nextDateStr)}
          aria-label="Día siguiente"
          className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        >
          →
        </button>
      </div>
      <p className="text-sm font-medium text-slate-900">{label}</p>
      <input
        type="date"
        value={dateStr}
        onChange={(event) => event.target.value && goTo(event.target.value)}
        className="input"
      />
    </div>
  )
}
