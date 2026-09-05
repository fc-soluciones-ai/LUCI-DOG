import { createClient } from '@supabase/supabase-js'

/**
 * Cliente con la Service Role Key — SOLO para uso server-side (scripts de
 * administración, creación de cuentas). Nunca importar desde código que
 * pueda terminar en el bundle del navegador.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  }

  return createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
}
