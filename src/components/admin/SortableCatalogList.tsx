'use client'

import { useState, type ReactNode } from 'react'

interface SortableItem {
  id: string
  content: ReactNode
}

interface Props {
  items: SortableItem[]
  onReorder: (orderedIds: string[]) => Promise<void>
}

/**
 * Lista con reordenamiento drag-and-drop (HTML5 DnD nativo, sin dependencias
 * — mismo patrón que SubProcessList) para los catálogos de Configuración.
 * Reemplaza el campo "Orden" manual, que ya tenía colisiones reales
 * (hallazgo de la auditoría UX).
 */
export function SortableCatalogList({ items: initialItems, onReorder }: Props) {
  const [items, setItems] = useState(initialItems)
  const [dragId, setDragId] = useState<string | null>(null)

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return
    const next = [...items]
    const fromIndex = next.findIndex((item) => item.id === dragId)
    const toIndex = next.findIndex((item) => item.id === targetId)
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    setItems(next)
    setDragId(null)
    void onReorder(next.map((item) => item.id))
  }

  return (
    <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
      {items.map((item) => (
        <div
          key={item.id}
          draggable
          onDragStart={() => setDragId(item.id)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => handleDrop(item.id)}
          className={`flex items-center gap-2 p-4 ${dragId === item.id ? 'opacity-50' : ''}`}
        >
          <span className="shrink-0 cursor-move text-slate-300 hover:text-slate-500" title="Arrastrar para reordenar">
            ⠿
          </span>
          <div className="min-w-0 flex-1">{item.content}</div>
        </div>
      ))}
    </div>
  )
}
