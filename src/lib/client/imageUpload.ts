'use client'

// Límite alineado con el body de Server Actions configurado en next.config.mjs
// y con el límite de Vercel para el body de una Serverless Function (~4.5 MB) —
// subir este número sin subir ambos rompería el upload en producción otra vez.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
const MAX_DIMENSION = 1920
const COMPRESSIBLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Si el archivo es una imagen y supera el límite, la re-escala/recomprime en
 * <canvas> (más común en fotos de cámara de celular, que fácilmente pesan
 * 6-10 MB). PDFs u otros tipos no comprimibles se devuelven sin tocar — su
 * tamaño se valida aparte con `validateUploadSize`.
 */
export async function compressImageIfNeeded(file: File, maxBytes = MAX_UPLOAD_BYTES): Promise<File> {
  if (file.size <= maxBytes || !COMPRESSIBLE_TYPES.has(file.type)) return file

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)

    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    for (const quality of [0.82, 0.65, 0.5, 0.35]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
      if (blob && blob.size <= maxBytes) {
        return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
      }
    }
    return file
  } catch {
    // createImageBitmap/canvas no disponible o archivo corrupto — se deja tal
    // cual, y validateUploadSize se encarga de rechazarlo si sigue muy pesado.
    return file
  }
}

/** Devuelve un mensaje de error si el archivo excede el límite, o null si está bien. */
export function validateUploadSize(file: File, maxBytes = MAX_UPLOAD_BYTES): string | null {
  if (file.size > maxBytes) {
    return `El archivo pesa ${formatMB(file.size)} — el máximo permitido es ${formatMB(maxBytes)}.`
  }
  return null
}

/** Reemplaza el archivo de un <input type="file"> (para dejar la versión comprimida lista antes de enviar el form). */
export function replaceInputFile(input: HTMLInputElement, file: File) {
  const transfer = new DataTransfer()
  transfer.items.add(file)
  input.files = transfer.files
}
