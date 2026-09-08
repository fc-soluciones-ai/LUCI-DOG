import Link from 'next/link'
import { getHomeSummary } from '@/modules/dashboard/homeSummary'

export const dynamic = 'force-dynamic'

const SHORTCUTS = [
  { href: '/admin/appointments', label: 'Citas / Agenda', description: 'Todas las citas, filtros y agendamiento manual' },
  { href: '/groomer', label: 'Piso de trabajo', description: 'Monitor de tiempos y comandos de voz' },
  { href: '/admin/clientes', label: 'Clientes', description: 'Dueños y expedientes de mascotas' },
  { href: '/admin/facturacion', label: 'Facturación', description: 'Cierre de servicio y cobros' },
  { href: '/admin/inventario', label: 'Inventario', description: 'Consumibles e instrumental' },
  { href: '/admin/reportes', label: 'Reportes', description: 'Panel ejecutivo e inteligencia financiera' },
  { href: '/admin/usuarios', label: 'Usuarios', description: 'Cuentas de staff y roles' },
]

export default async function AdminHomePage() {
  const summary = await getHomeSummary()

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Panel de Administración</h1>
      <p className="text-slate-600">Estado de hoy y accesos rápidos a la operación de GroomingOS.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Link href="/admin/appointments" className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400">
          <p className="text-xs uppercase tracking-wide text-slate-500">Citas de hoy</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.appointmentsToday.total}</p>
          <p className="mt-1 text-xs text-slate-500">
            {summary.appointmentsToday.pending} pendientes de confirmación · {summary.appointmentsToday.completed} completadas
          </p>
        </Link>

        <Link
          href="/admin/inventario"
          className={`rounded-lg border p-4 hover:border-slate-400 ${
            summary.lowStockCount > 0 ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
          }`}
        >
          <p className="text-xs uppercase tracking-wide text-slate-500">Alertas de stock</p>
          <p className={`mt-1 text-2xl font-semibold ${summary.lowStockCount > 0 ? 'text-red-800' : 'text-slate-900'}`}>
            {summary.lowStockCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {summary.lowStockCount > 0 ? 'productos bajo el mínimo' : 'stock de productos al día'}
          </p>
        </Link>

        <Link
          href="/admin/facturacion"
          className={`rounded-lg border p-4 hover:border-slate-400 ${
            summary.billingPendingCount > 0 ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'
          }`}
        >
          <p className="text-xs uppercase tracking-wide text-slate-500">Facturación pendiente</p>
          <p className={`mt-1 text-2xl font-semibold ${summary.billingPendingCount > 0 ? 'text-amber-800' : 'text-slate-900'}`}>
            {summary.billingPendingCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">cierres y comprobantes por revisar</p>
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SHORTCUTS.map((shortcut) => (
          <Link
            key={shortcut.href}
            href={shortcut.href}
            className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400"
          >
            <p className="font-medium text-slate-900">{shortcut.label}</p>
            <p className="mt-1 text-sm text-slate-500">{shortcut.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
