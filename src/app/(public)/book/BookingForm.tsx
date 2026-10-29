'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { formatCRC } from '@/lib/currency'
import { groupServicesByFamily, serviceMatchesSize } from '@/modules/shared/serviceFamily'
import { getAvailableSlotsPublicAction } from '@/modules/agenda/publicActions'

interface Service {
  id: string
  name: string
  basePrice: number
  standardDurationMin: number
  imageUrl: string | null
}

interface Groomer {
  id: string
  fullName: string
}

const TIMEZONE = 'America/Costa_Rica'

/** Hoy como "YYYY-MM-DD" en hora de Costa Rica (el navegador puede estar en otra zona). */
function todayInCostaRica() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date())
}

/** Instante ISO del slot → "YYYY-MM-DDTHH:mm" en hora de pared de Costa Rica, que es lo que espera /api/appointments. */
function toCostaRicaWallTime(iso: string) {
  const text = new Intl.DateTimeFormat('sv-SE', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))
  return text.replace(' ', 'T')
}

function costaRicaTimeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CR', { timeZone: TIMEZONE, hour: '2-digit', minute: '2-digit' })
}

export function BookingForm({ services, groomers }: { services: Service[]; groomers: Groomer[] }) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [sizeCategory, setSizeCategory] = useState('')
  const [date, setDate] = useState(todayInCostaRica)
  const [slots, setSlots] = useState<{ start: string; available: boolean }[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  const selectedService = services.find((service) => service.id === selectedServiceId)

  // La talla cambia la duración real, así que también cambia qué horarios caben.
  useEffect(() => {
    setSelectedSlot(null)
    if (!selectedServiceId || !date) {
      setSlots([])
      return
    }
    setLoadingSlots(true)
    getAvailableSlotsPublicAction(selectedServiceId, date, sizeCategory || undefined)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false))
  }, [selectedServiceId, date, sizeCategory])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('submitting')
    setErrorMessage(null)

    const form = event.currentTarget
    const data = new FormData(form)

    const payload = {
      tutor: {
        fullName: String(data.get('tutorName') ?? ''),
        phoneWhatsApp: String(data.get('phone') ?? ''),
        email: data.get('email') ? String(data.get('email')) : undefined,
        address: data.get('address') ? String(data.get('address')) : undefined,
      },
      pet: {
        name: String(data.get('petName') ?? ''),
        breed: String(data.get('breed') ?? ''),
        sizeCategory: data.get('sizeCategory') ? String(data.get('sizeCategory')) : undefined,
        coatType: data.get('coatType') ? String(data.get('coatType')) : undefined,
        weightEstimated: data.get('weight') ? Number(data.get('weight')) : undefined,
      },
      serviceId: String(data.get('serviceId') ?? ''),
      scheduledStart: selectedSlot ? toCostaRicaWallTime(selectedSlot) : '',
      groomerId: data.get('groomerId') ? String(data.get('groomerId')) : undefined,
      antiFraudConsent: consent,
    }

    const response = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (response.ok) {
      setStatus('success')
      form.reset()
      setConsent(false)
      setSelectedSlot(null)
      return
    }

    const body = await response.json().catch(() => ({}))
    setErrorMessage(body.error ?? 'No se pudo agendar la cita. Intenta de nuevo.')
    setStatus('error')
  }

  if (status === 'success') {
    return (
      <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
        ¡Listo! Tu cita quedó registrada como <strong>pendiente de confirmación</strong>. Te escribiremos por
        WhatsApp para confirmar el horario.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      <fieldset className="space-y-3">
        <legend className="font-medium text-slate-900">Tus datos</legend>
        <input name="tutorName" required placeholder="Nombre completo" className="input" />
        <input name="phone" required placeholder="WhatsApp (con código de país, ej. +5215512345678)" className="input" />
        <input name="email" type="email" placeholder="Email (opcional)" className="input" />
        <input name="address" placeholder="Dirección (opcional)" className="input" />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-medium text-slate-900">Datos de tu mascota</legend>
        <input name="petName" required placeholder="Nombre de tu mascota" className="input" />
        <input name="breed" required placeholder="Raza" className="input" />
        <select name="sizeCategory" value={sizeCategory} onChange={(event) => setSizeCategory(event.target.value)} className="input">
          <option value="">Tamaño aproximado</option>
          <option value="XS">Extra pequeño</option>
          <option value="S">Pequeño</option>
          <option value="M">Mediano</option>
          <option value="L">Grande</option>
          <option value="XL">Extra grande</option>
        </select>
        <input name="coatType" placeholder="Tipo de manto (opcional)" className="input" />
        <input name="weight" type="number" step="0.1" min="0" placeholder="Peso aproximado en kg (opcional)" className="input" />
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-medium text-slate-900">Servicio y horario</legend>
        <select
          name="serviceId"
          required
          defaultValue=""
          className="input"
          onChange={(event) => setSelectedServiceId(event.target.value)}
        >
          <option value="" disabled>
            Selecciona un servicio
          </option>
          {groupServicesByFamily(services).map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.services.map((service) => (
                <option key={service.id} value={service.id}>
                  {serviceMatchesSize(service.name, sizeCategory) ? '✓ ' : ''}
                  {service.name} — desde {formatCRC(service.basePrice)} ({service.standardDurationMin} min)
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {sizeCategory && <p className="text-xs text-slate-400">✓ = coincide con el tamaño que indicaste arriba.</p>}
        {selectedService?.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selectedService.imageUrl}
            alt={selectedService.name}
            className="h-32 w-full rounded-lg object-cover"
          />
        )}

        {groomers.length > 0 && (
          <label className="block text-sm text-slate-700">
            ¿Con quién?
            <select name="groomerId" defaultValue="" className="input mt-1">
              <option value="">Cualquier groomer</option>
              {groomers.map((groomer) => (
                <option key={groomer.id} value={groomer.id}>
                  {groomer.fullName}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block text-sm text-slate-700">
          Fecha
          <input
            type="date"
            required
            min={todayInCostaRica()}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="input mt-1"
          />
        </label>

        <div>
          <p className="text-sm text-slate-700">Horario</p>
          {!selectedServiceId ? (
            <p className="mt-1 text-xs text-slate-400">Elige un servicio para ver los horarios disponibles.</p>
          ) : loadingSlots ? (
            <p className="mt-1 text-xs text-slate-400">Buscando horarios disponibles...</p>
          ) : slots.length === 0 ? (
            <p className="mt-1 text-xs text-slate-400">Sin horarios ese día. Prueba con otra fecha.</p>
          ) : (
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => {
                const isSelected = selectedSlot === slot.start
                return (
                  <button
                    key={slot.start}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setSelectedSlot(slot.start)}
                    className={`rounded-lg border px-2 py-2 text-sm font-medium ${
                      !slot.available
                        ? 'cursor-not-allowed border-slate-100 text-slate-300 line-through'
                        : isSelected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-300 text-slate-700 hover:border-slate-500'
                    }`}
                  >
                    {costaRicaTimeLabel(slot.start)}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </fieldset>

      <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
        <span>
          Entiendo que esta cotización es <strong>estimada</strong> y que el precio final dependerá del peso real y
          el estado del manto de mi mascota, evaluados en recepción el día de la cita.
        </span>
      </label>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{errorMessage}</div>
      )}

      <button
        type="submit"
        disabled={!consent || !selectedSlot || status === 'submitting'}
        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white transition disabled:opacity-40"
      >
        {status === 'submitting' ? 'Agendando...' : 'Agendar cita'}
      </button>
    </form>
  )
}
