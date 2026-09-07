'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

function isStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

/**
 * Banner flotante de "Instalar app". Chrome/Edge/Android disparan
 * `beforeinstallprompt` — lo capturamos y activamos el prompt nativo al
 * hacer clic. iOS Safari nunca dispara ese evento (no lo soporta), así que
 * ahí mostramos la instrucción manual de "Compartir → Agregar a inicio".
 */
export function InstallPWAPrompt({ appName }: { appName: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (isStandalone()) return

    if (isIos()) {
      setShowIosHint(true)
      return
    }

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  if (dismissed || (!deferredPrompt && !showIosHint)) return null

  async function handleInstallClick() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg sm:inset-x-auto sm:right-4 sm:w-80">
      {showIosHint ? (
        <p className="text-sm text-slate-700">
          Instala {appName}: toca <span className="font-medium">Compartir</span> y luego{' '}
          <span className="font-medium">&quot;Agregar a inicio&quot;</span>.
        </p>
      ) : (
        <p className="text-sm text-slate-700">Instala {appName} en tu dispositivo para acceso rápido.</p>
      )}
      <div className="flex shrink-0 items-center gap-2">
        {!showIosHint && (
          <button
            type="button"
            onClick={handleInstallClick}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
          >
            + Instalar
          </button>
        )}
        <button type="button" onClick={() => setDismissed(true)} aria-label="Cerrar" className="text-slate-400 hover:text-slate-600">
          ✕
        </button>
      </div>
    </div>
  )
}
