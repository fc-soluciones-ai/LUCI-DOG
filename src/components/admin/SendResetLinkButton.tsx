'use client'

import { useActionState } from 'react'
import { sendPasswordResetLinkAction, type CreateUserActionState } from '@/modules/auth/actions'

const initialState: CreateUserActionState = { ok: false, message: '' }

export function SendResetLinkButton({ profileId }: { profileId: string }) {
  const [state, formAction, pending] = useActionState(sendPasswordResetLinkAction.bind(null, profileId), initialState)

  return (
    <form action={formAction}>
      <button type="submit" disabled={pending} className="text-slate-600 hover:text-slate-900 hover:underline disabled:opacity-50">
        {pending ? 'Enviando...' : 'Enviar enlace de restablecimiento'}
      </button>
      {state.message && <p className={`mt-1 text-xs ${state.ok ? 'text-green-700' : 'text-red-600'}`}>{state.message}</p>}
    </form>
  )
}
