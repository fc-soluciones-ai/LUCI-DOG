import Link from 'next/link'
import { headers } from 'next/headers'
import { isWhatsAppAutomationEnabled } from '@/lib/whatsapp/adapter'
import {
  listPendingManualNotifications,
  listRebookCandidates,
  listTodaysReadyNoticeAppointments,
} from '@/modules/notifications/manual'
import { logRebookReminderAction, markNotificationSentAction, skipNotificationAction } from '@/modules/notifications/actions'
import { formatInBusinessTz } from '@/modules/agenda/timezone'
import { WhatsAppSendLink } from '@/components/admin/WhatsAppSendLink'
import { ReadyNoticeModal } from '@/components/admin/ReadyNoticeModal'
import { EmptyState } from '@/components/admin/EmptyState'

export const dynamic = 'force-dynamic'

const STAGE_LABEL: Record<string, string> = {
  T_MINUS_5_DAYS: 'Aviso 5 días antes',
  T_MINUS_24_HOURS: 'Recordatorio 24 h antes',
  T_MINUS_22_HOURS_LOCATION: 'Ubicación del salón',
  T_MINUS_15_MIN_DEPARTURE: 'Aviso de salida (15 min)',
  POST_SERVICE_RECEIPT: 'Recibo de cobro',
  DELAY_ALERT: 'Aviso de retraso',
}

const STATUS_LABEL: Record<string, string> = {
  CHECKED_IN: 'En recepción',
  IN_PROGRESS: 'En proceso',
  DELAYED: 'Retrasada',
  COMPLETED: 'Completada',
}

const WEEK_OPTIONS = [3, 4, 5, 6, 8]
const DEFAULT_WEEKS = 5

export default async function AvisosPage({ searchParams }: { searchParams: Promise<{ semanas?: string }> }) {
  const { semanas } = await searchParams
  const parsedWeeks = Number(semanas)
  const weeks = WEEK_OPTIONS.includes(parsedWeeks) ? parsedWeeks : DEFAULT_WEEKS

  const requestHeaders = await headers()
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? 'localhost:3000'
  const protocol = requestHeaders.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  const bookingUrl = `${protocol}://${host}/book`

  const [pending, readyAppointments, rebook] = await Promise.all([
    listPendingManualNotifications(),
    listTodaysReadyNoticeAppointments(),
    listRebookCandidates(weeks, bookingUrl),
  ])
  const automated = isWhatsAppAutomationEnabled()

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Avisos de WhatsApp</h1>
        <p className="text-slate-600">
          Recordatorios, aviso de &quot;está listo&quot; y clientes a quienes ya les toca volver — con el mensaje
          escrito, solo toca enviarlo.
        </p>
      </div>

      <div
        className={`rounded-lg border p-4 text-sm ${
          automated ? 'border-green-200 bg-green-50 text-green-900' : 'border-blue-200 bg-blue-50 text-blue-900'
        }`}
      >
        {automated
          ? 'Envío automático activo (Twilio): los recordatorios salen solos. Esta pantalla sirve para los avisos manuales.'
          : 'Modo WhatsApp manual: los recordatorios no salen solos. Cuando les toca aparecen aquí; toca "Enviar por WhatsApp", se abre el chat con el mensaje ya escrito y solo envías. Sin costo.'}
      </div>

      <section>
        <h2 className="text-lg font-medium text-slate-900">
          Avisos pendientes <span className="text-sm font-normal text-slate-400">({pending.length})</span>
        </h2>
        <p className="mt-1 text-sm text-slate-500">Recordatorios de citas próximas cuya hora de envío ya llegó.</p>

        <div className="mt-3 space-y-3">
          {pending.length === 0 && <EmptyState icon="✅" title="No hay avisos pendientes por enviar." />}
          {pending.map((item) => (
            <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">
                    {item.tutorName} · {item.petName}
                  </p>
                  <p className="text-sm text-slate-500">
                    {STAGE_LABEL[item.stage] ?? item.stage} · cita {item.appointmentLabel}
                  </p>
                  <p className="text-xs text-slate-400">
                    Tocaba desde {formatInBusinessTz(item.dueAt, "EEEE d 'de' MMMM, h:mm a")}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <WhatsAppSendLink href={item.whatsappUrl} onSent={markNotificationSentAction.bind(null, item.id)} />
                  <form action={skipNotificationAction.bind(null, item.id)}>
                    <button type="submit" className="text-xs text-slate-500 hover:text-slate-900 hover:underline">
                      Descartar
                    </button>
                  </form>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-900">
          Listos para avisar hoy <span className="text-sm font-normal text-slate-400">({readyAppointments.length})</span>
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Mascotas que ya llegaron hoy. Toma la foto y avísale al dueño que puede pasar a recogerla.
        </p>

        <div className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {readyAppointments.length === 0 && (
            <p className="p-4 text-sm text-slate-500">Todavía no hay mascotas en recepción hoy.</p>
          )}
          {readyAppointments.map((appointment) => (
            <div key={appointment.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium text-slate-900">
                  {appointment.pet.name} — {appointment.service.name}
                </p>
                <p className="text-sm text-slate-500">
                  {appointment.tutor.fullName} · {formatInBusinessTz(appointment.scheduledStart, 'h:mm a')} ·{' '}
                  {STATUS_LABEL[appointment.status] ?? appointment.status}
                </p>
              </div>
              <ReadyNoticeModal appointmentId={appointment.id} petName={appointment.pet.name} />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-900">
          Toca volver <span className="text-sm font-normal text-slate-400">({rebook.length})</span>
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Mascotas cuyo último servicio fue hace {weeks} semanas o más y no tienen cita próxima. Una vez que envías el
          recordatorio, no vuelve a aparecer por 14 días.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">Hace al menos:</span>
          {WEEK_OPTIONS.map((option) => (
            <Link
              key={option}
              href={option === DEFAULT_WEEKS ? '/admin/avisos' : `/admin/avisos?semanas=${option}`}
              className={`rounded-full px-3 py-1 ${
                option === weeks ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {option} semanas
            </Link>
          ))}
        </div>

        <div className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {rebook.length === 0 && <p className="p-4 text-sm text-slate-500">Nadie por recordar con este filtro.</p>}
          {rebook.map((candidate) => (
            <div key={candidate.petId} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium text-slate-900">
                  {candidate.petName} <span className="text-sm font-normal text-slate-500">· {candidate.tutorName}</span>
                </p>
                <p className="text-sm text-slate-500">
                  Último: {candidate.lastServiceName} · hace {candidate.weeksSince} semanas
                </p>
              </div>
              <WhatsAppSendLink
                href={candidate.whatsappUrl}
                label="Recordar por WhatsApp"
                onSent={logRebookReminderAction.bind(null, candidate.petId)}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
