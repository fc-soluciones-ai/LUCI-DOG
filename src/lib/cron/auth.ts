import { NextResponse, type NextRequest } from 'next/server'

/**
 * Los endpoints /api/cron/* no tienen sesión de usuario — los llama un
 * disparador externo (cron-job.org, Vercel Cron, etc.), no un navegador. Se
 * protegen con un secreto compartido en el header Authorization en vez de
 * auth de Supabase. Mismo formato que usa Vercel Cron de forma nativa
 * cuando se configura CRON_SECRET, así que sirve también si más adelante se
 * migra a Vercel Cron sin tocar el código de nuevo.
 */
export function assertCronAuthorized(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET
  const header = request.headers.get('authorization')

  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  return null
}
