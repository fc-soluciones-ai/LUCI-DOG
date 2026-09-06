import Link from 'next/link'
import { requireRole } from '@/modules/auth/profile'
import { getClientDashboard } from '@/modules/client/portal'

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

export default async function ClientHomePage() {
  const profile = await requireRole(['CLIENT'])
  const { tutor, nextAppointment } = await getClientDashboard(profile.tutorId!)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Hola, {tutor.fullName.split(' ')[0]}</h1>
        <span className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${BILLING_COLOR[tutor.billingStatus]}`}>
          {BILLING_LABEL[tutor.billingStatus]}
        </span>
      </div>

      <section>
        <h2 className="text-lg font-medium text-slate-900">Tu próxima cita</h2>
        {nextAppointment ? (
          <div className="mt-3 rounded-lg border border-slate-200 bg-white p-4">
            <p className="font-medium text-slate-900">
              {nextAppointment.pet.name} — {nextAppointment.service.name}
            </p>
            <p className="text-sm text-slate-500">
              {nextAppointment.scheduledStart.toLocaleString('es-CR', { dateStyle: 'full', timeStyle: 'short' })}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No tienes citas próximas agendadas.</p>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Link href="/client/citas" className="rounded-lg border border-slate-200 bg-white p-4 text-center hover:border-slate-400">
          Mis Citas
        </Link>
        <Link href="/client/mascotas" className="rounded-lg border border-slate-200 bg-white p-4 text-center hover:border-slate-400">
          Mis Mascotas
        </Link>
        <Link href="/client/facturas" className="rounded-lg border border-slate-200 bg-white p-4 text-center hover:border-slate-400">
          Mis Facturas
        </Link>
      </section>
    </div>
  )
}
