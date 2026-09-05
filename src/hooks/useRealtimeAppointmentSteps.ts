'use client'

import { useEffect, useRef } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

const WATCHED_TABLES = ['AppointmentStep', 'AppointmentSubProcess', 'Appointment'] as const

/**
 * Se suscribe vía Supabase Realtime a cambios en las tablas que impulsan la
 * ejecución del pipeline (iniciar etapa, completar subproceso, mover de
 * estación) y dispara `onChange` en cada evento. El Dashboard TV usa esto
 * como señal para refrescar su estado al instante, sin recargar la página.
 */
export function useRealtimeAppointmentSteps(onChange: () => void) {
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const channel = supabase.channel('dashboard-tv-changes')

    for (const table of WATCHED_TABLES) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => onChangeRef.current()
      )
    }

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
}
