import { listProfiles } from '@/modules/auth/users'
import { setProfileActiveAction, updateProfileAction } from '@/modules/auth/actions'
import { CreateUserForm } from '@/components/admin/CreateUserForm'
import { DataTableActions } from '@/components/admin/DataTableActions'

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
            <div className="flex items-center gap-3">
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
              {(profile.role === 'ADMIN' || profile.role === 'GROOMER') && (
                <DataTableActions
                  editLabel="Editar Perfil"
                  editTitle={`Editar perfil — ${profile.fullName}`}
                  editAction={updateProfileAction.bind(null, profile.id)}
                  editFields={
                    <>
                      <label className="text-sm text-slate-700">
                        Nombre completo
                        <input name="fullName" required defaultValue={profile.fullName} className="input mt-1 w-full" />
                      </label>
                      <label className="text-sm text-slate-700">
                        Correo
                        <input name="email" type="email" required defaultValue={profile.email} className="input mt-1 w-full" />
                      </label>
                      <label className="text-sm text-slate-700">
                        Rol
                        <select name="role" defaultValue={profile.role === 'ADMIN' ? 'ADMIN' : 'GROOMER'} className="input mt-1 w-full">
                          <option value="ADMIN">Administrador</option>
                          <option value="GROOMER">Groomer</option>
                        </select>
                      </label>
                    </>
                  }
                />
              )}
            </div>
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
