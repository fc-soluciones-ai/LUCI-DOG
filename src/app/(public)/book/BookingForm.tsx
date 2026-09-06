'use client'

import { useState, type FormEvent } from 'react'
import { formatCRC } from '@/lib/currency'

interface Service {
  id: string
  name: string
  basePrice: number
  standardDurationMin: number
}

export function BookingForm({ services }: { services: Service[] }) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [consent, setConsent] = useState(false)

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
      scheduledStart: String(data.get('scheduledStart') ?? ''),
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
        <select name="sizeCategory" defaultValue="" className="input">
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
        <select name="serviceId" required defaultValue="" className="input">
          <option value="" disabled>
            Selecciona un servicio
          </option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} — desde {formatCRC(service.basePrice)} ({service.standardDurationMin} min)
            </option>
          ))}
        </select>
        <input name="scheduledStart" type="datetime-local" required className="input" />
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
        disabled={!consent || status === 'submitting'}
        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white transition disabled:opacity-40"
      >
        {status === 'submitting' ? 'Agendando...' : 'Agendar cita'}
      </button>
    </form>
  )
}
