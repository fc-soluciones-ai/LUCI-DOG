'use client'

import { useActionState, useRef, useState, type ChangeEvent } from 'react'
import Link from 'next/link'
import { uploadPetPhotoAction, type UploadPetPhotoState } from '@/modules/client/actions'
import { compressImageIfNeeded, replaceInputFile, validateUploadSize } from '@/lib/client/imageUpload'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

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
  const [clientError, setClientError] = useState<string | null>(null)
  const [preparing, setPreparing] = useState(false)
  const photoUrl = pet.photos[0]?.url ?? null

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const file = input.files?.[0]
    setClientError(null)
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      setClientError('Ese archivo no es una imagen válida. Selecciona una foto (JPG, PNG o WEBP).')
      input.value = ''
      return
    }

    setPreparing(true)
    const prepared = await compressImageIfNeeded(file)
    setPreparing(false)

    const sizeError = validateUploadSize(prepared)
    if (sizeError) {
      setClientError(`${sizeError} Intenta con una foto más liviana.`)
      input.value = ''
      return
    }

    if (prepared !== file) replaceInputFile(input, prepared)
    input.form?.requestSubmit()
  }

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
            disabled={pending || preparing}
            className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg shadow disabled:opacity-50"
            aria-label="Cambiar foto"
          >
            {pending ? '…' : preparing ? '⏳' : '📷'}
          </button>
          <input
            ref={inputRef}
            type="file"
            name="photo"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelected}
          />
        </form>
      </div>

      <Link href={`/client/mascotas/${pet.id}`} className="block p-3 hover:bg-slate-50">
        <p className="font-medium text-slate-900">{pet.name}</p>
        <p className="text-sm text-slate-500">{pet.breed}</p>
      </Link>

      {clientError && <p className="px-3 pb-2 text-xs text-red-600">{clientError}</p>}
      {!clientError && state.message && !state.ok && <p className="px-3 pb-2 text-xs text-red-600">{state.message}</p>}
    </div>
  )
}
