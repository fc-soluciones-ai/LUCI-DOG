'use client'

import { useEffect, useRef, useState, type DragEvent, type MouseEvent } from 'react'
import { compressImageIfNeeded, formatMB, MAX_UPLOAD_BYTES, replaceInputFile, validateUploadSize } from '@/lib/client/imageUpload'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface Props {
  name?: string
  removeFieldName?: string
  initialImageUrl?: string | null
  /** Avisa al form contenedor mientras la imagen se está comprimiendo, para deshabilitar "Guardar" y no enviar antes de tiempo. */
  onPreparingChange?: (preparing: boolean) => void
}

/**
 * Subida de imagen con drag-and-drop, selector de archivo, compresión
 * automática y vista previa. "Tomar foto" abre la cámara en vivo dentro de
 * la propia página (getUserMedia) en vez de delegar en el selector nativo
 * del sistema — en varios Android/iOS ese selector ignora `capture` y solo
 * ofrece la galería. Si el navegador no soporta cámara en vivo (o el
 * usuario niega el permiso), cae al `<input capture>` como respaldo.
 */
export function ImageUploader({ name = 'image', removeFieldName = 'removeImage', initialImageUrl, onPreparingChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [preview, setPreview] = useState<string | null>(initialImageUrl ?? null)
  const [removed, setRemoved] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [openingCamera, setOpeningCamera] = useState(false)

  useEffect(() => {
    if (videoRef.current && cameraStream) videoRef.current.srcObject = cameraStream
    return () => {
      cameraStream?.getTracks().forEach((track) => track.stop())
    }
  }, [cameraStream])

  async function openCamera() {
    setError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click()
      return
    }
    setOpeningCamera(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      setCameraStream(stream)
    } catch {
      // Permiso denegado o sin cámara disponible — respaldo al selector del sistema.
      cameraInputRef.current?.click()
    } finally {
      setOpeningCamera(false)
    }
  }

  function closeCamera() {
    setCameraStream(null)
  }

  function capturePhoto() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      closeCamera()
      return
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        closeCamera()
        if (blob) void applyFile(new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.9
    )
  }

  async function applyFile(file: File | undefined) {
    setError(null)
    if (!file || !inputRef.current) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Formato no soportado. Usa JPG, PNG o WEBP.')
      inputRef.current.value = ''
      return
    }

    setPreparing(true)
    onPreparingChange?.(true)
    const prepared = await compressImageIfNeeded(file)
    setPreparing(false)
    onPreparingChange?.(false)

    const sizeError = validateUploadSize(prepared)
    if (sizeError) {
      setError(`${sizeError} Intenta con una imagen más liviana.`)
      inputRef.current.value = ''
      return
    }

    if (prepared !== file) replaceInputFile(inputRef.current, prepared)
    setPreview(URL.createObjectURL(prepared))
    setRemoved(false)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragOver(false)
    const file = event.dataTransfer.files?.[0]
    if (file && inputRef.current) {
      inputRef.current.files = event.dataTransfer.files
      void applyFile(file)
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
      <div className="mb-1 flex justify-end">
        <button
          type="button"
          disabled={openingCamera}
          onClick={(event) => {
            event.stopPropagation()
            void openCamera()
          }}
          className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:underline disabled:opacity-50"
        >
          {openingCamera ? 'Abriendo cámara…' : '📷 Tomar foto'}
        </button>
      </div>

      {cameraStream && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} autoPlay playsInline muted className="max-h-full max-w-full" />
          <div className="absolute inset-x-0 bottom-8 flex items-center justify-center gap-8">
            <button
              type="button"
              onClick={closeCamera}
              className="rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={capturePhoto}
              aria-label="Capturar foto"
              className="h-16 w-16 rounded-full border-4 border-white bg-white/30 active:bg-white/50"
            />
          </div>
        </div>
      )}
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
        {preparing ? (
          <span className="text-slate-500">⏳ Preparando imagen...</span>
        ) : preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Vista previa" className="h-32 w-32 rounded-lg object-cover" />
        ) : (
          <>
            <span className="text-2xl">🖼️</span>
            <span className="text-slate-500">Arrastra una imagen o haz clic para elegirla</span>
            <span className="text-xs text-slate-400">JPG, PNG o WEBP · máx. {formatMB(MAX_UPLOAD_BYTES)}</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept="image/*"
          className="hidden"
          onChange={(event) => void applyFile(event.target.files?.[0])}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => void applyFile(event.target.files?.[0])}
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
