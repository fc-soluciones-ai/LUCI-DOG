import { createTutorAction } from '@/modules/crm/actions'

export default function NewTutorPage() {
  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-semibold text-slate-900">Nuevo cliente</h1>
      <form action={createTutorAction} className="mt-6 space-y-3">
        <input name="fullName" required placeholder="Nombre completo" className="input" />
        <input name="phoneWhatsApp" required placeholder="WhatsApp (con código de país)" className="input" />
        <input name="email" type="email" placeholder="Email (opcional)" className="input" />
        <input name="address" placeholder="Dirección (opcional)" className="input" />
        <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Crear cliente
        </button>
      </form>
    </div>
  )
}
