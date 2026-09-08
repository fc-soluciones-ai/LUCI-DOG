import Link from 'next/link'

interface Props {
  icon?: string
  title: string
  action?: { label: string; href: string }
}

/**
 * Estado vacío estandarizado — antes era solo una línea de texto gris sin
 * ilustración ni CTA, repetido en Equipos, Facturación e Inventario
 * (auditoría UX).
 */
export function EmptyState({ icon = '📭', title, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-slate-300 p-8 text-center">
      <span className="text-2xl" aria-hidden>
        {icon}
      </span>
      <p className="text-sm text-slate-500">{title}</p>
      {action && (
        <Link href={action.href} className="text-sm font-medium text-slate-900 hover:underline">
          {action.label}
        </Link>
      )}
    </div>
  )
}
