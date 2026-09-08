import Link from 'next/link'

/**
 * "Marca" vivía como ítem de navegación hermano de "Configuración" pese a
 * ser conceptualmente una sub-sección suya (auditoría UX). Estas pestañas la
 * integran como parte de Configuración en vez de un destino aparte.
 */
export function ConfigTabs({ active }: { active: 'catalogos' | 'marca' }) {
  const TABS = [
    { key: 'catalogos', label: 'Catálogos', href: '/admin/configuracion' },
    { key: 'marca', label: 'Marca', href: '/admin/configuracion/branding' },
  ] as const

  return (
    <div className="flex gap-1 border-b border-slate-200">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            active === tab.key
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
