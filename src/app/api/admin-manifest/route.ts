import { NextResponse } from 'next/server'
import { buildManifest } from '@/lib/pwa/manifest'

/** Manifest dinámico del Panel de Administración (PWA) — refleja nombre/color/ícono de marca configurados. */
export async function GET() {
  const manifest = await buildManifest({
    startUrl: '/admin',
    nameSuffix: 'Panel de Administración',
    descriptionSuffix: 'Gestiona citas, clientes e inventario de',
  })
  return NextResponse.json(manifest)
}
