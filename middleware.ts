import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Autorización por ROL se resuelve en cada layout (requiere consultar Profile
// vía Prisma, poco práctico en el runtime Edge del middleware). Aquí solo se
// exige "¿hay sesión?" para las rutas protegidas.
const PROTECTED_PREFIXES = ['/admin', '/groomer', '/client']

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)

  const path = request.nextUrl.pathname
  const isProtected = PROTECTED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))

  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', path)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  // Excluye assets estáticos, la API (cada ruta valida su propia autorización),
  // y las superficies públicas: /book, /pagar (self-service sin cuenta) y
  // /dashboard-tv (se autentica sola como TV_DISPLAY, sin login interactivo).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|book|pagar|dashboard-tv|login).*)'],
}
