import { prisma } from '@/lib/prisma'

export const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

const DEFAULT_OPEN_TIME = '08:00'
const DEFAULT_CLOSE_TIME = '19:00'

export interface BusinessHourRow {
  dayOfWeek: number
  isOpen: boolean
  openTime: string
  closeTime: string
}

/** Las 7 filas (una por día) — si falta alguna en la base, se completa con el default (Lun-Sáb 8-19, Dom cerrado). */
export async function listBusinessHours(): Promise<BusinessHourRow[]> {
  const rows = await prisma.businessHour.findMany({ orderBy: { dayOfWeek: 'asc' } })
  const byDay = new Map(rows.map((row) => [row.dayOfWeek, row]))

  return Array.from({ length: 7 }, (_, dayOfWeek) => {
    const existing = byDay.get(dayOfWeek)
    if (existing) return existing
    return { dayOfWeek, isOpen: dayOfWeek !== 0, openTime: DEFAULT_OPEN_TIME, closeTime: DEFAULT_CLOSE_TIME }
  })
}

/** Horario de un día específico (0=domingo ... 6=sábado) — con el mismo default si no existe la fila. */
export async function getBusinessHourForDay(dayOfWeek: number): Promise<BusinessHourRow> {
  const row = await prisma.businessHour.findUnique({ where: { dayOfWeek } })
  if (row) return row
  return { dayOfWeek, isOpen: dayOfWeek !== 0, openTime: DEFAULT_OPEN_TIME, closeTime: DEFAULT_CLOSE_TIME }
}

export async function updateBusinessHour(dayOfWeek: number, input: { isOpen: boolean; openTime: string; closeTime: string }) {
  return prisma.businessHour.upsert({
    where: { dayOfWeek },
    create: { dayOfWeek, ...input },
    update: input,
  })
}
