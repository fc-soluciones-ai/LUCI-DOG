export interface ParsedServiceDescription {
  items: string[]
  note: string | null
}

/**
 * Las descripciones de servicio son texto plano corrido con una "NOTA:"
 * pegada al final (ej. "Baño,secado,...,accesorio NOTA:El baño no aplica en
 * perros anudados") — se leía como dato crudo de base de datos (auditoría
 * UX). Esto lo separa en una lista de puntos + un aviso aparte, sin tocar el
 * dato guardado.
 */
export function parseServiceDescription(description: string | null): ParsedServiceDescription {
  if (!description) return { items: [], note: null }

  const noteMatch = description.match(/nota\s*:\s*(.+)$/i)
  const note = noteMatch ? noteMatch[1].trim() : null
  const main = noteMatch ? description.slice(0, noteMatch.index).trim() : description.trim()

  const items = main
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  return { items, note }
}
