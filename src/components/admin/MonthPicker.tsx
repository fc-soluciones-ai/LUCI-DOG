'use client'

import { usePathname, useRouter } from 'next/navigation'

/**
 * Selector de mes de Reportes — antes exigía clic en "Ver" para aplicarse
 * (hallazgo de la auditoría UX). Cambia de mes de inmediato al elegir uno.
 */
export function MonthPicker({ initialValue }: { initialValue: string }) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-slate-600">Mes:</label>
      <input
        type="month"
        defaultValue={initialValue}
        onChange={(event) => router.push(`${pathname}?month=${event.target.value}`)}
        className="input max-w-xs"
      />
    </div>
  )
}
