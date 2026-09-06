'use client'

import { useActionState, useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { ImageUploader } from './ImageUploader'
import { upsertServiceWithImage, type UpsertServiceState } from '@/modules/services/actions'

interface ServiceData {
  id: string
  name: string
  basePrice: number
  standardDurationMin: number
  description: string | null
  imageUrl: string | null
}

interface Props {
  mode: 'create' | 'edit'
  service?: ServiceData
}

const initialState: UpsertServiceState = { ok: false }

/** Modal de alta/edición de un servicio, con carga de imagen (drag-and-drop + preview). */
export function ServiceFormModal({ mode, service }: Props) {
  const [open, setOpen] = useState(false)
  const [preparingImage, setPreparingImage] = useState(false)
  const [state, formAction, pending] = useActionState(
    upsertServiceWithImage.bind(null, service?.id ?? null),
    initialState
  )

  useEffect(() => {
    if (state.ok) setOpen(false)
  }, [state])

  return (
    <>
      {mode === 'create' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          + Nuevo servicio
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="text-slate-600 hover:text-slate-900 hover:underline">
          Editar
        </button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={mode === 'create' ? 'Nuevo servicio' : `Editar servicio — ${service?.name}`}
      >
        <form action={formAction} className="grid gap-3">
          <ImageUploader initialImageUrl={service?.imageUrl} onPreparingChange={setPreparingImage} />

          <label className="text-sm text-slate-700">
            Nombre del servicio
            <input name="name" required defaultValue={service?.name} className="input mt-1 w-full" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm text-slate-700">
              Monto a cobrar ₡
              <input
                name="basePrice"
                type="number"
                step="0.01"
                required
                defaultValue={service?.basePrice}
                className="input mt-1 w-full"
              />
            </label>
            <label className="text-sm text-slate-700">
              Duración estándar (min)
              <input
                name="standardDurationMin"
                type="number"
                required
                defaultValue={service?.standardDurationMin}
                className="input mt-1 w-full"
              />
            </label>
          </div>

          <label className="text-sm text-slate-700">
            Descripción
            <textarea name="description" defaultValue={service?.description ?? ''} rows={2} className="input mt-1 w-full" />
          </label>

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
              {pending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
