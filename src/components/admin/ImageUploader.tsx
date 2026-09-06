'use client'

import { useRef, useState, type DragEvent, type MouseEvent } from 'react'

const MAX_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface Props {
  name?: string
  removeFieldName?: string
  initialImageUrl?: string | null
}

/** Subida de imagen con drag-and-drop, selector de archivo y vista previa. */
export function ImageUploader({ name = 'image', removeFieldName = 'removeImage', initialImageUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(initialImageUrl ?? null)
  const [removed, setRemoved] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function applyFile(file: File | undefined) {
    setError(null)
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Formato no soportado. Usa JPG, PNG o WEBP.')
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('La imagen supera el tamaño máximo de 5 MB.')
      return
    }
    setPreview(URL.createObjectURL(file))
    setRemoved(false)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragOver(false)
    const file = event.dataTransfer.files?.[0]
    if (file && inputRef.current) {
      inputRef.current.files = event.dataTransfer.files
      applyFile(file)
    }
  }

  function handleRemove(event: MouseEvent) {
    event.stopPropagation()
    setPreview(null)
    setRemoved(true)
    setError(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <input type="hidden" name={removeFieldName} value={removed ? 'true' : 'false'} />
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center text-sm transition ${
          dragOver ? 'border-slate-900 bg-slate-50' : 'border-slate-300'
        }`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Vista previa" className="h-32 w-32 rounded-lg object-cover" />
        ) : (
          <>
            <span className="text-2xl">🖼️</span>
            <span className="text-slate-500">Arrastra una imagen o haz clic para elegirla</span>
            <span className="text-xs text-slate-400">JPG, PNG o WEBP · máx. 5 MB</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => applyFile(event.target.files?.[0])}
        />
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {preview && (
        <button type="button" onClick={handleRemove} className="mt-2 text-xs text-red-600 hover:underline">
          Eliminar foto actual
        </button>
      )}
    </div>
  )
}
