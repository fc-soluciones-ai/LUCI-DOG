'use client'

import { useActionState } from 'react'
import { resetProfilePasswordAction, type CreateUserActionState } from '@/modules/auth/actions'

const initialState: CreateUserActionState = { ok: false, message: '' }

export function ResetPasswordButton({ profileId }: { profileId: string }) {
  const [state, formAction, pending] = useActionState(resetProfilePasswordAction.bind(null, profileId), initialState)

  if (state.ok && state.tempPassword) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-2 text-xs text-green-800">
        <p>{state.message}</p>
        <p className="mt-1 font-mono">
          {state.email} / <strong>{state.tempPassword}</strong>
        </p>
      </div>
    )
  }

  return (
    <form action={formAction}>
      <button type="submit" disabled={pending} className="text-slate-600 hover:text-slate-900 hover:underline disabled:opacity-50">
        {pending ? 'Restableciendo...' : 'Restablecer contraseña'}
      </button>
      {state.message && !state.ok && <p className="mt-1 text-xs text-red-600">{state.message}</p>}
    </form>
  )
}
