'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Modal } from '@/components/ui/Modal'

interface Props {
  /** Link opcional para "Ver ficha/expediente" (navega, no abre modal). */
  viewHref?: string
  viewLabel?: string
  /** Alternativa a viewHref: contenido de solo lectura en un modal (ej. "Ver Ficha Técnica" cuando la entidad no tiene página propia). */
  viewModal?: ReactNode
  viewModalTitle?: string
  /**
   * Campos del formulario de edición (labels + inputs, SIN <form> ni botones).
   * Debe ser JSX ya renderizado por el Server Component, no una función — una
   * función arbitraria no puede cruzar de Server a Client Component.
   */
  editFields?: ReactNode
  /** Server Action ya bindeada a la entidad (ej. updateXAction.bind(null, id)). */
  editAction?: (formData: FormData) => Promise<void>
  editLabel?: string
  editTitle?: string
  /** Server Action de eliminación/desactivación ya bindeada a la entidad. */
  onDelete?: () => Promise<void>
  deleteLabel?: string
  deleteConfirmText?: string
}

/**
 * Barra de acciones estandarizada para tablas/tarjetas de administración:
 * [Ver] (link) + [Editar] (modal con formulario) + [Eliminar] (modal de
 * confirmación, dispara un soft delete). Reutilizado en Equipos, Inventario,
 * Clientes y Usuarios.
 */
export function DataTableActions({
  viewHref,
  viewLabel = 'Ver',
  viewModal,
  viewModalTitle = 'Ficha técnica',
  editFields,
  editAction,
  editLabel = 'Editar',
  editTitle,
  onDelete,
  deleteLabel = 'Eliminar',
  deleteConfirmText = '¿Seguro que quieres eliminar este registro? Se puede reactivar solo desde soporte técnico.',
}: Props) {
  const [editing, setEditing] = useState(false)
  const [viewing, setViewing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [pending, setPending] = useState(false)

  return (
    <div className="flex items-center gap-3 text-xs font-medium">
      {viewHref && (
        <Link href={viewHref} className="text-slate-600 hover:text-slate-900 hover:underline">
          {viewLabel}
        </Link>
      )}
      {viewModal && !viewHref && (
        <button type="button" onClick={() => setViewing(true)} className="text-slate-600 hover:text-slate-900 hover:underline">
          {viewLabel}
        </button>
      )}
      {editFields && editAction && (
        <button type="button" onClick={() => setEditing(true)} className="text-slate-600 hover:text-slate-900 hover:underline">
          {editLabel}
        </button>
      )}
      {onDelete && (
        <button type="button" onClick={() => setDeleting(true)} className="text-red-600 hover:text-red-800 hover:underline">
          {deleteLabel}
        </button>
      )}

      {viewModal && !viewHref && (
        <Modal open={viewing} onClose={() => setViewing(false)} title={viewModalTitle}>
          {viewModal}
        </Modal>
      )}

      {editFields && editAction && (
        <Modal open={editing} onClose={() => setEditing(false)} title={editTitle ?? editLabel}>
          <form
            action={async (formData: FormData) => {
              await editAction(formData)
              setEditing(false)
            }}
            className="grid gap-3"
          >
            {editFields}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700">
                Cancelar
              </button>
              <button type="submit" className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">
                Guardar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {onDelete && (
        <Modal open={deleting} onClose={() => setDeleting(false)} title={deleteLabel}>
          <p className="text-sm text-slate-600">{deleteConfirmText}</p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleting(false)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={async () => {
                setPending(true)
                await onDelete()
                setPending(false)
                setDeleting(false)
              }}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? 'Eliminando...' : 'Confirmar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
