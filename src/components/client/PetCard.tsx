'use client'

import { useActionState, useRef } from 'react'
import Link from 'next/link'
import { uploadPetPhotoAction, type UploadPetPhotoState } from '@/modules/client/actions'

interface Pet {
  id: string
  name: string
  breed: string
  sizeCategory: string | null
  photos: { url: string }[]
}

const initialState: UploadPetPhotoState = { ok: false }

/** Tarjeta de mascota con avatar HD y captura de foto desde el celular (cámara o galería). */
export function PetCard({ pet }: { pet: Pet }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, formAction, pending] = useActionState(uploadPetPhotoAction.bind(null, pet.id), initialState)
  const photoUrl = pet.photos[0]?.url ?? null

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="relative h-40 w-full bg-slate-100">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={pet.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl">🐾</div>
        )}

        {pet.sizeCategory && (
          <span className="absolute left-2 top-2 rounded-full bg-slate-900/80 px-2 py-0.5 text-xs font-medium text-white">
            {pet.sizeCategory}
          </span>
        )}

        <form action={formAction}>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg shadow disabled:opacity-50"
            aria-label="Cambiar foto"
          >
            {pending ? '…' : '📷'}
          </button>
          <input
            ref={inputRef}
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="hidden"
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
          />
        </form>
      </div>

      <Link href={`/client/mascotas/${pet.id}`} className="block p-3 hover:bg-slate-50">
        <p className="font-medium text-slate-900">{pet.name}</p>
        <p className="text-sm text-slate-500">{pet.breed}</p>
      </Link>

      {state.message && !state.ok && <p className="px-3 pb-2 text-xs text-red-600">{state.message}</p>}
    </div>
  )
}
