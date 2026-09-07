import { requireRole } from '@/modules/auth/profile'
import { listBookableServices, listClientAppointments, listClientPets } from '@/modules/client/portal'
import { cancelAppointmentByClientAction } from '@/modules/client/actions'
import { AppointmentFormModal } from '@/components/client/AppointmentFormModal'
import { DataTableActions } from '@/components/admin/DataTableActions'
import { formatInBusinessTz } from '@/modules/agenda/timezone'

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

const RESCHEDULABLE = new Set(['PENDING_CONFIRMATION', 'CONFIRMED'])
const CANCELLABLE = new Set(['PENDING_CONFIRMATION', 'CONFIRMED', 'RESCHEDULE_REQUESTED', 'CHECKED_IN', 'DELAYED'])

export default async function ClientCitasPage() {
  const profile = await requireRole(['CLIENT'])
  const [appointments, pets, services] = await Promise.all([
    listClientAppointments(profile.tutorId!),
    listClientPets(profile.tutorId!),
    listBookableServices(),
  ])

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Mis Citas</h1>
        <AppointmentFormModal
          mode="create"
          pets={pets.map((pet) => ({ id: pet.id, name: pet.name, sizeCategory: pet.sizeCategory }))}
          services={services.map((service) => ({ ...service, basePrice: Number(service.basePrice) }))}
        />
      </div>

      <div className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {appointments.length === 0 && <p className="p-4 text-sm text-slate-500">Aún no tienes citas registradas.</p>}
        {appointments.map((appointment) => (
          <div key={appointment.id} className="flex items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 items-center gap-3">
              {appointment.service.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={appointment.service.imageUrl}
                  alt={appointment.service.name}
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg">
                  ✂️
                </div>
              )}
              <div className="min-w-0">
                <p className="font-medium text-slate-900">
                  {appointment.pet.name} — {appointment.service.name}
                </p>
                <p className="text-sm text-slate-500">
                  {formatInBusinessTz(appointment.scheduledStart, "d 'de' MMMM, h:mm a")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLOR[appointment.status]}`}>
                {STATUS_LABEL[appointment.status] ?? appointment.status}
              </span>
              {RESCHEDULABLE.has(appointment.status) && (
                <AppointmentFormModal
                  mode="reschedule"
                  appointment={{
                    id: appointment.id,
                    petName: appointment.pet.name,
                    petSizeCategory: appointment.pet.sizeCategory,
                    serviceId: appointment.serviceId,
                    serviceName: appointment.service.name,
                  }}
                />
              )}
              {CANCELLABLE.has(appointment.status) && (
                <DataTableActions
                  deleteLabel="Cancelar"
                  deleteConfirmText={`¿Cancelar la cita de ${appointment.pet.name} el ${formatInBusinessTz(appointment.scheduledStart, "d 'de' MMMM")}?`}
                  onDelete={async () => {
                    'use server'
                    await cancelAppointmentByClientAction(appointment.id)
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
