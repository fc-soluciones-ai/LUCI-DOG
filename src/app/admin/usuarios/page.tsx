import { listProfiles } from '@/modules/auth/users'
import { setProfileActiveAction } from '@/modules/auth/actions'
import { CreateUserForm } from '@/components/admin/CreateUserForm'

export const dynamic = 'force-dynamic'

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  GROOMER: 'Groomer',
  CLIENT: 'Cliente',
  TV_DISPLAY: 'Pantalla TV',
}

export default async function UsuariosPage() {
  const profiles = await listProfiles()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Usuarios</h1>
        <p className="text-slate-600">Cuentas de Supabase Auth y su rol dentro de GroomingOS.</p>
      </div>

      <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {profiles.length === 0 && <p className="p-4 text-sm text-slate-500">Sin usuarios todavía.</p>}
        {profiles.map((profile) => (
          <div key={profile.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-slate-900">{profile.fullName}</p>
              <p className="text-sm text-slate-500">
                {profile.email} · {ROLE_LABEL[profile.role] ?? profile.role}
              </p>
            </div>
            <form action={setProfileActiveAction.bind(null, profile.id, !profile.active)}>
              <button
                type="submit"
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  profile.active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {profile.active ? 'Activo' : 'Desactivado'}
              </button>
            </form>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-medium text-slate-900">+ Nueva cuenta de staff</h2>
        <CreateUserForm />
      </div>
    </div>
  )
}
