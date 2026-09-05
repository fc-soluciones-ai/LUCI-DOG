import type { TimeLogStatus } from '@prisma/client'

/**
 * Semáforo de procrastinación (Módulo 4): verde <=90% del tiempo estándar,
 * amarillo 90-100%, rojo con contador de exceso en tiempo real.
 */
export function computeLiveStage(
  timeLog: {
    startedAt: Date | null
    endedAt: Date | null
    standardDurationMin: number
    overrideDurationMin: number | null
    status: TimeLogStatus
  },
  now: Date
): { status: TimeLogStatus; delaySeconds: number; elapsedSeconds: number } {
  if (!timeLog.startedAt) {
    return { status: timeLog.status, delaySeconds: 0, elapsedSeconds: 0 }
  }

  const standardSeconds = (timeLog.overrideDurationMin ?? timeLog.standardDurationMin) * 60
  const endMoment = timeLog.endedAt ?? now
  const elapsedSeconds = Math.max(0, Math.floor((endMoment.getTime() - timeLog.startedAt.getTime()) / 1000))
  const ratio = elapsedSeconds / standardSeconds

  const status: TimeLogStatus = ratio <= 0.9 ? 'ON_TRACK' : ratio <= 1 ? 'WARNING' : 'DELAYED'
  const delaySeconds = Math.max(0, elapsedSeconds - standardSeconds)

  return { status, delaySeconds, elapsedSeconds }
}
