'use client'

import { useEffect, useState } from 'react'
import type { PipelineBoard } from '@/modules/control-center/pipelineBoard'
import { useRealtimeAppointmentSteps, type RealtimeAuthSession } from '@/hooks/useRealtimeAppointmentSteps'

const STAGE_CATEGORY_LABEL: Record<string, string> = {
  BATH: 'Baño',
  DRYING: 'Secado',
  HAIRCUT: 'Corte',
  NAILS: 'Uñas',
  EARS: 'Oídos',
  DESHEDDING: 'Deslanado',
  FINISHING: 'Acabado',
  OTHER: 'Otro',
}

const STATUS_BAR_COLOR: Record<string, string> = {
  ON_TRACK: 'bg-emerald-600',
  WARNING: 'bg-amber-500',
  DELAYED: 'bg-red-600 animate-pulse',
}

function pctPosition(iso: string, startHour: number, endHour: number) {
  const d = new Date(iso)
  const hours = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600
  const totalHours = endHour - startHour
  const pct = ((hours - startHour) / totalHours) * 100
  return Math.max(0, Math.min(100, pct))
}

function formatClock(iso: string) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

function formatElapsed(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function petInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || '?'
}

// Semáforo recalculado en el cliente a partir del cronómetro en vivo, para que
// el cambio verde→amarillo→rojo sea instantáneo y no dependa del próximo poll.
function liveStatus(elapsedSeconds: number, standardDurationMin: number): keyof typeof STATUS_BAR_COLOR {
  const ratio = elapsedSeconds / (standardDurationMin * 60)
  if (ratio <= 0.9) return 'ON_TRACK'
  if (ratio <= 1) return 'WARNING'
  return 'DELAYED'
}

interface Props {
  initialBoard: PipelineBoard
  tvSession: RealtimeAuthSession | null
}

export function TvBoard({ initialBoard, tvSession }: Props) {
  const [board, setBoard] = useState(initialBoard)
  // `now` arranca en null (server-safe) y solo se llena tras montar en el
  // cliente — evita mismatches de hidratación por usar `new Date()` al renderizar.
  const [now, setNow] = useState<Date | null>(null)

  async function refresh() {
    const res = await fetch('/api/dashboard-tv/board', { cache: 'no-store' })
    if (res.ok) setBoard(await res.json())
  }

  // Señal instantánea vía Supabase Realtime (WebSockets) para refrescar sin recargar.
  useRealtimeAppointmentSteps(refresh, tvSession)

  // Red de seguridad: reconciliación periódica por si el canal Realtime se cae.
  useEffect(() => {
    const interval = setInterval(refresh, 20000)
    return () => clearInterval(interval)
  }, [])

  // Cronómetro en vivo y línea de "ahora": solo corre en el cliente.
  useEffect(() => {
    setNow(new Date())
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const { workdayStartHour, workdayEndHour } = board
  const nowPct = now ? pctPosition(now.toISOString(), workdayStartHour, workdayEndHour) : null
  const hourMarks = Array.from({ length: workdayEndHour - workdayStartHour + 1 }, (_, i) => workdayStartHour + i)

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-slate-950 p-6 text-white">
      <header className="flex items-center justify-between pb-4">
        <h1 className="text-4xl font-bold tracking-tight">GroomingOS — Piso de trabajo</h1>
        <p className="text-3xl font-mono tabular-nums text-slate-300">
          {now ? now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
        </p>
      </header>

      {/* Eje X: horas */}
      <div className="relative ml-48 mb-2 h-6 shrink-0 text-lg text-slate-400">
        {hourMarks.map((h) => (
          <span
            key={h}
            className="absolute -translate-x-1/2"
            style={{ left: `${((h - workdayStartHour) / (workdayEndHour - workdayStartHour)) * 100}%` }}
          >
            {h}:00
          </span>
        ))}
      </div>

      <div className="relative flex flex-1 flex-col gap-3 overflow-hidden">
        {/* Línea de "ahora" */}
        {nowPct !== null && (
          <div
            className="pointer-events-none absolute bottom-0 top-0 z-20 w-0.5 bg-sky-400"
            style={{ left: `calc(12rem + ${nowPct}% * (100% - 12rem) / 100)` }}
          />
        )}

        {board.workstations.length === 0 && (
          <p className="text-2xl text-slate-400">Sin estaciones configuradas todavía.</p>
        )}

        {board.workstations.map((station) => {
          const blocks = board.blocksByWorkstation[station.id] ?? []
          return (
            <div key={station.id} className="flex flex-1 items-stretch gap-3">
              <div className="flex w-48 shrink-0 flex-col justify-center rounded-lg bg-slate-900 px-4">
                <p className="text-2xl font-semibold leading-tight">{station.name}</p>
                <p className="text-sm uppercase tracking-wide text-slate-400">
                  {STAGE_CATEGORY_LABEL[station.category] ?? station.category}
                </p>
              </div>

              <div className="relative flex-1 rounded-lg bg-slate-900/60">
                {blocks.map((block) => {
                  const left = pctPosition(block.displayStart, workdayStartHour, workdayEndHour)
                  const right = pctPosition(block.displayEnd, workdayStartHour, workdayEndHour)
                  const width = Math.max(right - left, 3)

                  // Cronómetro derivado de `now` (tick cada segundo) en vez del snapshot
                  // del último fetch, para que el tiempo transcurrido se vea fluido.
                  const isRunning = Boolean(block.startedAt) && !block.endedAt
                  const liveElapsed =
                    isRunning && now
                      ? Math.max(0, Math.floor((now.getTime() - new Date(block.startedAt as string).getTime()) / 1000))
                      : block.elapsedSeconds
                  const displayStatus = isRunning ? liveStatus(liveElapsed, block.standardDurationMin) : block.status

                  return (
                    <div
                      key={block.appointmentStepId}
                      className={`absolute top-1 bottom-1 flex items-center gap-3 overflow-hidden rounded-md px-3 text-white shadow-lg ${
                        STATUS_BAR_COLOR[displayStatus] ?? 'bg-slate-600'
                      } ${block.hasConflict ? 'ring-4 ring-yellow-300' : ''}`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 text-xl font-bold">
                        {block.petPhotoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={block.petPhotoUrl} alt={block.petName} className="h-full w-full object-cover" />
                        ) : (
                          petInitial(block.petName)
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xl font-bold leading-tight">{block.petName}</p>
                        <p className="truncate text-sm text-white/80">
                          {block.breed} · {block.stageName}
                        </p>
                        <p className="text-sm font-mono tabular-nums text-white/90">
                          {block.startedAt ? formatElapsed(liveElapsed) : formatClock(block.displayStart)} /{' '}
                          {block.standardDurationMin} min
                          {block.subProcessesTotal > 0 ? ` · ${block.subProcessesDone}/${block.subProcessesTotal}` : ''}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {board.unassigned.length > 0 && (
        <div className="mt-3 flex shrink-0 gap-3 overflow-x-auto rounded-lg bg-slate-900 p-3">
          <span className="shrink-0 self-center text-sm uppercase tracking-wide text-slate-400">Sin estación:</span>
          {board.unassigned.map((block) => (
            <div key={block.appointmentStepId} className="shrink-0 rounded bg-slate-800 px-3 py-1 text-sm">
              {block.petName} — {block.stageName}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
