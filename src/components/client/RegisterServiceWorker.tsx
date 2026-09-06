'use client'

import { useEffect } from 'react'

/** Registra el service worker del Portal del Cliente, scoped a /client/. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/client/' }).catch(() => {})
  }, [])

  return null
}
