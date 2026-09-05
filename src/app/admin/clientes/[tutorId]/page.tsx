import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTutorProfile } from '@/modules/crm/tutors'
import { createPetAction } from '@/modules/crm/actions'

export const dynamic = 'force-dynamic'

const BILLING_LABEL: Record<string, string> = {
  PAID: 'Al corriente',
  PENDING_PROOF: 'Comprobante pendiente',
  OVERDUE: 'Vencido',
  BLOCKED: 'Bloqueado',
  MANUALLY_UNBLOCKED: 'Desbloqueado manualmente',
}

export default async function TutorDetailPage({ params }: { params: Promise<{ tutorId: string }> }) {
  const { tutorId } = await params
  const tutor = await getTutorProfile(tutorId).catch(() => null)
  if (!tutor) notFound()

  return (
    <div>
      <Link href="/admin/clientes" className="text-sm text-slate-500 hover:text-slate-900">
        ← Clientes
      </Link>

      <div className="mt-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{tutor.fullName}</h1>
          <p className="text-slate-600">{tutor.phoneWhatsApp}</p>
          {tutor.email && <p className="text-slate-600">{tutor.email}</p>}
          {tutor.address && <p className="text-slate-600">{tutor.address}</p>}
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
          {BILLING_LABEL[tutor.billingStatus]}
        </span>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-medium text-slate-900">Mascotas</h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {tutor.pets.map((pet) => (
            <Link
              key={pet.id}
              href={`/admin/mascotas/${pet.id}`}
              className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400"
            >
              <p className="font-medium text-slate-900">{pet.name}</p>
              <p className="text-sm text-slate-500">
                {pet.breed}
                {pet.sizeCategory ? ` · ${pet.sizeCategory}` : ''}
              </p>
            </Link>
          ))}
          {tutor.pets.length === 0 && <p className="text-sm text-slate-500">Sin mascotas registradas.</p>}
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">+ Agregar mascota</summary>
          <form action={createPetAction.bind(null, tutor.id)} className="mt-3 max-w-sm space-y-3">
            <input name="name" required placeholder="Nombre" className="input" />
            <input name="breed" required placeholder="Raza" className="input" />
            <select name="sizeCategory" defaultValue="" className="input">
              <option value="">Tamaño aproximado</option>
              <option value="XS">Extra pequeño</option>
              <option value="S">Pequeño</option>
              <option value="M">Mediano</option>
              <option value="L">Grande</option>
              <option value="XL">Extra grande</option>
            </select>
            <input name="coatType" placeholder="Tipo de manto (opcional)" className="input" />
            <input name="weightEstimated" type="number" step="0.1" placeholder="Peso estimado (kg)" className="input" />
            <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              Guardar mascota
            </button>
          </form>
        </details>
      </div>
    </div>
  )
}
