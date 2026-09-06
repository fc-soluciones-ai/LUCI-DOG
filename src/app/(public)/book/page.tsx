import { prisma } from '@/lib/prisma'
import { BookingForm } from './BookingForm'

export const dynamic = 'force-dynamic'

export default async function BookPage() {
  const services = await prisma.service.findMany({
    where: { active: true },
    select: { id: true, name: true, basePrice: true, standardDurationMin: true, imageUrl: true },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">Agenda la cita de tu peludo</h1>
      <p className="mt-1 text-slate-600">
        Reserva en minutos. Confirmamos tu horario y te avisamos por WhatsApp antes de la cita.
      </p>
      <BookingForm
        services={services.map((s) => ({ ...s, basePrice: Number(s.basePrice) }))}
      />
    </main>
  )
}
