import { prisma } from '@/lib/prisma'
import { formatInBusinessTz } from '@/modules/agenda/timezone'

export type VaccineStatus = 'EXPIRED' | 'EXPIRING_SOON' | 'OK'

const EXPIRING_SOON_DAYS = 30
const DEFAULT_VALIDITY_MONTHS = 12

interface VaccineLike {
  name: string
  expiresAt: Date
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

/** "2026-03-10" → "10/03/2026" */
export function formatVaccineDate(date: Date) {
  const [year, month, day] = dayKey(date).split('-')
  return `${day}/${month}/${year}`
}

/** Compara por día calendario en hora de Costa Rica (expiresAt es una columna DATE, sin hora). */
export function vaccineStatus(expiresAt: Date, now = new Date()): VaccineStatus {
  const today = formatInBusinessTz(now, 'yyyy-MM-dd')
  const expiry = dayKey(expiresAt)
  if (expiry < today) return 'EXPIRED'

  const soon = new Date(`${today}T00:00:00Z`)
  soon.setUTCDate(soon.getUTCDate() + EXPIRING_SOON_DAYS)
  return expiry <= dayKey(soon) ? 'EXPIRING_SOON' : 'OK'
}

/** Si hay una dosis más reciente de la misma vacuna (ej. refuerzo anual), la vencida anterior ya no cuenta. */
function latestPerName<T extends VaccineLike>(vaccines: T[]): T[] {
  const latest = new Map<string, T>()
  for (const vaccine of vaccines) {
    const key = vaccine.name.trim().toLowerCase()
    const current = latest.get(key)
    if (!current || vaccine.expiresAt > current.expiresAt) latest.set(key, vaccine)
  }
  return [...latest.values()]
}

/** Texto de alerta para mostrar al agendar (null si todo está al día). Prioriza "vencida" sobre "por vencer". */
export function vaccineAlertText(vaccines: VaccineLike[]): string | null {
  const current = latestPerName(vaccines)
  const describe = (list: VaccineLike[]) => list.map((v) => `${v.name} (${formatVaccineDate(v.expiresAt)})`).join(', ')

  const expired = current.filter((v) => vaccineStatus(v.expiresAt) === 'EXPIRED')
  if (expired.length > 0) return `Vacuna vencida: ${describe(expired)}`

  const soon = current.filter((v) => vaccineStatus(v.expiresAt) === 'EXPIRING_SOON')
  if (soon.length > 0) return `Vacuna por vencer: ${describe(soon)}`

  return null
}

export async function listPetVaccines(petId: string) {
  return prisma.petVaccine.findMany({ where: { petId }, orderBy: { expiresAt: 'desc' } })
}

export interface AddVaccineInput {
  name: string
  appliedAt: Date
  expiresAt?: Date // si no viene, se asume vigencia de 12 meses desde la aplicación
}

export async function addPetVaccine(petId: string, input: AddVaccineInput) {
  const expiresAt = input.expiresAt ?? new Date(input.appliedAt)
  if (!input.expiresAt) expiresAt.setUTCMonth(expiresAt.getUTCMonth() + DEFAULT_VALIDITY_MONTHS)

  return prisma.petVaccine.create({ data: { petId, name: input.name, appliedAt: input.appliedAt, expiresAt } })
}

export async function deletePetVaccine(vaccineId: string) {
  return prisma.petVaccine.delete({ where: { id: vaccineId } })
}
