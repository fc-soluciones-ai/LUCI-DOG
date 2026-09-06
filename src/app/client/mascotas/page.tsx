import Link from 'next/link'
import { requireRole } from '@/modules/auth/profile'
import { listClientPets } from '@/modules/client/portal'

export const dynamic = 'force-dynamic'

export default async function ClientMascotasPage() {
  const profile = await requireRole(['CLIENT'])
  const pets = await listClientPets(profile.tutorId!)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Mis Mascotas</h1>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {pets.length === 0 && <p className="text-sm text-slate-500">Sin mascotas registradas.</p>}
        {pets.map((pet) => (
          <Link
            key={pet.id}
            href={`/client/mascotas/${pet.id}`}
            className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400"
          >
            <p className="font-medium text-slate-900">{pet.name}</p>
            <p className="text-sm text-slate-500">
              {pet.breed}
              {pet.sizeCategory ? ` · ${pet.sizeCategory}` : ''}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
