import Link from 'next/link'
import type { ReactNode } from 'react'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <span className="font-semibold text-slate-900">GroomingOS</span>
          <nav className="flex gap-4 text-sm text-slate-600">
            <Link href="/dashboard" className="hover:text-slate-900">
              Dashboard
            </Link>
            <Link href="/clientes" className="hover:text-slate-900">
              Clientes
            </Link>
            <Link href="/mise-en-place" className="hover:text-slate-900">
              Mise en Place
            </Link>
            <Link href="/inventario" className="hover:text-slate-900">
              Inventario
            </Link>
            <Link href="/equipos" className="hover:text-slate-900">
              Equipos
            </Link>
            <Link href="/admin/stations" className="hover:text-slate-900">
              Estaciones
            </Link>
            <Link href="/admin/pipelines" className="hover:text-slate-900">
              Pipelines
            </Link>
            <Link href="/dashboard-tv" target="_blank" className="hover:text-slate-900">
              TV ↗
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
    </div>
  )
}
