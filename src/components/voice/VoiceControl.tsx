'use client'

import { useEffect, useRef, useState } from 'react'

// La Web Speech API es experimental y no forma parte del lib.dom.d.ts
// estándar de TypeScript, de ahí los `any` puntuales en este archivo.

interface Props {
  onCommand: (transcript: string) => void
}

export function VoiceControl({ onCommand }: Props) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const [lastTranscript, setLastTranscript] = useState('')
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSupported(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'es-MX'
    recognition.continuous = true
    recognition.interimResults = false

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim()
      setLastTranscript(transcript)
      onCommand(transcript)
    }

    recognition.onend = () => {
      if (recognitionRef.current?.shouldRestart) {
        recognition.start()
      } else {
        setListening(false)
      }
    }

    recognitionRef.current = recognition

    return () => {
      recognition.shouldRestart = false
      recognition.stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggle() {
    const recognition = recognitionRef.current
    if (!recognition) return

    if (listening) {
      recognition.shouldRestart = false
      recognition.stop()
      setListening(false)
    } else {
      recognition.shouldRestart = true
      recognition.start()
      setListening(true)
    }
  }

  if (!supported) {
    return (
      <p className="text-sm text-slate-500">
        Comandos de voz no disponibles en este navegador (usa Chrome o Edge de escritorio).
      </p>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <button
        onClick={toggle}
        className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${listening ? 'bg-red-600' : 'bg-slate-900'}`}
      >
        {listening ? '● Escuchando (clic para detener)' : '● Activar comandos de voz'}
      </button>
      {lastTranscript && <p className="mt-2 text-sm text-slate-500">Último comando: &quot;{lastTranscript}&quot;</p>}
      <p className="mt-2 text-xs text-slate-400">
        Ej: &quot;Inicio con el baño de Coquito&quot;, &quot;Inicio con el corte de Firulais&quot;, &quot;Finalizar
        servicio&quot;
      </p>
    </div>
  )
}
