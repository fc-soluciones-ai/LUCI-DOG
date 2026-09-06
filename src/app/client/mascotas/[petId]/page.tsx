import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/modules/auth/profile'
import { getClientPetDetail, getClientPetHistory } from '@/modules/client/portal'

export const dynamic = 'force-dynamic'

const SENSITIVITY_LABEL: Record<string, string> = {
  NONE: 'Ninguna',
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
}

export default async function ClientPetDetailPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params
  const profile = await requireRole(['CLIENT'])
  const pet = await getClientPetDetail(profile.tutorId!, petId)
  if (!pet) notFound()

  const history = await getClientPetHistory(profile.tutorId!, petId)

  return (
    <div className="space-y-8">
      <div>
        <Link href="/client/mascotas" className="text-sm text-slate-500 hover:text-slate-900">
          ← Mis Mascotas
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{pet.name}</h1>
        <p className="text-slate-600">
          {pet.breed}
          {pet.sizeCategory ? ` · ${pet.sizeCategory}` : ''}
        </p>
      </div>

      <section>
        <h2 className="text-lg font-medium text-slate-900">Ficha clínica</h2>
        <p className="mt-1 text-sm text-slate-500">
          Esta información la mantiene actualizada el salón; contáctanos por WhatsApp si notas algo desactualizado.
        </p>
        <dl className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Alergias</dt>
            <dd className="text-slate-900">{pet.clinicalRecord?.allergies.join(', ') || '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Vacunas</dt>
            <dd className="text-slate-900">{pet.clinicalRecord?.vaccinations.join(', ') || '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Sensibilidad acústica</dt>
            <dd className="text-slate-900">{SENSITIVITY_LABEL[pet.clinicalRecord?.acousticSensitivity ?? 'NONE']}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Reactividad</dt>
            <dd className="text-slate-900">{SENSITIVITY_LABEL[pet.clinicalRecord?.reactivity ?? 'NONE']}</dd>
          </div>
        </dl>
      </section>

      {pet.photos.length > 0 && (
        <section>
          <h2 className="text-lg font-medium text-slate-900">Fotos</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {pet.photos.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={photo.id} src={photo.url} alt={photo.type} className="h-32 w-full rounded-lg object-cover" />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-medium text-slate-900">Historial de servicios</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Aún no hay servicios completados.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {history.map((appointment) => (
              <div key={appointment.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="font-medium text-slate-900">{appointment.service.name}</p>
                <p className="text-sm text-slate-500">
                  {appointment.scheduledStart.toLocaleDateString('es-CR', { dateStyle: 'medium' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
