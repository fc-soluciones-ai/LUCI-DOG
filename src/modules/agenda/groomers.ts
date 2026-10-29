import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ValidationError } from './errors'

const BOOKABLE_GROOMER_WHERE = { OR: [{ role: Role.GROOMER }, { isGroomer: true }], active: true }

/** Groomers que un cliente puede elegir al reservar (incluye admins marcados "también hace grooming"). */
export async function listBookableGroomers() {
  return prisma.staff.findMany({
    where: BOOKABLE_GROOMER_WHERE,
    select: { id: true, fullName: true },
    orderBy: { fullName: 'asc' },
  })
}

/** Valida que el groomer elegido por el cliente exista y siga activo; undefined = "cualquier groomer". */
export async function assertBookableGroomer(groomerId?: string | null): Promise<string | undefined> {
  if (!groomerId) return undefined
  const groomer = await prisma.staff.findFirst({ where: { id: groomerId, ...BOOKABLE_GROOMER_WHERE }, select: { id: true } })
  if (!groomer) throw new ValidationError('El groomer elegido ya no está disponible. Elige otro o "Cualquier groomer".')
  return groomer.id
}
