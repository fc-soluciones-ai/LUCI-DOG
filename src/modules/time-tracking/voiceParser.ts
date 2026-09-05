import type { ServiceStageType } from '@prisma/client'

export type VoiceCommand =
  | { action: 'START_STAGE'; stageType: ServiceStageType; petName: string }
  | { action: 'FINISH_CURRENT' }

const STAGE_WORDS: Record<string, ServiceStageType> = {
  baño: 'BATH',
  bano: 'BATH',
  secado: 'DRYING',
  corte: 'HAIRCUT',
  uñas: 'NAILS',
  unas: 'NAILS',
  oídos: 'EARS',
  oidos: 'EARS',
  acabado: 'FINISHING',
  deslanado: 'DESHEDDING',
}

/**
 * Parser de comandos de voz contextuales (Módulo 4). Soporta:
 * "Inicio con el baño/secado/corte de {mascota}" y "Finalizar servicio".
 */
export function parseVoiceCommand(transcriptRaw: string): VoiceCommand | null {
  const transcript = transcriptRaw.toLowerCase().trim()

  if (/finalizar\s+servicio/.test(transcript)) {
    return { action: 'FINISH_CURRENT' }
  }

  const startMatch = transcript.match(/inicio\s+(?:con\s+)?el\s+(\S+)\s+de\s+(.+)/)
  if (startMatch) {
    const [, stageWord, petName] = startMatch
    const stageType = STAGE_WORDS[stageWord]
    if (stageType) {
      return { action: 'START_STAGE', stageType, petName: petName.trim() }
    }
  }

  return null
}
