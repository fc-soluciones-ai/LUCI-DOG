import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { SensitivityLevel } from '@prisma/client'
import { getCosmeticHistory, getPetProfile } from '@/modules/crm/pets'
import {
  addPetPhotoAction,
  addPetVaccineAction,
  deactivatePetAction,
  deletePetPhotoAction,
  deletePetVaccineAction,
  updateBiometricsAction,
  upsertClinicalRecordAction,
} from '@/modules/crm/actions'
import { formatVaccineDate, vaccineStatus, type VaccineStatus } from '@/modules/crm/vaccines'
import { DataTableActions } from '@/components/admin/DataTableActions'

export const dynamic = 'force-dynamic'

const VACCINE_STATUS_BADGE: Record<VaccineStatus, { label: string; className: string }> = {
  OK: { label: 'Vigente', className: 'bg-green-100 text-green-800' },
  EXPIRING_SOON: { label: 'Vence pronto', className: 'bg-amber-100 text-amber-800' },
  EXPIRED: { label: 'Vencida', className: 'bg-red-100 text-red-800' },
}

const COMMON_VACCINES = ['Rabia', 'Múltiple (DHPP)', 'Bordetella', 'Leptospirosis', 'Parvovirus', 'Desparasitación']

const SENSITIVITY_OPTIONS: { value: SensitivityLevel; label: string }[] = [
  { value: 'NONE', label: 'Ninguna' },
  { value: 'LOW', label: 'Baja' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
]

export default async function PetProfilePage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params
  const pet = await getPetProfile(petId).catch(() => null)
  if (!pet) notFound()

  const history = await getCosmeticHistory(petId)

  return (
    <div className="space-y-10">
      <div className="flex items-start justify-between">
        <div>
          <Link href={`/admin/clientes/${pet.tutorId}`} className="text-sm text-slate-500 hover:text-slate-900">
            ← {pet.tutor.fullName}
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">{pet.name}</h1>
          <p className="text-slate-600">{pet.breed}</p>
        </div>
        <DataTableActions
          deleteLabel="Desactivar mascota"
          deleteConfirmText={`¿Desactivar a "${pet.name}"? Se conservará su historial de citas y facturas.`}
          onDelete={async () => {
            'use server'
            await deactivatePetAction(pet.id, pet.tutorId)
          }}
        />
      </div>

      <section>
        <h2 className="text-lg font-medium text-slate-900">Ficha biométrica</h2>
        <form action={updateBiometricsAction.bind(null, pet.id)} className="mt-3 grid max-w-xl gap-3 sm:grid-cols-2">
          <input name="breed" defaultValue={pet.breed} required placeholder="Raza" className="input" />
          <select name="sizeCategory" defaultValue={pet.sizeCategory ?? ''} className="input">
            <option value="">Tamaño aproximado</option>
            <option value="XS">Extra pequeño</option>
            <option value="S">Pequeño</option>
            <option value="M">Mediano</option>
            <option value="L">Grande</option>
            <option value="XL">Extra grande</option>
          </select>
          <input name="coatType" defaultValue={pet.coatType ?? ''} placeholder="Tipo de manto" className="input" />
          <input
            name="weightEstimated"
            type="number"
            step="0.1"
            defaultValue={pet.weightEstimated?.toString() ?? ''}
            placeholder="Peso estimado (kg)"
            className="input"
          />
          <label className="text-sm text-slate-600 sm:col-span-2">
            Fecha de nacimiento (para felicitarlo en su cumpleaños)
            <input
              name="birthDate"
              type="date"
              defaultValue={pet.birthDate ? pet.birthDate.toISOString().slice(0, 10) : ''}
              className="input mt-1"
            />
          </label>
          <input
            name="weightReal"
            type="number"
            step="0.1"
            defaultValue={pet.weightReal?.toString() ?? ''}
            placeholder="Peso real (kg, capturado en recepción)"
            className="input sm:col-span-2"
          />
          <button
            type="submit"
            className="col-span-full w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Guardar ficha biométrica
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-900">Vacunas</h2>
        <p className="mt-1 text-sm text-slate-500">
          Al agendar una cita de {pet.name} se avisa si alguna vacuna está vencida o por vencer.
        </p>

        <div className="mt-3 max-w-xl divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {pet.vaccines.length === 0 && <p className="p-4 text-sm text-slate-500">Sin vacunas registradas con fecha todavía.</p>}
          {pet.vaccines.map((vaccine) => {
            const badge = VACCINE_STATUS_BADGE[vaccineStatus(vaccine.expiresAt)]
            return (
              <div key={vaccine.id} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="font-medium text-slate-900">{vaccine.name}</p>
                  <p className="text-xs text-slate-500">
                    Aplicada {formatVaccineDate(vaccine.appliedAt)} · vence {formatVaccineDate(vaccine.expiresAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${badge.className}`}>{badge.label}</span>
                  <form action={deletePetVaccineAction.bind(null, pet.id, vaccine.id)}>
                    <button type="submit" className="text-xs text-red-600 hover:underline">
                      Quitar
                    </button>
                  </form>
                </div>
              </div>
            )
          })}
        </div>

        <form action={addPetVaccineAction.bind(null, pet.id)} className="mt-3 grid max-w-xl gap-2 sm:grid-cols-3">
          <label className="text-sm text-slate-600 sm:col-span-3">
            Vacuna
            <input name="name" required list="common-vaccines" placeholder="Ej. Rabia" className="input mt-1 w-full" />
            <datalist id="common-vaccines">
              {COMMON_VACCINES.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>
          <label className="text-sm text-slate-600">
            Fecha aplicada
            <input name="appliedAt" type="date" required className="input mt-1 w-full" />
          </label>
          <label className="text-sm text-slate-600">
            Vence (opcional)
            <input name="expiresAt" type="date" className="input mt-1 w-full" />
          </label>
          <p className="self-end text-xs text-slate-400">Si no pones fecha de vencimiento, se asume 12 meses.</p>
          <button type="submit" className="col-span-full w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Agregar vacuna
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-900">Ficha clínica y conductual</h2>
        <form
          action={upsertClinicalRecordAction.bind(null, pet.id)}
          className="mt-3 grid max-w-xl gap-3 sm:grid-cols-2"
        >
          <input
            name="allergies"
            defaultValue={pet.clinicalRecord?.allergies.join(', ') ?? ''}
            placeholder="Alergias (separadas por coma)"
            className="input sm:col-span-2"
          />
          <input
            name="vaccinations"
            defaultValue={pet.clinicalRecord?.vaccinations.join(', ') ?? ''}
            placeholder="Otras vacunas o notas sin fecha (separadas por coma)"
            className="input sm:col-span-2"
          />
          <label className="text-sm text-slate-600">
            Sensibilidad acústica
            <select
              name="acousticSensitivity"
              defaultValue={pet.clinicalRecord?.acousticSensitivity ?? 'NONE'}
              className="input mt-1"
            >
              {SENSITIVITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600">
            Reactividad
            <select name="reactivity" defaultValue={pet.clinicalRecord?.reactivity ?? 'NONE'} className="input mt-1">
              {SENSITIVITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="requiresMuzzle" defaultChecked={pet.clinicalRecord?.requiresMuzzle ?? false} />
            Requiere bozal
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              name="requiresHappyHoodie"
              defaultChecked={pet.clinicalRecord?.requiresHappyHoodie ?? false}
            />
            Requiere Happy Hoodie
          </label>
          <textarea
            name="behavioralNotes"
            defaultValue={pet.clinicalRecord?.behavioralNotes ?? ''}
            placeholder="Notas conductuales"
            className="input sm:col-span-2"
            rows={2}
          />
          <textarea
            name="medicalNotes"
            defaultValue={pet.clinicalRecord?.medicalNotes ?? ''}
            placeholder="Notas médicas"
            className="input sm:col-span-2"
            rows={2}
          />
          <button
            type="submit"
            className="col-span-full w-fit rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Guardar ficha clínica
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-900">Fotos</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {pet.photos.map((photo) => (
            <div key={photo.id} className="group relative overflow-hidden rounded-lg border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.type} className="h-32 w-full object-cover" />
              <form action={deletePetPhotoAction.bind(null, pet.id, photo.id)}>
                <button className="absolute right-1 top-1 rounded bg-black/60 px-1.5 text-xs text-white opacity-0 group-hover:opacity-100">
                  Eliminar
                </button>
              </form>
            </div>
          ))}
          {pet.photos.length === 0 && <p className="col-span-full text-sm text-slate-500">Sin fotos todavía.</p>}
        </div>

        <form action={addPetPhotoAction.bind(null, pet.id)} className="mt-3 flex max-w-lg gap-2">
          <input name="url" required placeholder="URL de la foto" className="input" />
          <select name="type" defaultValue="PROFILE" className="input w-40">
            <option value="PROFILE">Perfil</option>
            <option value="BEFORE">Antes</option>
            <option value="AFTER">Después</option>
          </select>
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
            Agregar
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-900">Historial cosmético</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Aún no hay servicios completados. Aquí aparecerá la bitácora de fórmulas e instrumental usados en cada
            cita.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {history.map((appointment) => (
              <div key={appointment.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="font-medium text-slate-900">
                  {appointment.service.name} — {appointment.scheduledStart.toLocaleDateString('es-MX')}
                </p>
                {appointment.formulaUsages.length > 0 && (
                  <ul className="mt-2 text-sm text-slate-600">
                    {appointment.formulaUsages.map((usage) => (
                      <li key={usage.id}>
                        {usage.formula.name} ({usage.formula.dilutionRatio ?? 's/dilución'}) — {usage.mlUsed.toString()} ml
                      </li>
                    ))}
                  </ul>
                )}
                {appointment.instrumentUsages.length > 0 && (
                  <ul className="mt-2 text-sm text-slate-600">
                    {appointment.instrumentUsages.map((usage) => (
                      <li key={usage.id}>
                        {usage.instrument.name} ({usage.instrument.type})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
