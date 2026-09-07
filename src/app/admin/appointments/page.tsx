import { AppointmentStatus, Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { listAppointmentsForAdmin } from '@/modules/agenda/adminAppointments'
import { formatInBusinessTz } from '@/modules/agenda/timezone'
import { AdminAppointmentFormModal } from '@/components/admin/AdminAppointmentFormModal'

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

interface SearchParams {
  status?: string
  dateFrom?: string
  dateTo?: string
  workstationId?: string
}

export default async function AdminAppointmentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const status = params.status && params.status in STATUS_LABEL ? (params.status as AppointmentStatus) : undefined

  const [appointments, services, groomers, workstations] = await Promise.all([
    listAppointmentsForAdmin({
      status,
      dateFrom: params.dateFrom ? new Date(`${params.dateFrom}T00:00:00`) : undefined,
      dateTo: params.dateTo ? new Date(`${params.dateTo}T23:59:59`) : undefined,
      workstationId: params.workstationId || undefined,
    }),
    prisma.service.findMany({
      where: { active: true },
      select: { id: true, name: true, basePrice: true, standardDurationMin: true },
      orderBy: { name: 'asc' },
    }),
    prisma.staff.findMany({ where: { role: Role.GROOMER, active: true }, select: { id: true, fullName: true }, orderBy: { fullName: 'asc' } }),
    prisma.workstation.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { sortOrder: 'asc' } }),
  ])

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Citas / Agenda</h1>
          <p className="text-slate-600">Todas las citas registradas — agenda una nueva por teléfono o WhatsApp.</p>
        </div>
        <AdminAppointmentFormModal
          services={services.map((s) => ({ ...s, basePrice: Number(s.basePrice) }))}
          groomers={groomers}
        />
      </div>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <label className="text-sm text-slate-700">
          Estado
          <select name="status" defaultValue={params.status ?? ''} className="input mt-1">
            <option value="">Todos</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-700">
          Desde
          <input type="date" name="dateFrom" defaultValue={params.dateFrom ?? ''} className="input mt-1" />
        </label>
        <label className="text-sm text-slate-700">
          Hasta
          <input type="date" name="dateTo" defaultValue={params.dateTo ?? ''} className="input mt-1" />
        </label>
        <label className="text-sm text-slate-700">
          Estación
          <select name="workstationId" defaultValue={params.workstationId ?? ''} className="input mt-1">
            <option value="">Todas</option>
            {workstations.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Filtrar
        </button>
        <a href="/admin/appointments" className="text-sm text-slate-500 hover:text-slate-900 hover:underline">
          Limpiar filtros
        </a>
      </form>

      <div className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {appointments.length === 0 && <p className="p-4 text-sm text-slate-500">Sin citas para estos filtros.</p>}
        {appointments.map((appointment) => (
          <div key={appointment.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-medium text-slate-900">
                {appointment.pet.name} — {appointment.service.name}
              </p>
              <p className="text-sm text-slate-500">
                {appointment.tutor.fullName} · {appointment.tutor.phoneWhatsApp}
              </p>
              <p className="text-sm text-slate-500">{formatInBusinessTz(appointment.scheduledStart, "d 'de' MMMM, h:mm a")}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {appointment.groomer && <span className="rounded-full bg-slate-100 px-2.5 py-1">Groomer: {appointment.groomer.fullName}</span>}
              {appointment.appointmentSteps[0]?.workstation && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1">{appointment.appointmentSteps[0].workstation.name}</span>
              )}
              <span className={`rounded-full px-2.5 py-1 font-medium ${STATUS_COLOR[appointment.status]}`}>
                {STATUS_LABEL[appointment.status] ?? appointment.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
