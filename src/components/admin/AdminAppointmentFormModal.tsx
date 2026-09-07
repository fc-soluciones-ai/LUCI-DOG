'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { useActionState } from 'react'
import { Modal } from '@/components/ui/Modal'
import {
  createAppointmentByAdminAction,
  getAvailableSlotsForAdminAction,
  listPetsForTutorAction,
  searchTutorsForAdminAction,
  type AdminBookingState,
} from '@/modules/agenda/adminActions'
import { formatCRC } from '@/lib/currency'

interface ServiceOption {
  id: string
  name: string
  basePrice: number
  standardDurationMin: number
}

interface GroomerOption {
  id: string
  fullName: string
}

interface TutorResult {
  id: string
  fullName: string
  phoneWhatsApp: string
}

interface PetResult {
  id: string
  name: string
  breed: string
  sizeCategory: string | null
}

const initialState: AdminBookingState = { ok: false }

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

/** Alta de cita telefónica/manual desde recepción — mismo motor de disponibilidad que /book y /client/citas. */
export function AdminAppointmentFormModal({ services, groomers }: { services: ServiceOption[]; groomers: GroomerOption[] }) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(createAppointmentByAdminAction, initialState)

  const [tutorQuery, setTutorQuery] = useState('')
  const [tutorResults, setTutorResults] = useState<TutorResult[]>([])
  const [selectedTutor, setSelectedTutor] = useState<TutorResult | null>(null)
  const [newTutorMode, setNewTutorMode] = useState(false)

  const [pets, setPets] = useState<PetResult[]>([])
  const [petId, setPetId] = useState('')
  const [newPetMode, setNewPetMode] = useState(false)
  const [newPetSize, setNewPetSize] = useState('')

  const [serviceId, setServiceId] = useState('')
  const [date, setDate] = useState(todayIso())
  const [slots, setSlots] = useState<{ start: string; available: boolean }[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  function resetAll() {
    setTutorQuery('')
    setTutorResults([])
    setSelectedTutor(null)
    setNewTutorMode(false)
    setPets([])
    setPetId('')
    setNewPetMode(false)
    setNewPetSize('')
    setServiceId('')
    setDate(todayIso())
    setSlots([])
    setSelectedSlot(null)
  }

  useEffect(() => {
    if (state.ok) {
      setOpen(false)
      resetAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  // Buscar clientes existentes (debounced).
  useEffect(() => {
    if (newTutorMode || tutorQuery.trim().length < 2) {
      setTutorResults([])
      return
    }
    const handle = setTimeout(() => {
      searchTutorsForAdminAction(tutorQuery).then(setTutorResults)
    }, 300)
    return () => clearTimeout(handle)
  }, [tutorQuery, newTutorMode])

  // Mascotas del tutor seleccionado.
  useEffect(() => {
    if (!selectedTutor) {
      setPets([])
      return
    }
    listPetsForTutorAction(selectedTutor.id).then(setPets)
  }, [selectedTutor])

  const sizeCategory = newPetMode || newTutorMode || pets.length === 0 ? newPetSize || null : (pets.find((p) => p.id === petId)?.sizeCategory ?? null)

  // Horarios disponibles — misma dependencia de talla que el modal del cliente.
  useEffect(() => {
    if (!open || !serviceId || !date) {
      setSlots([])
      return
    }
    setLoadingSlots(true)
    setSelectedSlot(null)
    const dateIso = new Date(`${date}T00:00:00`).toISOString()
    getAvailableSlotsForAdminAction(serviceId, dateIso, sizeCategory ?? undefined)
      .then(setSlots)
      .finally(() => setLoadingSlots(false))
  }, [open, serviceId, date, sizeCategory])

  const showNewPetFields = newTutorMode || newPetMode || pets.length === 0
  const canSubmit = (Boolean(selectedTutor) || newTutorMode) && Boolean(selectedSlot)

  function handleSizeChange(event: ChangeEvent<HTMLSelectElement>) {
    setNewPetSize(event.target.value)
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
        + Nueva Cita
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Agendar cita telefónica / manual">
        <form action={formAction} className="grid gap-4">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Cliente</p>
              <button
                type="button"
                onClick={() => {
                  setNewTutorMode((v) => !v)
                  setSelectedTutor(null)
                  setTutorResults([])
                }}
                className="text-xs text-slate-600 hover:underline"
              >
                {newTutorMode ? '← Buscar cliente existente' : '+ Registrar Nuevo Cliente Rápido'}
              </button>
            </div>

            {newTutorMode ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input name="newTutorFullName" required placeholder="Nombre completo" className="input" />
                <input name="newTutorPhone" required placeholder="WhatsApp (con código de país)" className="input" />
                <input name="newTutorEmail" type="email" placeholder="Email (opcional)" className="input sm:col-span-2" />
              </div>
            ) : selectedTutor ? (
              <div className="mt-2 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm">
                <span>
                  {selectedTutor.fullName} — {selectedTutor.phoneWhatsApp}
                </span>
                <button type="button" onClick={() => setSelectedTutor(null)} className="text-xs text-red-600 hover:underline">
                  Cambiar
                </button>
                <input type="hidden" name="tutorId" value={selectedTutor.id} />
              </div>
            ) : (
              <div className="mt-2">
                <input
                  value={tutorQuery}
                  onChange={(event) => setTutorQuery(event.target.value)}
                  placeholder="Buscar por nombre o WhatsApp..."
                  className="input w-full"
                />
                {tutorResults.length > 0 && (
                  <div className="mt-1 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                    {tutorResults.map((tutor) => (
                      <button
                        key={tutor.id}
                        type="button"
                        onClick={() => {
                          setSelectedTutor(tutor)
                          setTutorResults([])
                          setTutorQuery('')
                        }}
                        className="block w-full p-2 text-left text-sm hover:bg-slate-50"
                      >
                        {tutor.fullName} — {tutor.phoneWhatsApp}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {(selectedTutor || newTutorMode) && (
            <div>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Mascota</p>
                {!newTutorMode && pets.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewPetMode((v) => !v)
                      setPetId('')
                    }}
                    className="text-xs text-slate-600 hover:underline"
                  >
                    {newPetMode ? '← Elegir mascota existente' : '+ Nueva mascota'}
                  </button>
                )}
              </div>

              {showNewPetFields ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <input name="newPetName" required placeholder="Nombre" className="input" />
                  <input name="newPetBreed" required placeholder="Raza" className="input" />
                  <select name="newPetSizeCategory" value={newPetSize} onChange={handleSizeChange} className="input">
                    <option value="">Talla</option>
                    <option value="XS">Extra pequeño</option>
                    <option value="S">Pequeño</option>
                    <option value="M">Mediano</option>
                    <option value="L">Grande</option>
                    <option value="XL">Extra grande</option>
                  </select>
                </div>
              ) : (
                <select
                  name="petId"
                  required
                  value={petId}
                  onChange={(event) => setPetId(event.target.value)}
                  className="input mt-2 w-full"
                >
                  <option value="" disabled>
                    Selecciona la mascota
                  </option>
                  {pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name} — {pet.breed}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <label className="text-sm text-slate-700">
            Servicio
            <select
              name="serviceId"
              required
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
              className="input mt-1 w-full"
            >
              <option value="" disabled>
                Selecciona un servicio
              </option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} — {formatCRC(service.basePrice)} ({service.standardDurationMin} min)
                </option>
              ))}
            </select>
          </label>

          {groomers.length > 0 && (
            <label className="text-sm text-slate-700">
              Groomer asignado (opcional)
              <select name="groomerId" defaultValue="" className="input mt-1 w-full">
                <option value="">Sin asignar</option>
                {groomers.map((groomer) => (
                  <option key={groomer.id} value={groomer.id}>
                    {groomer.fullName}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="text-sm text-slate-700">
            Fecha
            <input
              type="date"
              required
              min={todayIso()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="input mt-1 w-full"
            />
          </label>

          <div>
            <p className="text-sm text-slate-700">Horario</p>
            {!serviceId ? (
              <p className="mt-1 text-xs text-slate-400">Selecciona un servicio primero.</p>
            ) : loadingSlots ? (
              <p className="mt-1 text-xs text-slate-400">Buscando horarios disponibles...</p>
            ) : slots.length === 0 ? (
              <p className="mt-1 text-xs text-slate-400">Sin horarios ese día.</p>
            ) : (
              <div className="mt-2 grid grid-cols-4 gap-2">
                {slots.map((slot) => {
                  const time = new Date(slot.start).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })
                  const isSelected = selectedSlot === slot.start
                  return (
                    <button
                      key={slot.start}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot.start)}
                      className={`rounded-lg border px-2 py-1.5 text-xs font-medium ${
                        !slot.available
                          ? 'cursor-not-allowed border-slate-100 text-slate-300 line-through'
                          : isSelected
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 text-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {time}
                    </button>
                  )
                })}
              </div>
            )}
            <input type="hidden" name="scheduledStart" value={selectedSlot ?? ''} />
          </div>

          {state.message && !state.ok && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{state.message}</div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending || !canSubmit}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? 'Agendando...' : 'Agendar Cita'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
