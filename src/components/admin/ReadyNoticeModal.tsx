'use client'

import { useActionState, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ImageUploader } from './ImageUploader'
import { createReadyNoticeAction, type ReadyNoticeState } from '@/modules/notifications/actions'

const initialState: ReadyNoticeState = { ok: false }

/** "¡Toby está listo!": foto con la cámara o galería + enlace de WhatsApp con el mensaje armado. */
export function ReadyNoticeModal({ appointmentId, petName }: { appointmentId: string; petName: string }) {
  const [open, setOpen] = useState(false)
  const [preparingImage, setPreparingImage] = useState(false)
  const [state, formAction, pending] = useActionState(createReadyNoticeAction.bind(null, appointmentId), initialState)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        📸 Avisar que está listo
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={`¡${petName} está listo!`}>
        {state.ok && state.whatsappUrl ? (
          <div className="space-y-4">
            <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{state.message}</p>
            <a
              href={state.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg bg-green-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-green-700"
            >
              💬 Abrir WhatsApp y enviar
            </a>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form action={formAction} className="grid gap-3">
            <p className="text-sm text-slate-600">
              Toma o elige una foto de {petName} ya listo (opcional). Se guarda en su ficha y se le manda al dueño por
              WhatsApp.
            </p>
            <ImageUploader onPreparingChange={setPreparingImage} />
            {state.message && !state.ok && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{state.message}</div>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={pending || preparingImage}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {pending ? 'Guardando...' : 'Preparar mensaje'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  )
}
