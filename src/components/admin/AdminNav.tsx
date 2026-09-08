'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  label: string
  external?: boolean
}

interface NavCategory {
  label: string
  items: NavItem[]
}

// Reemplaza los 15 ítems planos de antes — agrupados por lo que la
// auditoría UX encontró que el admin realmente busca junto (hallazgo de
// navegación de la auditoría UX).
const CATEGORIES: NavCategory[] = [
  {
    label: 'Operación',
    items: [
      { href: '/admin/appointments', label: 'Citas' },
      { href: '/groomer', label: 'Piso de trabajo' },
      { href: '/admin/mise-en-place', label: 'Mise en Place' },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { href: '/admin/servicios', label: 'Servicios' },
      { href: '/admin/procesos', label: 'Procesos' },
      { href: '/admin/inventario', label: 'Inventario' },
      { href: '/admin/equipos', label: 'Equipos' },
      { href: '/admin/stations', label: 'Estaciones' },
    ],
  },
  {
    label: 'Clientes',
    items: [{ href: '/admin/clientes', label: 'Clientes' }],
  },
  {
    label: 'Finanzas',
    items: [
      { href: '/admin/facturacion', label: 'Facturación' },
      { href: '/admin/reportes', label: 'Reportes' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/admin/configuracion', label: 'Configuración' },
      { href: '/admin/configuracion/branding', label: 'Marca' },
      { href: '/admin/usuarios', label: 'Usuarios' },
      { href: '/dashboard-tv', label: 'TV', external: true },
    ],
  },
]

export function AdminNav() {
  const pathname = usePathname()
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpenIndex(null)
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpenIndex(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  useEffect(() => {
    setOpenIndex(null)
  }, [pathname])

  return (
    <nav ref={rootRef} className="flex flex-wrap gap-1 text-sm text-slate-600">
      {CATEGORIES.map((category, index) => {
        const isActive = category.items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
        const isOpen = openIndex === index
        return (
          <div key={category.label} className="relative">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 hover:bg-slate-100 ${
                isActive ? 'font-semibold text-slate-900' : ''
              }`}
            >
              {category.label}
              <span className="text-[10px] text-slate-400">▾</span>
            </button>

            {isOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 min-w-[180px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {category.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    target={item.external ? '_blank' : undefined}
                    className={`block px-3 py-2 text-sm hover:bg-slate-50 ${
                      pathname === item.href ? 'font-medium text-slate-900' : 'text-slate-600'
                    }`}
                    onClick={() => setOpenIndex(null)}
                  >
                    {item.label}
                    {item.external ? ' ↗' : ''}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
