const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const

const FAMILY_ORDER = ['Baño', 'Grooming', 'Grooming Premium', 'Otros servicios'] as const

/** Talla detectada en el nombre del servicio (ej. "Baño L 13-20Kg" → índice de "L"). */
function detectSizeIndex(name: string): number {
  // De mayor a menor para no confundir "L" con la "L" dentro de "XL"/"XXL".
  for (let i = SIZE_ORDER.length - 1; i >= 0; i--) {
    if (new RegExp(`\\b${SIZE_ORDER[i]}\\b`).test(name)) return i
  }
  return SIZE_ORDER.length
}

/**
 * Peso aproximado extraído del nombre (ej. "13-20Kg" → 13), como desempate
 * cuando el servicio no usa letras de talla (ej. la familia Grooming Premium,
 * que solo nombra rangos en kg). "menos de" resta 0.5 para que "menos de 3
 * kilos" ordene antes que "3-12".
 */
function detectWeight(name: string): number {
  const match = name.match(/(\d+)/)
  if (!match) return Number.POSITIVE_INFINITY
  const value = Number(match[1])
  return /menos de/i.test(name) ? value - 0.5 : value
}

function detectFamily(name: string): (typeof FAMILY_ORDER)[number] {
  const n = name.toLowerCase()
  if (n.startsWith('grooming premi')) return 'Grooming Premium'
  if (n.startsWith('grooming')) return 'Grooming'
  if (n.startsWith('baño') || n.startsWith('bano')) return 'Baño'
  return 'Otros servicios'
}

export interface ServiceFamilyGroup<T> {
  label: string
  services: T[]
}

/**
 * Agrupa el catálogo de servicios por familia (Baño / Grooming / Grooming
 * Premium) y los ordena por talla dentro de cada grupo — reemplaza el
 * `<select>` plano de 14 opciones casi idénticas por `<optgroup>`s
 * predecibles (hallazgo #3 de la auditoría UX).
 */
export function groupServicesByFamily<T extends { name: string }>(services: T[]): ServiceFamilyGroup<T>[] {
  const buckets = new Map<string, T[]>()
  for (const service of services) {
    const family = detectFamily(service.name)
    if (!buckets.has(family)) buckets.set(family, [])
    buckets.get(family)!.push(service)
  }
  for (const list of buckets.values()) {
    list.sort((a, b) => {
      const sizeDiff = detectSizeIndex(a.name) - detectSizeIndex(b.name)
      return sizeDiff !== 0 ? sizeDiff : detectWeight(a.name) - detectWeight(b.name)
    })
  }
  return FAMILY_ORDER.filter((label) => buckets.has(label)).map((label) => ({ label, services: buckets.get(label)! }))
}

// Rango de peso (kg) aproximado por talla, tomado de los propios nombres de la
// familia Baño/Grooming — sirve de respaldo para familias como Grooming
// Premium que no usan letra de talla en el nombre, solo el rango en kg.
const SIZE_WEIGHT_RANGE_KG: Record<string, [number, number]> = {
  XS: [0, 3],
  S: [0, 3],
  M: [3, 12],
  L: [13, 20],
  XL: [21, 30],
  XXL: [30, Infinity],
}

/** Extrae el rango de kg que menciona el nombre del servicio, si trae alguno. */
function extractWeightRangeKg(name: string): [number, number] | null {
  const under = name.match(/menos de\s*(\d+)/i)
  if (under) return [0, Number(under[1])]

  const rangeMatch = name.match(/(\d+)\s*-\s*(\d+)/)
  if (rangeMatch) return [Number(rangeMatch[1]), Number(rangeMatch[2])]

  const over = name.match(/(\d+)\s*kg?\.?\s*(en|de)\s*adelante/i)
  if (over) return [Number(over[1]), Infinity]

  const single = name.match(/(\d+)/)
  if (single) return [Number(single[1]), Number(single[1])]

  return null
}

/**
 * True si la talla registrada de la mascota corresponde a este servicio: por
 * letra de talla ("Baño M...") o, si el nombre no trae letra (ej. "Grooming
 * Premium 3-12"), por si el rango de kg que menciona se solapa con el rango
 * típico de esa talla.
 */
export function serviceMatchesSize(serviceName: string, petSizeCategory: string | null | undefined): boolean {
  if (!petSizeCategory) return false
  if (new RegExp(`\\b${petSizeCategory}\\b`).test(serviceName)) return true

  const petRange = SIZE_WEIGHT_RANGE_KG[petSizeCategory]
  const serviceRange = extractWeightRangeKg(serviceName)
  if (!petRange || !serviceRange) return false
  return serviceRange[0] <= petRange[1] && serviceRange[1] >= petRange[0]
}
