'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ClientLiveStatus } from '@/modules/client/liveStatus'

const REFRESH_MS = 30_000

const STATE_STYLE = {
  done: 'bg-green-100 text-green-800',
  current: 'bg-blue-600 text-white',
  pending: 'bg-slate-100 text-slate-500',
} as const

const STATE_MARK = { done: '✓ ', current: '● ', pending: '' } as const

/** Tarjeta "Tu mascota ahora": se refresca sola mientras la pestaña está visible. */
export function LiveStatusCard({ items }: { items: ClientLiveStatus[] }) {
  const router = useRouter()
  const allReady = items.every((item) => item.ready)

  useEffect(() => {
    if (allReady) return
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, REFRESH_MS)
    return () => clearInterval(timer)
  }, [allReady, router])

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium text-slate-900">Tu mascota ahora</h2>
      {items.map((item) => (
        <div
          key={item.appointmentId}
          className={`rounded-lg border p-4 ${item.ready ? 'border-green-300 bg-green-50' : 'border-blue-200 bg-blue-50'}`}
        >
          <p className="font-medium text-slate-900">{item.headline}</p>
          <p className="text-sm text-slate-500">{item.serviceName}</p>

          {item.steps.length > 0 && (
            <ol className="mt-3 flex flex-wrap gap-2">
              {item.steps.map((step, index) => (
                <li key={index} className={`rounded-full px-3 py-1 text-xs font-medium ${STATE_STYLE[step.state]}`}>
                  {STATE_MARK[step.state]}
                  {step.label}
                </li>
              ))}
            </ol>
          )}

          {item.estimatedReadyLabel && (
            <p className="mt-3 text-sm text-slate-600">Estará listo aproximadamente a las {item.estimatedReadyLabel}.</p>
          )}

          {item.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.photoUrl} alt={`${item.petName} listo`} className="mt-3 max-h-64 w-auto rounded-lg object-cover" />
          )}
        </div>
      ))}
    </section>
  )
}
