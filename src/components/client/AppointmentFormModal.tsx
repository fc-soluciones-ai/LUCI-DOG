'use client'

import { useActionState, useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import {
  createAppointmentByClientAction,
  getAvailableSlotsAction,
  rescheduleAppointmentByClientAction,
  type ClientActionState,
} from '@/modules/client/actions'
import { formatCRC } from '@/lib/currency'

interface PetOption {
  id: string
  name: string
  sizeCategory: string | null
}

interface ServiceOption {
  id: string
  name: string
  basePrice: number
  standardDurationMin: number
}

interface RescheduleTarget {
  id: string
  petName: string
  petSizeCategory: string | null
  serviceId: string
  serviceName: string
}

type Props =
  | { mode: 'create'; pets: PetOption[]; services: ServiceOption[] }
  | { mode: 'reschedule'; appointment: RescheduleTarget }

const initialState: ClientActionState = { ok: false }

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function AppointmentFormModal(props: Props) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(todayIso())
  const [serviceId, setServiceId] = useState(props.mode === 'create' ? '' : props.appointment.serviceId)
  const [petId, setPetId] = useState('')
  const [slots, setSlots] = useState<{ start: string; available: boolean }[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  const boundAction =
    props.mode === 'create' ? createAppointmentByClientAction : rescheduleAppointmentByClientAction.bind(null, props.appointment.id)
  const [state, formAction, pending] = useActionState(boundAction, initialState)

  // La duración real (y por tanto los horarios que caben) depende de la talla
  // de la mascota — se necesita para pedir los slots correctos a getAvailableSlotsAction.
  const sizeCategory =
    props.mode === 'create' ? (props.pets.find((pet) => pet.id === petId)?.sizeCategory ?? null) : props.appointment.petSizeCategory

  useEffect(() => {
    if (state.ok) setOpen(false)
  }, [state])

  useEffect(() => {
    if (!open || !serviceId || !date) {
      setSlots([])
      return
    }
    setLoadingSlots(true)
    setSelectedSlot(null)
    const dateIso = new Date(`${date}T00:00:00`).toISOString()
    getAvailableSlotsAction(serviceId, dateIso, sizeCategory ?? undefined)
      .then(setSlots)
      .finally(() => setLoadingSlots(false))
  }, [open, serviceId, date, sizeCategory])

  return (
    <>
      {props.mode === 'create' ? (
        <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          + Agendar Cita
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="text-slate-600 hover:text-slate-900 hover:underline">
          Reagendar
        </button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={props.mode === 'create' ? 'Agendar cita' : `Reagendar — ${props.appointment.petName}`}>
        <form action={formAction} className="grid gap-3">
          {props.mode === 'create' ? (
            <>
              <label className="text-sm text-slate-700">
                Mascota
                <select
                  name="petId"
                  required
                  value={petId}
                  onChange={(event) => setPetId(event.target.value)}
                  className="input mt-1 w-full"
                >
                  <option value="" disabled>
                    Selecciona tu mascota
                  </option>
                  {props.pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name}
                    </option>
                  ))}
                </select>
              </label>
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
                  {props.services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} — {formatCRC(service.basePrice)} ({service.standardDurationMin} min)
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <>
              <input type="hidden" name="serviceId" value={serviceId} />
              <p className="text-sm text-slate-700">
                {props.appointment.petName} — {props.appointment.serviceName}
              </p>
            </>
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
              disabled={pending || !selectedSlot}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? 'Guardando...' : props.mode === 'create' ? 'Agendar' : 'Confirmar nuevo horario'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
