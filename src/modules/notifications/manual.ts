import { AppointmentStatus, NotificationStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { WHATSAPP_STAGE_TEMPLATE, renderWhatsAppTemplate } from '@/lib/whatsapp/adapter'
import { formatInBusinessTz, zonedDayRange } from '@/modules/agenda/timezone'

const DAY_MS = 24 * 60 * 60 * 1000
const REBOOK_COOLDOWN_DAYS = 14

/** Teléfono → solo dígitos con código de país (8 dígitos = número de Costa Rica, se antepone 506). */
export function normalizeWhatsAppPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^00/, '')
  return digits.length === 8 ? `506${digits}` : digits
}

export function buildWhatsAppLink(phone: string, text: string): string {
  return `https://wa.me/${normalizeWhatsAppPhone(phone)}?text=${encodeURIComponent(text)}`
}

export interface ManualNotification {
  id: string
  stage: string
  dueAt: Date
  tutorName: string
  petName: string
  appointmentLabel: string
  text: string
  whatsappUrl: string
}

/**
 * Avisos cuya hora ya llegó y siguen en cola (sin Twilio nadie los manda solo).
 * Se omiten los de citas ya pasadas o canceladas: mandarlos sería confuso.
 */
export async function listPendingManualNotifications(): Promise<ManualNotification[]> {
  const now = new Date()
  const rows = await prisma.notificationLog.findMany({
    where: {
      status: NotificationStatus.QUEUED,
      scheduledFor: { lte: now },
      appointment: {
        scheduledStart: { gt: now },
        status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW, AppointmentStatus.COMPLETED] },
      },
    },
    include: { tutor: true, appointment: { include: { pet: true } } },
    orderBy: { scheduledFor: 'asc' },
    take: 100,
  })

  const items: ManualNotification[] = []
  for (const row of rows) {
    const templateName = WHATSAPP_STAGE_TEMPLATE[row.stage]
    if (!templateName || !row.appointment) continue

    const appointmentLabel = formatInBusinessTz(row.appointment.scheduledStart, "EEEE d 'de' MMMM, h:mm a")
    const text = await renderWhatsAppTemplate(templateName, {
      tutorName: row.tutor.fullName,
      petName: row.appointment.pet.name,
      date: formatInBusinessTz(row.appointment.scheduledStart, "d 'de' MMMM, h:mm a"),
      mapUrl: row.tutor.addressMapUrl ?? '',
      total: row.appointment.quoteFinal?.toString() ?? '',
    })

    items.push({
      id: row.id,
      stage: row.stage,
      dueAt: row.scheduledFor,
      tutorName: row.tutor.fullName,
      petName: row.appointment.pet.name,
      appointmentLabel,
      text,
      whatsappUrl: buildWhatsAppLink(row.tutor.phoneWhatsApp, text),
    })
  }
  return items
}

export interface RebookCandidate {
  petId: string
  petName: string
  tutorName: string
  lastServiceName: string
  weeksSince: number
  text: string
  whatsappUrl: string
}

/**
 * "Toca volver": mascotas cuyo último servicio completado fue hace `weeks`
 * semanas o más, sin cita futura y sin recordatorio reciente.
 */
export async function listRebookCandidates(weeks: number, bookingUrl: string): Promise<RebookCandidate[]> {
  const now = new Date()
  const cutoff = new Date(now.getTime() - weeks * 7 * DAY_MS)
  const cooldown = new Date(now.getTime() - REBOOK_COOLDOWN_DAYS * DAY_MS)

  const pets = await prisma.pet.findMany({
    where: {
      active: true,
      appointments: { some: { status: AppointmentStatus.COMPLETED } },
      NOT: [
        { appointments: { some: { scheduledStart: { gt: now }, status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW] } } } },
        { rebookReminders: { some: { sentAt: { gt: cooldown } } } },
      ],
    },
    include: {
      tutor: true,
      appointments: {
        where: { status: AppointmentStatus.COMPLETED },
        orderBy: { scheduledStart: 'desc' },
        take: 1,
        include: { service: { select: { name: true } } },
      },
    },
    take: 300,
  })

  const candidates: RebookCandidate[] = []
  for (const pet of pets) {
    const last = pet.appointments[0]
    if (!last || last.scheduledStart > cutoff) continue

    const text = await renderWhatsAppTemplate('REBOOK_REMINDER', {
      tutorName: pet.tutor.fullName,
      petName: pet.name,
      bookingUrl,
    })
    candidates.push({
      petId: pet.id,
      petName: pet.name,
      tutorName: pet.tutor.fullName,
      lastServiceName: last.service.name,
      weeksSince: Math.floor((now.getTime() - last.scheduledStart.getTime()) / (7 * DAY_MS)),
      text,
      whatsappUrl: buildWhatsAppLink(pet.tutor.phoneWhatsApp, text),
    })
  }

  return candidates.sort((a, b) => b.weeksSince - a.weeksSince).slice(0, 100)
}

