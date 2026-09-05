import Link from 'next/link'
import { searchTutors } from '@/modules/crm/tutors'

export const dynamic = 'force-dynamic'

const BILLING_LABEL: Record<string, string> = {
  PAID: 'Al corriente',
  PENDING_PROOF: 'Comprobante pendiente',
  OVERDUE: 'Vencido',
  BLOCKED: 'Bloqueado',
  MANUALLY_UNBLOCKED: 'Desbloqueado manualmente',
}

const BILLING_COLOR: Record<string, string> = {
  PAID: 'bg-green-100 text-green-800',
  PENDING_PROOF: 'bg-amber-100 text-amber-800',
  OVERDUE: 'bg-red-100 text-red-800',
  BLOCKED: 'bg-red-100 text-red-800',
  MANUALLY_UNBLOCKED: 'bg-slate-100 text-slate-700',
}

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const tutors = await searchTutors(q)

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Clientes</h1>
        <Link href="/clientes/new" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Nuevo cliente
        </Link>
      </div>

      <form className="mt-4" method="get">
        <input name="q" defaultValue={q ?? ''} placeholder="Buscar por nombre o WhatsApp..." className="input max-w-sm" />
      </form>

      <div className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {tutors.length === 0 && <p className="p-4 text-sm text-slate-500">Sin clientes todavía.</p>}
        {tutors.map((tutor) => (
          <Link
            key={tutor.id}
            href={`/clientes/${tutor.id}`}
            className="flex items-center justify-between p-4 hover:bg-slate-50"
          >
            <div>
              <p className="font-medium text-slate-900">{tutor.fullName}</p>
              <p className="text-sm text-slate-500">
                {tutor.phoneWhatsApp} · {tutor._count.pets} mascota{tutor._count.pets === 1 ? '' : 's'}
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${BILLING_COLOR[tutor.billingStatus]}`}>
              {BILLING_LABEL[tutor.billingStatus]}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
