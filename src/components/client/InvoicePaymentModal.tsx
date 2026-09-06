'use client'

import { useActionState, useEffect, useRef, useState, type DragEvent } from 'react'
import { Modal } from '@/components/ui/Modal'
import { uploadPaymentReceiptAction } from '@/modules/client/actions'
import type { ClientActionState } from '@/modules/client/actions'
import { compressImageIfNeeded, formatMB, MAX_UPLOAD_BYTES, replaceInputFile, validateUploadSize } from '@/lib/client/imageUpload'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

interface Props {
  invoiceId: string
  paymentInfoText: string
  rejectionReason?: string | null
  triggerLabel?: string
}

const initialState: ClientActionState = { ok: false }

export function InvoicePaymentModal({ invoiceId, paymentInfoText, rejectionReason, triggerLabel = 'Subir comprobante' }: Props) {
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const [state, formAction, pending] = useActionState(uploadPaymentReceiptAction.bind(null, invoiceId), initialState)

  useEffect(() => {
    if (state.ok) setOpen(false)
  }, [state])

  async function applyFile(file: File | undefined) {
    setError(null)
    setFileName(null)
    setPreview(null)
    if (!file || !inputRef.current) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Formato no soportado. Usa JPG, PNG, WEBP o PDF.')
      inputRef.current.value = ''
      return
    }

    setPreparing(true)
    const prepared = await compressImageIfNeeded(file)
    setPreparing(false)

    const sizeError = validateUploadSize(prepared)
    if (sizeError) {
      // Un PDF no se puede comprimir — el mensaje lo deja claro cuando aplica.
      const hint = prepared.type === 'application/pdf' ? ' Usa un PDF más liviano o una foto del comprobante.' : ' Intenta con una foto más liviana.'
      setError(`${sizeError}${hint}`)
      inputRef.current.value = ''
      return
    }

    if (prepared !== file) replaceInputFile(inputRef.current, prepared)
    setFileName(prepared.name)
    setPreview(prepared.type === 'application/pdf' ? null : URL.createObjectURL(prepared))
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

  const showAccountInfo = method === 'SINPE_MOVIL' || method === 'BANK_TRANSFER'

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-slate-600 hover:text-slate-900 hover:underline">
        {triggerLabel}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Enviar comprobante de pago">
        <form action={formAction} className="grid gap-3">
          {rejectionReason && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              Tu comprobante anterior fue rechazado: {rejectionReason}. Puedes subir uno nuevo.
            </div>
          )}

          <label className="text-sm text-slate-700">
            Método de pago
            <select
              name="paymentMethod"
              required
              value={method}
              onChange={(event) => setMethod(event.target.value)}
              className="input mt-1 w-full"
            >
              <option value="" disabled>
                Selecciona un método
              </option>
              <option value="SINPE_MOVIL">SINPE Móvil</option>
              <option value="BANK_TRANSFER">Transferencia bancaria</option>
              <option value="OTHER">Otro</option>
            </select>
          </label>

          {showAccountInfo && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 whitespace-pre-line">
              {paymentInfoText}
            </div>
          )}

          <label className="text-sm text-slate-700">
            Número de referencia
            <input name="referenceNumber" placeholder="Folio SINPE / transferencia" className="input mt-1 w-full" />
          </label>

          <div>
            <p className="text-sm text-slate-700">Comprobante</p>
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
              className={`mt-1 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-4 text-center text-sm transition ${
                dragOver ? 'border-slate-900 bg-slate-50' : 'border-slate-300'
              }`}
            >
              {preparing ? (
                <span className="text-slate-500">⏳ Preparando archivo...</span>
              ) : preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Vista previa" className="h-32 w-32 rounded-lg object-cover" />
              ) : fileName ? (
                <span className="text-slate-700">📄 {fileName}</span>
              ) : (
                <>
                  <span className="text-2xl">🧾</span>
                  <span className="text-slate-500">Arrastra tu comprobante o haz clic para elegirlo</span>
                  <span className="text-xs text-slate-400">JPG, PNG, WEBP o PDF · máx. {formatMB(MAX_UPLOAD_BYTES)}</span>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                name="receipt"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(event) => void applyFile(event.target.files?.[0])}
              />
            </div>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          </div>

          {state.message && !state.ok && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{state.message}</div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending || preparing}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? 'Enviando...' : 'Enviar comprobante a verificación'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
