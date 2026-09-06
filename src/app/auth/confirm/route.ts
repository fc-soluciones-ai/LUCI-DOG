import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Destino del enlace de restablecimiento de contraseña de Supabase Auth
 * (?code=...&next=...): intercambia el código por una sesión (cookies) y
 * redirige a la página que la use — hoy siempre /actualizar-password.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/actualizar-password'

  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
    console.error('[auth/confirm] falló exchangeCodeForSession:', error)
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent('El enlace de restablecimiento no es válido o ya expiró.')}`
  )
}
