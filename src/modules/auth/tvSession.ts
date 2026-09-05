import 'server-only'
import { createClient } from '@supabase/supabase-js'

export interface TvSessionTokens {
  accessToken: string
  refreshToken: string
}

/**
 * Inicia sesión server-side como la cuenta TV_DISPLAY (credenciales fijas por
 * variables de entorno) y devuelve los tokens para que el cliente los use en
 * `supabase.auth.setSession()` — así el canal Realtime de la TV queda
 * autenticado con un rol de solo lectura restringida, sin login interactivo
 * y sin exponer credenciales de más alcance.
 */
export async function getTvDisplaySession(): Promise<TvSessionTokens | null> {
  const email = process.env.TV_DISPLAY_EMAIL
  const password = process.env.TV_DISPLAY_PASSWORD

  if (!email || !password) return null

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    console.error('No se pudo iniciar sesión TV_DISPLAY:', error?.message)
    return null
  }

  return { accessToken: data.session.access_token, refreshToken: data.session.refresh_token }
}
