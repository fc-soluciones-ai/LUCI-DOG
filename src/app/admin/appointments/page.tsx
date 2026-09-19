import { AppointmentStatus, Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { listAppointmentsForAdmin } from '@/modules/agenda/adminAppointments'
import { formatInBusinessTz, parseZonedDateTime, zonedDayOfWeek, zonedDayStart, zonedMinutesSinceMidnight } from '@/modules/agenda/timezone'
import { getBusinessHourForDay } from '@/modules/config/businessHours'
import { AdminAppointmentFormModal } from '@/components/admin/AdminAppointmentFormModal'
import { AppointmentFilters } from '@/components/admin/AppointmentFilters'
import { AppointmentDayNav } from '@/components/admin/AppointmentDayNav'
import { AppointmentDayTimeline, type TimelineAppointment } from '@/components/admin/AppointmentDayTimeline'

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
  date?: string
  workstationId?: string
}

export default async function AdminAppointmentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const status = params.status && params.status in STATUS_LABEL ? (params.status as AppointmentStatus) : undefined

  const forDate = params.date ? parseZonedDateTime(`${params.date}T00:00:00`) : zonedDayStart(new Date())
  const dateStr = formatInBusinessTz(forDate, 'yyyy-MM-dd')
  const todayDateStr = formatInBusinessTz(new Date(), 'yyyy-MM-dd')
  const dayLabelRaw = formatInBusinessTz(forDate, "EEEE d 'de' MMMM 'de' yyyy")
  const dayLabel = dayLabelRaw.charAt(0).toUpperCase() + dayLabelRaw.slice(1)
  const prevDateStr = formatInBusinessTz(new Date(forDate.getTime() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  const nextDateStr = formatInBusinessTz(new Date(forDate.getTime() + 24 * 60 * 60 * 1000), 'yyyy-MM-dd')

  const businessHour = await getBusinessHourForDay(zonedDayOfWeek(forDate))
  const [openHour] = businessHour.openTime.split(':').map(Number)
  const [closeHour] = businessHour.closeTime.split(':').map(Number)

  const [appointments, services, groomers, workstations] = await Promise.all([
    listAppointmentsForAdmin({
      date: forDate,
      status,
      workstationId: params.workstationId || undefined,
    }),
    prisma.service.findMany({
      where: { active: true },
      select: { id: true, name: true, basePrice: true, standardDurationMin: true },
      orderBy: { name: 'asc' },
    }),
    prisma.staff.findMany({
      where: { OR: [{ role: Role.GROOMER }, { isGroomer: true }], active: true },
      select: { id: true, fullName: true },
      orderBy: { fullName: 'asc' },
    }),
    prisma.workstation.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { sortOrder: 'asc' } }),
  ])

  const timelineAppointments: TimelineAppointment[] = appointments.map((appointment) => {
    const startMin = zonedMinutesSinceMidnight(appointment.scheduledStart)
    const endMinRaw = zonedMinutesSinceMidnight(appointment.scheduledEnd)
    const endMin = endMinRaw > startMin ? endMinRaw : startMin + 30 // salvaguarda si cruza medianoche

    const chips: string[] = []
    if (appointment.groomer) chips.push(appointment.groomer.fullName)
    if (appointment.appointmentSteps[0]?.workstation) chips.push(appointment.appointmentSteps[0].workstation.name)
    chips.push(STATUS_LABEL[appointment.status] ?? appointment.status)

    return {
      id: appointment.id,
      startMin,
      endMin,
      title: `${appointment.pet.name} — ${appointment.service.name}`,
      subtitle: `${appointment.tutor.fullName} · ${appointment.tutor.phoneWhatsApp}`,
      timeLabel: formatInBusinessTz(appointment.scheduledStart, 'h:mm a'),
      chips,
      statusColorClass: STATUS_COLOR[appointment.status] ?? 'bg-slate-100 text-slate-500',
    }
  })

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Citas / Agenda</h1>
          <p className="text-slate-600">Calendario del día — agenda una nueva por teléfono o WhatsApp.</p>
        </div>
        <AdminAppointmentFormModal
          services={services.map((s) => ({ ...s, basePrice: Number(s.basePrice) }))}
          groomers={groomers}
          defaultDate={dateStr}
        />
      </div>

      <AppointmentDayNav label={dayLabel} dateStr={dateStr} prevDateStr={prevDateStr} nextDateStr={nextDateStr} todayDateStr={todayDateStr} />

      <AppointmentFilters
        statusOptions={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))}
        workstations={workstations}
      />

      {!businessHour.isOpen && (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Este día está marcado como cerrado en Configuración → Horario de negocio.
        </p>
      )}

      <AppointmentDayTimeline openHour={openHour} closeHour={closeHour} appointments={timelineAppointments} />
    </div>
  )
}
