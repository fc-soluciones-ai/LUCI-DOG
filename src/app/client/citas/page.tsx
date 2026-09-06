import { requireRole } from '@/modules/auth/profile'
import { listClientAppointments } from '@/modules/client/portal'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  PENDING_CONFIRMATION: 'Pendiente de confirmación',
  CONFIRMED: 'Confirmada',
  RESCHEDULE_REQUESTED: 'Reagendamiento solicitado',
  CHECKED_IN: 'Registrada en recepción',
  IN_PROGRESS: 'En proceso',
  DELAYED: 'Retrasada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No se presentó',
}

const STATUS_COLOR: Record<string, string> = {
  PENDING_CONFIRMATION: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  RESCHEDULE_REQUESTED: 'bg-amber-100 text-amber-800',
  CHECKED_IN: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  DELAYED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-slate-100 text-slate-500',
  NO_SHOW: 'bg-slate-100 text-slate-500',
}

export default async function ClientCitasPage() {
  const profile = await requireRole(['CLIENT'])
  const appointments = await listClientAppointments(profile.tutorId!)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Mis Citas</h1>

      <div className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {appointments.length === 0 && <p className="p-4 text-sm text-slate-500">Aún no tienes citas registradas.</p>}
        {appointments.map((appointment) => (
          <div key={appointment.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium text-slate-900">
                {appointment.pet.name} — {appointment.service.name}
              </p>
              <p className="text-sm text-slate-500">
                {appointment.scheduledStart.toLocaleString('es-CR', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[appointment.status]}`}>
              {STATUS_LABEL[appointment.status] ?? appointment.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
