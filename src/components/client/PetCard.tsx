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

/**
 * Tarjeta de mascota con avatar HD y captura de foto desde el celular.
 * Dos botones/inputs separados (cámara y galería) en vez de un solo input
 * "inteligente": ni iOS en modo standalone (PWA instalada) ni el Photo
 * Picker moderno de Android Chrome muestran de forma confiable ambas
 * opciones a partir de un único <input type="file"> — Android en particular
 * omite la cámara a propósito en su Photo Picker cuando no hay `capture`.
 * Separar los botones evita depender de ese selector combinado del sistema.
 */
export function PetCard({ pet }: { pet: Pet }) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const submitInputRef = useRef<HTMLInputElement>(null)
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

    // Ambos inputs (cámara/galería) alimentan este único input "carrier" con
    // name="photo" — evita que el navegador mande dos entradas con el mismo
    // nombre (una vacía) al enviar el form.
    if (submitInputRef.current) {
      replaceInputFile(submitInputRef.current, prepared)
      submitInputRef.current.form?.requestSubmit()
    }
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
          <input ref={submitInputRef} type="file" name="photo" className="hidden" tabIndex={-1} />
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={pending || preparing}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg shadow disabled:opacity-50"
              aria-label="Tomar foto"
              title="Tomar foto"
            >
              {pending ? '…' : preparing ? '⏳' : '📷'}
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={pending || preparing}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg shadow disabled:opacity-50"
              aria-label="Elegir de galería"
              title="Elegir de galería"
            >
              🖼️
            </button>
          </div>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileSelected}
          />
          <input ref={galleryInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
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
