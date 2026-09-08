'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

interface Props {
  statusOptions: { value: string; label: string }[]
  workstations: { id: string; name: string }[]
}

/**
 * Filtros de Citas — antes exigían clic en "Filtrar" para aplicarse
 * (hallazgo de la auditoría UX). Cada cambio navega de inmediato con los
 * query params actualizados; el Server Component vuelve a correr solo.
 */
export function AppointmentFilters({ statusOptions, workstations }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }

  const hasFilters = searchParams.toString().length > 0

  return (
    <div className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <label className="text-sm text-slate-700">
        Estado
        <select
          value={searchParams.get('status') ?? ''}
          onChange={(event) => updateParam('status', event.target.value)}
          className="input mt-1"
        >
          <option value="">Todos</option>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-slate-700">
        Desde
        <input
          type="date"
          value={searchParams.get('dateFrom') ?? ''}
          onChange={(event) => updateParam('dateFrom', event.target.value)}
          className="input mt-1"
        />
      </label>
      <label className="text-sm text-slate-700">
        Hasta
        <input
          type="date"
          value={searchParams.get('dateTo') ?? ''}
          onChange={(event) => updateParam('dateTo', event.target.value)}
          className="input mt-1"
        />
      </label>
      <label className="text-sm text-slate-700">
        Estación
        <select
          value={searchParams.get('workstationId') ?? ''}
          onChange={(event) => updateParam('workstationId', event.target.value)}
          className="input mt-1"
        >
          <option value="">Todas</option>
          {workstations.map((workstation) => (
            <option key={workstation.id} value={workstation.id}>
              {workstation.name}
            </option>
          ))}
        </select>
      </label>
      {hasFilters && (
        <button type="button" onClick={() => router.push(pathname)} className="text-sm text-slate-500 hover:text-slate-900 hover:underline">
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
