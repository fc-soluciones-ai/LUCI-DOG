import { AppointmentStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * Todas las funciones de este módulo reciben `tutorId` tomado del `Profile`
 * de la sesión (nunca de un parámetro de la URL/formulario) — es el único
 * límite real de seguridad del Portal del Cliente, igual que en /admin y
 * /groomer (todo pasa por Prisma, que evade RLS).
 */

export async function getClientDashboard(tutorId: string) {
  const [tutor, nextAppointment] = await Promise.all([
    prisma.tutor.findUniqueOrThrow({ where: { id: tutorId } }),
    prisma.appointment.findFirst({
      where: {
        tutorId,
        scheduledStart: { gte: new Date() },
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] },
      },
      orderBy: { scheduledStart: 'asc' },
      include: { pet: true, service: true },
    }),
  ])

  return { tutor, nextAppointment }
}

export async function listClientAppointments(tutorId: string) {
  return prisma.appointment.findMany({
    where: { tutorId },
    orderBy: { scheduledStart: 'desc' },
    include: { pet: true, service: true },
  })
}

export async function listClientPets(tutorId: string) {
  return prisma.pet.findMany({
    where: { tutorId, active: true },
    orderBy: { createdAt: 'desc' },
    include: { photos: { where: { type: 'PROFILE' }, take: 1 } },
  })
}

/** Ficha de mascota de solo lectura — el expediente clínico lo sigue manejando el staff. */
export async function getClientPetDetail(tutorId: string, petId: string) {
  return prisma.pet.findUnique({
    where: { id: petId, tutorId },
    include: { clinicalRecord: true, photos: { orderBy: { takenAt: 'desc' } } },
  })
}

export async function getClientPetHistory(tutorId: string, petId: string) {
  return prisma.appointment.findMany({
    where: { petId, tutorId, status: AppointmentStatus.COMPLETED },
    orderBy: { scheduledStart: 'desc' },
    include: { service: { select: { name: true } } },
  })
}

/** Servicios activos ofrecidos al agendar (mismo filtro que /book). */
export async function listBookableServices() {
  return prisma.service.findMany({
    where: { active: true },
    select: { id: true, name: true, basePrice: true, standardDurationMin: true },
    orderBy: { name: 'asc' },
  })
}

export async function listClientInvoices(tutorId: string) {
  return prisma.invoice.findMany({
    where: { tutorId },
    orderBy: { createdAt: 'desc' },
    include: { items: true, appointment: { include: { pet: true, service: true } } },
  })
}
