'use client'

import { useActionState } from 'react'
import { createClientUserAction, setProfileActiveAction, type CreateUserActionState } from '@/modules/auth/actions'

const initialState: CreateUserActionState = { ok: false, message: '' }

interface Props {
  tutorId: string
  hasAccess: boolean
  profileId?: string
  active?: boolean
  email?: string
  canCreate: boolean
}

/**
 * Botón para que el admin dé de alta el acceso al Portal del Cliente desde la
 * ficha del tutor. Siempre montado (nunca condicionado por `hasAccess` desde
 * el padre): revalidatePath refresca el Server Component en la misma
 * transición que useActionState resuelve, y si el padre dejara de renderizar
 * este componente al crearse el acceso, el password temporal desaparecería
 * antes de que el admin pudiera leerlo. Por eso toda la ramificación vive
 * aquí, en el estado local del componente.
 */
export function GivePortalAccessButton({ tutorId, hasAccess, profileId, active, email, canCreate }: Props) {
  const [state, formAction, pending] = useActionState(createClientUserAction.bind(null, tutorId), initialState)

  if (state.ok && state.tempPassword) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
        <p>{state.message}</p>
        <p className="mt-1 font-mono text-xs">
          {state.email} / <strong>{state.tempPassword}</strong>
        </p>
      </div>
    )
  }

  if (hasAccess) {
    return (
      <div className="flex items-center gap-3">
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'}`}>
          {active ? 'Activo' : 'Desactivado'}
        </span>
        <span className="text-sm text-slate-500">{email}</span>
        <form action={setProfileActiveAction.bind(null, profileId!, !active)}>
          <button type="submit" className="text-sm text-slate-600 hover:text-slate-900 hover:underline">
            {active ? 'Desactivar' : 'Reactivar'}
          </button>
        </form>
      </div>
    )
  }

  if (!canCreate) {
    return (
      <p className="text-sm text-slate-500">
        Este tutor necesita un correo guardado (usa &quot;Editar Datos&quot; arriba) antes de poder darle acceso al portal.
      </p>
    )
  }

  return (
    <form action={formAction} className="space-y-2">
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? 'Creando...' : 'Dar acceso al portal'}
      </button>

      {state.message && !state.ok && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{state.message}</div>
      )}
    </form>
  )
}
