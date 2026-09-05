import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

/** Cliente de Supabase para Server Components/Actions — lee/escribe la sesión vía cookies. */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Llamado desde un Server Component sin permiso de escritura de cookies;
          // el middleware ya se encarga de refrescar la sesión en ese caso.
        }
      },
    },
  })
}
