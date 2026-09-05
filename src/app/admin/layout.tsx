import Link from 'next/link'
import type { ReactNode } from 'react'
import { requireRole } from '@/modules/auth/profile'
import { signOutAction } from '@/modules/auth/actions'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole(['ADMIN'])

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-semibold text-slate-900">GroomingOS</span>
          <nav className="flex flex-wrap gap-4 text-sm text-slate-600">
            <Link href="/groomer" className="hover:text-slate-900">
              Piso (Groomer)
            </Link>
            <Link href="/admin/clientes" className="hover:text-slate-900">
              Clientes
            </Link>
            <Link href="/admin/mise-en-place" className="hover:text-slate-900">
              Mise en Place
            </Link>
            <Link href="/admin/inventario" className="hover:text-slate-900">
              Inventario
            </Link>
            <Link href="/admin/facturacion" className="hover:text-slate-900">
              Facturación
            </Link>
            <Link href="/admin/reportes" className="hover:text-slate-900">
              Reportes
            </Link>
            <Link href="/admin/equipos" className="hover:text-slate-900">
              Equipos
            </Link>
            <Link href="/admin/stations" className="hover:text-slate-900">
              Estaciones
            </Link>
            <Link href="/admin/pipelines" className="hover:text-slate-900">
              Pipelines
            </Link>
            <Link href="/admin/usuarios" className="hover:text-slate-900">
              Usuarios
            </Link>
            <Link href="/dashboard-tv" target="_blank" className="hover:text-slate-900">
              TV ↗
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-500">
            <span>{profile.fullName}</span>
            <form action={signOutAction}>
              <button type="submit" className="hover:text-slate-900 hover:underline">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  )
}
