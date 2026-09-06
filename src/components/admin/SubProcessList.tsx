'use client'

import { useState } from 'react'

interface SubProcessItem {
  id: string
  name: string
  order: number
}

interface Props {
  items: SubProcessItem[]
  onReorder: (orderedIds: string[]) => Promise<void>
  onDelete: (subProcessId: string) => Promise<void>
}

/** Lista de subprocesos con reordenamiento drag-and-drop (HTML5 DnD nativo, sin dependencias). */
export function SubProcessList({ items: initialItems, onReorder, onDelete }: Props) {
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

  if (items.length === 0) return null

  return (
    <ul className="mt-2 space-y-1 pl-4 text-xs text-slate-600">
      {items.map((item, index) => (
        <li
          key={item.id}
          draggable
          onDragStart={() => setDragId(item.id)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => handleDrop(item.id)}
          className="flex cursor-move items-center justify-between rounded border border-transparent px-1 py-0.5 hover:border-slate-200 hover:bg-slate-50"
        >
          <span>
            <span className="mr-1 text-slate-400">⠿</span>
            {index + 1}. {item.name}
          </span>
          <button type="button" onClick={() => void onDelete(item.id)} className="text-red-600 hover:underline">
            eliminar
          </button>
        </li>
      ))}
    </ul>
  )
}
