'use client'

import { useActionState } from 'react'
import { createStaffUserAction, type CreateUserActionState } from '@/modules/auth/actions'

const initialState: CreateUserActionState = { ok: false, message: '' }

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createStaffUserAction, initialState)

  return (
    <form action={formAction} className="mt-3 grid max-w-lg gap-2 sm:grid-cols-2">
      <input name="fullName" required placeholder="Nombre completo" className="input" />
      <input name="email" type="email" required placeholder="Correo" className="input" />
      <select name="role" defaultValue="GROOMER" className="input sm:col-span-2">
        <option value="GROOMER">Groomer</option>
        <option value="ADMIN">Admin</option>
      </select>
      <button
        type="submit"
        disabled={pending}
        className="col-span-full w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Creando...' : 'Crear cuenta'}
      </button>

      {state.message && (
        <div
          className={`col-span-full rounded-lg border p-3 text-sm ${
            state.ok ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <p>{state.message}</p>
          {state.tempPassword && (
            <p className="mt-1 font-mono text-xs">
              {state.email} / <strong>{state.tempPassword}</strong>
            </p>
          )}
        </div>
      )}
    </form>
  )
}
