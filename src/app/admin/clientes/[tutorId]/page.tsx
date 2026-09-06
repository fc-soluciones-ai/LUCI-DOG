import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTutorProfile } from '@/modules/crm/tutors'
import { createPetAction, deactivatePetAction, deleteTutorAction, updateTutorAction } from '@/modules/crm/actions'
import { listActiveCustomerTags } from '@/modules/config/customerTags'
import { updateTutorTagsAction } from '@/modules/config/actions'
import { DataTableActions } from '@/components/admin/DataTableActions'
import { GivePortalAccessButton } from '@/components/admin/GivePortalAccessButton'

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
  const availableTags = await listActiveCustomerTags()

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
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
            {BILLING_LABEL[tutor.billingStatus]}
          </span>
          <DataTableActions
            editLabel="Editar Datos"
            editTitle={`Editar datos — ${tutor.fullName}`}
            editAction={updateTutorAction.bind(null, tutor.id)}
            editFields={
              <>
                <label className="text-sm text-slate-700">
                  Nombre completo
                  <input name="fullName" required defaultValue={tutor.fullName} className="input mt-1 w-full" />
                </label>
                <label className="text-sm text-slate-700">
                  WhatsApp
                  <input name="phoneWhatsApp" required defaultValue={tutor.phoneWhatsApp} className="input mt-1 w-full" />
                </label>
                <label className="text-sm text-slate-700">
                  Correo
                  <input name="email" type="email" defaultValue={tutor.email ?? ''} className="input mt-1 w-full" />
                </label>
                <label className="text-sm text-slate-700">
                  Dirección
                  <input name="address" defaultValue={tutor.address ?? ''} className="input mt-1 w-full" />
                </label>
                <label className="text-sm text-slate-700">
                  Foto del cliente (URL)
                  <input name="photoUrl" defaultValue={tutor.photoUrl ?? ''} placeholder="https://..." className="input mt-1 w-full" />
                </label>
              </>
            }
            deleteLabel="Desactivar"
            deleteConfirmText={`¿Desactivar a "${tutor.fullName}"? Se conservará su historial de citas y facturas.`}
            onDelete={async () => {
              'use server'
              await deleteTutorAction(tutor.id)
            }}
          />
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-medium text-slate-900">Acceso al portal</h2>
        <div className="mt-2">
          <GivePortalAccessButton
            tutorId={tutor.id}
            hasAccess={Boolean(tutor.profile)}
            profileId={tutor.profile?.id}
            active={tutor.profile?.active}
            email={tutor.profile?.email}
            canCreate={Boolean(tutor.email)}
          />
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-medium text-slate-900">Etiquetas</h2>
        {availableTags.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Sin etiquetas creadas todavía —{' '}
            <a href="/admin/configuracion" className="underline">
              créalas en Configuración
            </a>
            .
          </p>
        ) : (
          <form action={updateTutorTagsAction.bind(null, tutor.id)} className="mt-2 space-y-3">
            <div className="flex flex-wrap gap-3">
              {availableTags.map((tag) => (
                <label key={tag.id} className="flex items-center gap-1.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="tagIds"
                    value={tag.id}
                    defaultChecked={tutor.tags.some((t) => t.id === tag.id)}
                  />
                  <span className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: tag.color }}>
                    {tag.name}
                  </span>
                </label>
              ))}
            </div>
            <button type="submit" className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white">
              Guardar etiquetas
            </button>
          </form>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-medium text-slate-900">Mascotas</h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {tutor.pets.map((pet) => (
            <div key={pet.id} className="flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400">
              <Link href={`/admin/mascotas/${pet.id}`} className="min-w-0 flex-1">
                <p className="font-medium text-slate-900">{pet.name}</p>
                <p className="text-sm text-slate-500">
                  {pet.breed}
                  {pet.sizeCategory ? ` · ${pet.sizeCategory}` : ''}
                </p>
              </Link>
              <DataTableActions
                viewHref={`/admin/mascotas/${pet.id}`}
                viewLabel="Ver Expediente"
                deleteLabel="Desactivar"
                deleteConfirmText={`¿Desactivar a "${pet.name}"? Se conservará su historial de citas y facturas.`}
                onDelete={async () => {
                  'use server'
                  await deactivatePetAction(pet.id, tutor.id)
                }}
              />
            </div>
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
