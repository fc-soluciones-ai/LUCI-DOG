import { requireRole } from '@/modules/auth/profile'
import { getClientDashboard } from '@/modules/client/portal'
import { updateOwnProfileAction } from '@/modules/client/actions'

export const dynamic = 'force-dynamic'

export default async function ClientPerfilPage() {
  const profile = await requireRole(['CLIENT'])
  const { tutor } = await getClientDashboard(profile.tutorId!)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Mi Perfil</h1>
      <p className="text-slate-600">Mantén tus datos de contacto actualizados.</p>

      <form action={updateOwnProfileAction} className="mt-6 max-w-md space-y-3">
        <label className="block text-sm text-slate-700">
          Nombre completo
          <input name="fullName" required defaultValue={tutor.fullName} className="input mt-1 w-full" />
        </label>
        <label className="block text-sm text-slate-700">
          WhatsApp
          <input name="phoneWhatsApp" required defaultValue={tutor.phoneWhatsApp} className="input mt-1 w-full" />
        </label>
        <label className="block text-sm text-slate-700">
          Correo
          <input name="email" type="email" defaultValue={tutor.email ?? ''} className="input mt-1 w-full" />
        </label>
        <label className="block text-sm text-slate-700">
          Dirección
          <input name="address" defaultValue={tutor.address ?? ''} className="input mt-1 w-full" />
        </label>
        <label className="block text-sm text-slate-700">
          Foto de perfil (URL)
          <input name="photoUrl" defaultValue={tutor.photoUrl ?? ''} placeholder="https://..." className="input mt-1 w-full" />
        </label>
        <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          Guardar cambios
        </button>
      </form>
    </div>
  )
}