const BIRTHDAY_WINDOW_DAYS = 7

export interface BirthdayCandidate {
  petId: string
  petName: string
  tutorName: string
  year: number
  age: number
  daysUntil: number
  dateLabel: string
  text: string
  whatsappUrl: string
}

function isLeapYear(year: number) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/** Mascotas que cumplen años hoy o en los próximos días, sin saludo enviado ese año. */
export async function listUpcomingBirthdays(bookingUrl: string): Promise<BirthdayCandidate[]> {
  const [todayYear, todayMonth, todayDay] = formatInBusinessTz(new Date(), 'yyyy-MM-dd').split('-').map(Number)
  const todayMs = Date.UTC(todayYear, todayMonth - 1, todayDay)

  const pets = await prisma.pet.findMany({
    where: { active: true, birthDate: { not: null }, tutor: { deletedAt: null } },
    include: { tutor: true, birthdayGreetings: { select: { year: true } } },
    take: 1000,
  })

  const candidates: BirthdayCandidate[] = []
  for (const pet of pets) {
    const birth = pet.birthDate!
    const month = birth.getUTCMonth()
    const rawDay = birth.getUTCDate()

    for (const year of [todayYear, todayYear + 1]) {
      const day = month === 1 && rawDay === 29 && !isLeapYear(year) ? 28 : rawDay
      const occurrenceMs = Date.UTC(year, month, day)
      if (occurrenceMs < todayMs) continue

      const daysUntil = Math.round((occurrenceMs - todayMs) / DAY_MS)
      const age = year - birth.getUTCFullYear()
      if (daysUntil <= BIRTHDAY_WINDOW_DAYS && age >= 1 && !pet.birthdayGreetings.some((g) => g.year === year)) {
        const text = await renderWhatsAppTemplate('BIRTHDAY', {
          tutorName: pet.tutor.fullName,
          petName: pet.name,
          age: age === 1 ? '1 año' : `${age} años`,
          bookingUrl,
        })
        candidates.push({
          petId: pet.id,
          petName: pet.name,
          tutorName: pet.tutor.fullName,
          year,
          age,
          daysUntil,
          dateLabel: formatInBusinessTz(new Date(Date.UTC(year, month, day, 18)), "EEEE d 'de' MMMM"),
          text,
          whatsappUrl: buildWhatsAppLink(pet.tutor.phoneWhatsApp, text),
        })
      }
      break
    }
  }

  return candidates.sort((a, b) => a.daysUntil - b.daysUntil)
}

export async function logBirthdayGreeting(petId: string, year: number) {
  return prisma.birthdayGreetingLog.upsert({
    where: { petId_year: { petId, year } },
    create: { petId, year },
    update: {},
  })
}

export async function markNotificationManuallySent(notificationId: string) {
  return prisma.notificationLog.updateMany({
    where: { id: notificationId, status: NotificationStatus.QUEUED },
    data: { status: NotificationStatus.SENT, sentAt: new Date() },
  })
}

export async function skipNotification(notificationId: string) {
  return prisma.notificationLog.updateMany({
    where: { id: notificationId, status: NotificationStatus.QUEUED },
    data: { status: NotificationStatus.SKIPPED },
  })
}

export async function logRebookReminder(petId: string) {
  return prisma.rebookReminderLog.create({ data: { petId } })
}

const READY_NOTICE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.IN_PROGRESS,
  AppointmentStatus.DELAYED,
  AppointmentStatus.COMPLETED,
]

/** Citas de hoy a las que ya se les puede avisar "está listo" (ya llegó la mascota). */
export async function listTodaysReadyNoticeAppointments() {
  const { start, end } = zonedDayRange(new Date())
  return prisma.appointment.findMany({
    where: { scheduledStart: { gte: start, lt: end }, status: { in: READY_NOTICE_STATUSES } },
    orderBy: { scheduledStart: 'asc' },
    include: { pet: { select: { name: true } }, tutor: { select: { fullName: true } }, service: { select: { name: true } } },
  })
}
