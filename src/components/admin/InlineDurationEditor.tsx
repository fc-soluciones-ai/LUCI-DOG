'use client'

import { useState, type KeyboardEvent } from 'react'

interface Props {
  processStepId: string
  initialMinutes: number
  onSave: (processStepId: string, minutes: number) => Promise<void>
}

/** Edición en línea de la duración estándar de una etapa: guarda al perder foco o con Enter. */
export function InlineDurationEditor({ processStepId, initialMinutes, onSave }: Props) {
  const [minutes, setMinutes] = useState(initialMinutes)
  const [saving, setSaving] = useState(false)

  async function commit() {
    if (saving || minutes === initialMinutes || minutes <= 0) return
    setSaving(true)
    await onSave(processStepId, minutes)
    setSaving(false)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.blur()
    }
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="number"
        min={1}
        value={minutes}
        disabled={saving}
        onChange={(event) => setMinutes(Number(event.target.value))}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="w-14 rounded border border-slate-300 px-1 py-0.5 text-right text-xs"
      />
      <span className="text-slate-500">min</span>
    </span>
  )
}
