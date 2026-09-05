'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

const WATCHED_TABLES = ['AppointmentStep', 'AppointmentSubProcess', 'Appointment'] as const

export interface RealtimeAuthSession {
  accessToken: string
  refreshToken: string
}

/**
 * Se suscribe vía Supabase Realtime a cambios en las tablas que impulsan la
 * ejecución del pipeline (iniciar etapa, completar subproceso, mover de
 * estación) y dispara `onChange` en cada evento. Si se provee `session`
 * (ej. la cuenta TV_DISPLAY), autentica el cliente de Supabase con esa
 * sesión antes de suscribirse, para que las políticas de RLS apliquen sobre
 * ese rol restringido en vez de dejar el canal anónimo.
 */
export function useRealtimeAppointmentSteps(onChange: () => void, session?: RealtimeAuthSession | null) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    let cancelled = false
    const supabase = getSupabaseBrowserClient()

    async function subscribe() {
      if (session) {
        await supabase.auth.setSession({ access_token: session.accessToken, refresh_token: session.refreshToken })
      }
      if (cancelled) return

      const channel = supabase.channel('dashboard-tv-changes')
      for (const table of WATCHED_TABLES) {
        channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => onChangeRef.current())
      }
      channel.subscribe()

      return channel
    }

    const channelPromise = subscribe()

    return () => {
      cancelled = true
      channelPromise.then((channel) => {
        if (channel) supabase.removeChannel(channel)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken])
}
