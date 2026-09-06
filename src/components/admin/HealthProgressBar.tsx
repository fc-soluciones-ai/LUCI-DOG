interface Props {
  /** 0 a 1 — proporción de vida útil restante. */
  ratio: number
  label?: string
}

/** Barra de vida útil/desgaste: verde 80-100%, amarillo 30-79%, rojo 0-29%. */
export function HealthProgressBar({ ratio, label }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(ratio * 100)))
  const color = pct >= 80 ? 'bg-green-500' : pct >= 30 ? 'bg-amber-500' : 'bg-red-500'
  const textColor = pct >= 80 ? 'text-green-700' : pct >= 30 ? 'text-amber-700' : 'text-red-700'

  return (
    <div className="w-full max-w-[160px]">
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`mt-1 text-xs font-medium ${textColor}`}>
        {pct}% {label ?? 'vida útil'}
      </p>
    </div>
  )
}
