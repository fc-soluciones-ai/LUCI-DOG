import Link from 'next/link'

export const dynamic = 'force-dynamic'

const SHORTCUTS = [
  { href: '/groomer', label: 'Piso de trabajo', description: 'Monitor de tiempos y comandos de voz' },
  { href: '/admin/clientes', label: 'Clientes', description: 'Dueños y expedientes de mascotas' },
  { href: '/admin/facturacion', label: 'Facturación', description: 'Cierre de servicio y cobros' },
  { href: '/admin/inventario', label: 'Inventario', description: 'Consumibles e instrumental' },
  { href: '/admin/reportes', label: 'Reportes', description: 'Panel ejecutivo e inteligencia financiera' },
  { href: '/admin/usuarios', label: 'Usuarios', description: 'Cuentas de staff y roles' },
]

export default function AdminHomePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Panel de Administración</h1>
      <p className="text-slate-600">Accesos rápidos a la operación de GroomingOS.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
