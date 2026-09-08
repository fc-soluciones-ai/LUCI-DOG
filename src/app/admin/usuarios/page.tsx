import Link from 'next/link'
import { listProfiles } from '@/modules/auth/users'
import { deleteProfileAction, setProfileActiveAction, updateProfileAction } from '@/modules/auth/actions'
import { CreateUserForm } from '@/components/admin/CreateUserForm'
import { DataTableActions } from '@/components/admin/DataTableActions'
import { ResetPasswordButton } from '@/components/admin/ResetPasswordButton'

export const dynamic = 'force-dynamic'

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  GROOMER: 'Groomer',
  CLIENT: 'Cliente',
  TV_DISPLAY: 'Pantalla TV',
}

type Tab = 'staff' | 'clientes' | 'dispositivos'

function parseTab(value: string | undefined): Tab {
  if (value === 'clientes' || value === 'dispositivos') return value
  return 'staff'
}

function ActiveToggle({ profileId, active }: { profileId: string; active: boolean }) {
  return (
    <form action={setProfileActiveAction.bind(null, profileId, !active)}>
      <button
        type="submit"
        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
          active ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-500'
        }`}
      >
        {active ? 'Activo' : 'Desactivado'}
      </button>
    </form>
  )
}

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: tabParam } = await searchParams
  const tab = parseTab(tabParam)

  const profiles = await listProfiles()
  const staff = profiles.filter((p) => p.role === 'ADMIN' || p.role === 'GROOMER')
  const clientes = profiles.filter((p) => p.role === 'CLIENT')
  const dispositivos = profiles.filter((p) => p.role === 'TV_DISPLAY')

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'staff', label: 'Staff', count: staff.length },
    { key: 'clientes', label: 'Clientes', count: clientes.length },
    { key: 'dispositivos', label: 'Dispositivos', count: dispositivos.length },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Usuarios</h1>
        <p className="text-slate-600">Cuentas de Supabase Auth y su rol dentro de GroomingOS.</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === 'staff' ? '/admin/usuarios' : `/admin/usuarios?tab=${t.key}`}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              tab === t.key
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label} <span className="text-xs text-slate-400">({t.count})</span>
          </Link>
        ))}
      </div>

      {tab === 'staff' && (
        <div>
          <p className="mb-3 text-sm text-slate-500">
            Administradores y groomers — inician sesión en este panel y en Piso de trabajo.
          </p>
          <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {staff.length === 0 && <p className="p-4 text-sm text-slate-500">Sin cuentas de staff todavía.</p>}
            {staff.map((profile) => (
              <div key={profile.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-slate-900">{profile.fullName}</p>
                  <p className="text-sm text-slate-500">
                    {profile.email} · {ROLE_LABEL[profile.role] ?? profile.role}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <ActiveToggle profileId={profile.id} active={profile.active} />
                  <ResetPasswordButton profileId={profile.id} />
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
                    deleteLabel="Eliminar cuenta"
                    deleteConfirmText={`¿Eliminar definitivamente la cuenta de "${profile.fullName}"? Esto borra su acceso de Supabase Auth de forma irreversible (distinto de solo desactivarla). El historial de citas y mantenimientos asociado a este groomer se conserva.`}
                    onDelete={async () => {
                      'use server'
                      await deleteProfileAction(profile.id)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-medium text-slate-900">+ Nueva cuenta de staff</h2>
            <CreateUserForm />
          </div>
        </div>
      )}

      {tab === 'clientes' && (
        <div>
          <p className="mb-3 text-sm text-slate-500">
            Acceso al Portal del Cliente. La ficha completa (mascotas, citas, facturas) se administra en{' '}
            <Link href="/admin/clientes" className="underline hover:text-slate-700">
              Clientes
            </Link>
            .
          </p>
          <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {clientes.length === 0 && <p className="p-4 text-sm text-slate-500">Sin clientes con acceso al portal todavía.</p>}
            {clientes.map((profile) => (
              <div key={profile.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-slate-900">{profile.fullName}</p>
                  <p className="text-sm text-slate-500">{profile.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <ActiveToggle profileId={profile.id} active={profile.active} />
                  {profile.tutorId && (
                    <Link href={`/admin/clientes/${profile.tutorId}`} className="text-xs font-medium text-slate-600 hover:underline">
                      Ver ficha →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'dispositivos' && (
        <div>
          <p className="mb-3 text-sm text-slate-500">
            Cuentas de dispositivo (ej. la Pantalla TV de recepción) — solo inician sesión en /dashboard-tv, no
            gestionan datos.
          </p>
          <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {dispositivos.length === 0 && <p className="p-4 text-sm text-slate-500">Sin dispositivos registrados todavía.</p>}
            {dispositivos.map((profile) => (
              <div key={profile.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-slate-900">{profile.fullName}</p>
                  <p className="text-sm text-slate-500">{profile.email}</p>
                </div>
                <ActiveToggle profileId={profile.id} active={profile.active} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
