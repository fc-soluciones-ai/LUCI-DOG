'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { createTutorWithAccessAction, type CreateTutorState } from '@/modules/crm/actions'

const initialState: CreateTutorState = { ok: false }

export function NewTutorForm() {
  const [state, formAction, pending] = useActionState(createTutorWithAccessAction, initialState)
  const [enableAccess, setEnableAccess] = useState(false)

  if (state.ok) {
    return (
      <div className="mt-6 space-y-3">
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <p>{state.message}</p>
          {state.tempPassword && (
            <p className="mt-1 font-mono text-xs">
              {state.email} / <strong>{state.tempPassword}</strong>
            </p>
          )}
        </div>
        <Link href={`/admin/clientes/${state.tutorId}`} className="inline-block text-sm text-slate-600 hover:text-slate-900 hover:underline">
          Ver ficha del cliente →
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="mt-6 space-y-3">
      <input name="fullName" required placeholder="Nombre completo" className="input" />
      <input name="phoneWhatsApp" required placeholder="WhatsApp (con código de país)" className="input" />
      <input name="email" type="email" placeholder={enableAccess ? 'Correo (obligatorio para el portal)' : 'Correo (opcional)'} className="input" />
      <input name="address" placeholder="Dirección (opcional)" className="input" />

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="enableAccess" checked={enableAccess} onChange={(e) => setEnableAccess(e.target.checked)} />
          Habilitar acceso al Portal del Cliente
        </label>

        {enableAccess && (
          <div className="mt-3">
            <input
              name="manualPassword"
              placeholder="Contraseña inicial (déjalo vacío para generar una temporal)"
              className="input"
            />
            <p className="mt-1 text-xs text-slate-500">
              Se creará su cuenta de inmediato con rol Cliente. Comparte la contraseña por WhatsApp — no se volverá a mostrar.
            </p>
          </div>
        )}
      </div>

      {state.message && !state.ok && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{state.message}</div>
      )}

      <button type="submit" disabled={pending} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Creando...' : 'Crear cliente'}
      </button>
    </form>
  )
}
