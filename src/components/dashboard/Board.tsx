'use client'

import { useEffect, useRef, useState } from 'react'
import type { TodayBoard } from '@/modules/time-tracking/board'
import {
  checkInAction,
  finishStageAction,
  overrideStageAction,
  reorderStagesAction,
  runVoiceCommandAction,
  sendDelayNotificationAction,
  startStageAction,
} from '@/modules/time-tracking/actions'
import { VoiceControl } from '@/components/voice/VoiceControl'
import {
  assignWorkstationAction,
  checkInPipelineAppointmentAction,
  finishAppointmentStepAction,
  overrideAppointmentStepAction,
  startAppointmentStepAction,
  toggleSubProcessAction,
} from '@/modules/control-center/actions'

const STAGE_LABEL: Record<string, string> = {
  BATH: 'Baño',
  DRYING: 'Secado',
  HAIRCUT: 'Corte',
  NAILS: 'Uñas',
  EARS: 'Oídos',
  DESHEDDING: 'Deslanado',
  FINISHING: 'Acabado',
  OTHER: 'Otro',
}

const STATUS_COLOR: Record<string, string> = {
  ON_TRACK: 'border-green-300 bg-green-50 text-green-800',
  WARNING: 'border-amber-300 bg-amber-50 text-amber-800',
  DELAYED: 'border-red-300 bg-red-50 text-red-800',
}

