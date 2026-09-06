'use client'

import { useActionState } from 'react'
import { updatePasswordAction, type UpdatePasswordState } from '@/modules/auth/actions'

const initialState: UpdatePasswordState = { ok: false }

export default function UpdatePasswordPage() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initialState)

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold text-slate-900">Nueva contraseña</h1>
      <p className="mt-1 text-slate-600">Elige una nueva contraseña para tu cuenta.</p>

      <form action={formAction} className="mt-6 space-y-3">
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Nueva contraseña (mín. 8 caracteres)"
          className="input"
        />
        <input name="confirmPassword" type="password" required minLength={8} placeholder="Confirmar contraseña" className="input" />
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white disabled:opacity-50"
        >
          {pending ? 'Guardando...' : 'Guardar contraseña'}
        </button>
      </form>

      {state.message && !state.ok && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{state.message}</div>
      )}
    </main>
  )
}
