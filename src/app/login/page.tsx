import Link from 'next/link'
import { signInAction } from '@/modules/auth/actions'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string; success?: string }>
}) {
  const { error, redirect: redirectTo, success } = await searchParams

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold text-slate-900">GroomingOS</h1>
      <p className="mt-1 text-slate-600">Inicia sesión para continuar.</p>

      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {success && <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{success}</div>}

      <form action={signInAction} className="mt-6 space-y-3">
        <input type="hidden" name="redirectTo" value={redirectTo ?? ''} />
        <input name="email" type="email" required placeholder="Correo" className="input" />
        <input name="password" type="password" required placeholder="Contraseña" className="input" />
        <button type="submit" className="w-full rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white">
          Entrar
        </button>
      </form>

      <Link href="/olvide-password" className="mt-4 text-center text-sm text-slate-600 hover:text-slate-900 hover:underline">
        ¿Olvidaste tu contraseña?
      </Link>
    </main>
  )
}
