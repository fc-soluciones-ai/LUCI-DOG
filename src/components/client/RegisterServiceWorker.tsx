'use client'

import { useEffect } from 'react'

/** Registra el service worker compartido, scoped a la sección que lo monta (/client/, /admin/, /groomer/). */
export function RegisterServiceWorker({ scope }: { scope: string }) {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope }).catch(() => {})
  }, [scope])

  return null
}
