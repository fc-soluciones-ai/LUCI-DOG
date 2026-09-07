import { NextResponse } from 'next/server'
import { buildManifest } from '@/lib/pwa/manifest'

/** Manifest dinámico del Portal del Cliente (PWA) — refleja nombre/color/ícono de marca configurados. */
export async function GET() {
  const manifest = await buildManifest({
    startUrl: '/client',
    nameSuffix: 'Portal del Cliente',
    descriptionSuffix: 'Consulta tus citas, mascotas y facturas de',
  })
  return NextResponse.json(manifest)
}
