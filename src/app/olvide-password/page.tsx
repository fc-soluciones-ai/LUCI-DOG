'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordResetAction, type CreateUserActionState } from '@/modules/auth/actions'

const initialState: CreateUserActionState = { ok: false, message: '' }

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, initialState)

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold text-slate-900">Recuperar contraseña</h1>
      <p className="mt-1 text-slate-600">Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña.</p>

      {state.message ? (
        <div
          className={`mt-6 rounded-lg border p-3 text-sm ${
            state.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {state.message}
        </div>
      ) : (
        <form action={formAction} className="mt-6 space-y-3">
          <input name="email" type="email" required placeholder="Correo" className="input" />
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white disabled:opacity-50"
          >
            {pending ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>
      )}

      <Link href="/login" className="mt-6 text-sm text-slate-600 hover:text-slate-900 hover:underline">
        ← Volver a iniciar sesión
      </Link>
    </main>
  )
}