function formatSeconds(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

interface Props {
  initialBoard: TodayBoard
  groomerOptions: { id: string; fullName: string }[]
}

export function Board({ initialBoard, groomerOptions }: Props) {
  const [board, setBoard] = useState(initialBoard)
  const [focusedAppointmentId, setFocusedAppointmentId] = useState<string | null>(null)
  const [voiceLog, setVoiceLog] = useState<string[]>([])
  const draggingId = useRef<string | null>(null)

  async function refresh() {
    const res = await fetch('/api/dashboard/today', { cache: 'no-store' })
    if (res.ok) setBoard(await res.json())
  }

  // Sin Redis/WebSocket en esta instancia: se aproxima "tiempo real" con
  // polling cada 5s (suficiente granularidad para el semáforo de mesa).
  useEffect(() => {
    const interval = setInterval(refresh, 5000)
    return () => clearInterval(interval)
  }, [])

  async function handleVoiceCommand(transcript: string) {
    const result = await runVoiceCommandAction(transcript, focusedAppointmentId)
    setVoiceLog((log) => [`"${transcript}" → ${result.message}`, ...log].slice(0, 8))
    await refresh()
  }

  function handleDrop(appointmentId: string, targetStageId: string) {
    const appointment = board.appointments.find((a) => a.id === appointmentId)
    const sourceId = draggingId.current
    if (!appointment || !sourceId || sourceId === targetStageId) return

    const pendingIds = appointment.stages.filter((s) => !s.startedAt).map((s) => s.id)
    const fromIndex = pendingIds.indexOf(sourceId)
    const toIndex = pendingIds.indexOf(targetStageId)
    if (fromIndex === -1 || toIndex === -1) return

    const reordered = [...pendingIds]
    reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, sourceId)

    const startedIds = appointment.stages.filter((s) => s.startedAt).map((s) => s.id)
    void reorderStagesAction(appointmentId, [...startedIds, ...reordered]).then(refresh)
  }

  return (
    <div className="mt-6 space-y-8">
      <VoiceControl onCommand={handleVoiceCommand} />

      {voiceLog.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-600">
          {voiceLog.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}

      {board.groomers.length > 0 && (
        <section className="grid gap-3 sm:grid-cols-2">
          {board.groomers.map((g) => (
            <div key={g.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <p className="font-medium text-slate-900">{g.name}</p>
              <p className="text-sm text-slate-500">
                Salida proyectada: {g.projectedExitTime ? formatTime(g.projectedExitTime) : '—'}
              </p>
            </div>
          ))}
        </section>
      )}

      {board.pendingDelayNotifications.length > 0 && (
        <section className="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h2 className="font-medium text-amber-900">Notificaciones de retraso sugeridas (Efecto en Cadena)</h2>
          <div className="mt-2 space-y-2">
            {board.pendingDelayNotifications.map((n) => (
              <div key={n.id} className="flex items-center justify-between rounded bg-white px-3 py-2 text-sm">
                <span>
                  {n.tutorName} — {n.petName}
                </span>
                <button
                  onClick={() => void sendDelayNotificationAction(n.id).then(refresh)}
                  className="rounded bg-slate-900 px-3 py-1 text-xs font-medium text-white"
                >
                  Enviar ahora
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        {board.appointments.length === 0 && <p className="text-sm text-slate-500">Sin citas para hoy.</p>}

        {board.appointments.map((appointment) => {
          const isFocused = appointment.id === focusedAppointmentId
          const needsCheckIn = ['PENDING_CONFIRMATION', 'CONFIRMED', 'DELAYED'].includes(appointment.status)

          return (
            <div
              key={appointment.id}
              onClick={() => setFocusedAppointmentId(appointment.id)}
              className={`cursor-pointer rounded-lg border bg-white p-4 ${
                isFocused ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">
                    {appointment.petName} · {appointment.serviceName}
                  </p>
                  <p className="text-sm text-slate-500">
                    {appointment.tutorName} · {formatTime(appointment.scheduledStart)}
                    {appointment.groomerName ? ` · ${appointment.groomerName}` : ''}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {appointment.status}
                </span>
              </div>

              {needsCheckIn && (
                <form
                  onClick={(e) => e.stopPropagation()}
                  onSubmit={(e) => {
                    e.preventDefault()
                    const groomerId = new FormData(e.currentTarget).get('groomerId')
                    if (!groomerId) return
                    const action = appointment.pipelineId
                      ? checkInPipelineAppointmentAction.bind(null, appointment.id)
                      : checkInAction.bind(null, appointment.id, String(groomerId))
                    void action(new FormData(e.currentTarget)).then(refresh)
                  }}
                  className="mt-3 flex gap-2"
                >
                  <select name="groomerId" required className="input max-w-xs" defaultValue="">
                    <option value="" disabled>
                      Asignar groomer
                    </option>
                    {groomerOptions.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.fullName}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">
                    Check-in {appointment.pipelineName ? `(${appointment.pipelineName})` : ''}
                  </button>
                </form>
              )}

              {appointment.pipelineSteps.length > 0 && (
                <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                  {appointment.pipelineSteps.map((step) => {
                    const colorClass = step.startedAt
                      ? (STATUS_COLOR[step.status] ?? 'border-slate-200 bg-slate-50 text-slate-700')
                      : 'border-slate-200 bg-slate-50 text-slate-700'

                    return (
                      <div key={step.id} className={`rounded border px-3 py-2 ${colorClass}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{step.stageName}</p>
                            <p className="text-xs">
                              {step.startedAt
                                ? `${formatSeconds(step.elapsedSeconds)} / ${step.standardDurationMin} min`
                                : `Estándar: ${step.standardDurationMin} min`}
                              {step.delaySeconds > 0 ? ` · +${formatSeconds(step.delaySeconds)} de atraso` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              defaultValue={step.workstationId ?? ''}
                              className="input text-xs"
                              onChange={(e) => {
                                if (e.target.value) void assignWorkstationAction(step.id, e.target.value).then(refresh)
                              }}
                            >
                              <option value="" disabled>
                                Estación
                              </option>
                              {board.workstations.map((w) => (
                                <option key={w.id} value={w.id}>
                                  {w.name}
                                </option>
                              ))}
                            </select>
                            {!step.endedAt && (
                              <input
                                type="number"
                                placeholder="override min"
                                className="w-24 rounded border border-slate-300 px-2 py-1 text-xs"
                                onBlur={(e) => {
                                  const value = Number(e.target.value)
                                  if (value > 0) void overrideAppointmentStepAction(step.id, value).then(refresh)
                                }}
                              />
                            )}
                            {!step.startedAt && (
                              <button
                                onClick={() => void startAppointmentStepAction(step.id).then(refresh)}
                                className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white"
                              >
                                Iniciar
                              </button>
                            )}
                            {step.startedAt && !step.endedAt && (
                              <button
                                onClick={() => void finishAppointmentStepAction(step.id).then(refresh)}
                                className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white"
                              >
                                Finalizar
                              </button>
                            )}
                          </div>
                        </div>

                        {step.subProcesses.length > 0 && (
                          <ul className="mt-2 flex flex-wrap gap-2">
                            {step.subProcesses.map((sub) => (
                              <li key={sub.id}>
                                <button
                                  onClick={() => void toggleSubProcessAction(step.id, sub.id).then(refresh)}
                                  className={`rounded-full px-2 py-0.5 text-xs ${
                                    sub.done ? 'bg-green-600 text-white' : 'bg-white text-slate-600 border border-slate-300'
                                  }`}
                                >
                                  {sub.done ? '✓ ' : ''}
                                  {sub.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {appointment.stages.length > 0 && (
                <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                  {appointment.stages.map((stage) => {
                    const colorClass = stage.startedAt
                      ? (STATUS_COLOR[stage.status] ?? 'border-slate-200 bg-slate-50 text-slate-700')
                      : 'border-slate-200 bg-slate-50 text-slate-700'

                    return (
                      <div
                        key={stage.id}
                        draggable={!stage.startedAt}
                        onDragStart={() => (draggingId.current = stage.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDrop(appointment.id, stage.id)}
                        className={`flex flex-wrap items-center justify-between gap-2 rounded border px-3 py-2 ${colorClass}`}
                      >
                        <div>
                          <p className="text-sm font-medium">{STAGE_LABEL[stage.stageType] ?? stage.stageType}</p>
                          <p className="text-xs">
                            {stage.startedAt
                              ? `${formatSeconds(stage.elapsedSeconds)} / ${stage.overrideDurationMin ?? stage.standardDurationMin} min`
                              : `Estándar: ${stage.overrideDurationMin ?? stage.standardDurationMin} min`}
                            {stage.delaySeconds > 0 ? ` · +${formatSeconds(stage.delaySeconds)} de atraso` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!stage.endedAt && (
                            <input
                              type="number"
                              placeholder="override min"
                              className="w-24 rounded border border-slate-300 px-2 py-1 text-xs"
                              onBlur={(e) => {
                                const value = Number(e.target.value)
                                if (value > 0) void overrideStageAction(stage.id, value).then(refresh)
                              }}
                            />
                          )}
                          {!stage.startedAt && (
                            <button
                              onClick={() => void startStageAction(stage.id).then(refresh)}
                              className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white"
                            >
                              Iniciar
                            </button>
                          )}
                          {stage.startedAt && !stage.endedAt && (
                            <button
                              onClick={() => void finishStageAction(stage.id).then(refresh)}
                              className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white"
                            >
                              Finalizar
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </section>
    </div>
  )
}
