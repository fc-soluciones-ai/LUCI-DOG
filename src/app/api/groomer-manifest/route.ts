import { NextResponse } from 'next/server'
import { buildManifest } from '@/lib/pwa/manifest'

/** Manifest dinámico del Piso de Groomer (PWA) — refleja nombre/color/ícono de marca configurados. */
export async function GET() {
  const manifest = await buildManifest({
    startUrl: '/groomer',
    nameSuffix: 'Piso de Trabajo',
    descriptionSuffix: 'Monitor de tiempos y citas del piso de',
  })
  return NextResponse.json(manifest)
}
