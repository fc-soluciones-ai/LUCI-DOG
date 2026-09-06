import { requireRole } from '@/modules/auth/profile'
import { listClientPets } from '@/modules/client/portal'
import { PetCard } from '@/components/client/PetCard'

export const dynamic = 'force-dynamic'

export default async function ClientMascotasPage() {
  const profile = await requireRole(['CLIENT'])
  const pets = await listClientPets(profile.tutorId!)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Mis Mascotas</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {pets.length === 0 && <p className="text-sm text-slate-500">Sin mascotas registradas.</p>}
        {pets.map((pet) => (
          <PetCard key={pet.id} pet={pet} />
        ))}
      </div>
    </div>
  )
}
