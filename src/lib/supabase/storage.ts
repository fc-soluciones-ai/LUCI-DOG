import 'server-only'
import { randomUUID } from 'node:crypto'
import { createSupabaseAdminClient } from './admin'

const BUCKET = 'services-images'
const MAX_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export interface UploadedImage {
  url: string
  path: string
}

/**
 * Sube una imagen de servicio a Supabase Storage (bucket público `services-images`),
 * validando tipo y tamaño. El nombre del archivo es un UUID — nunca el nombre
 * original del usuario, evita colisiones y filtración de nombres de archivo.
 */
export async function uploadServiceImage(file: File): Promise<UploadedImage> {
  const extension = ALLOWED_TYPES[file.type]
  if (!extension) {
    throw new Error('Formato de imagen no soportado. Usa JPG, PNG o WEBP.')
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('La imagen supera el tamaño máximo de 5 MB.')
  }

  const path = `${randomUUID()}.${extension}`
  const admin = createSupabaseAdminClient()

  const { error } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) {
    throw new Error(`No se pudo subir la imagen: ${error.message}`)
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, path }
}

/** Elimina una imagen previa del bucket — no lanza si ya no existe (idempotente). */
export async function deleteServiceImage(path: string): Promise<void> {
  const admin = createSupabaseAdminClient()
  await admin.storage.from(BUCKET).remove([path])
}
