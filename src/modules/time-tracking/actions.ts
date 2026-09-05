'use server'

import { revalidatePath } from 'next/cache'
import { NotificationStatus, TimeLogSource } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getWhatsAppProvider } from '@/lib/whatsapp/adapter'
import {
  checkInAppointment,
  finishStage,
  findActiveStage,
  findTodayAppointmentByPetName,
  overrideStageDuration,
  reorderStages,
  startStage,
} from './timeLogs'
import { parseVoiceCommand } from './voiceParser'

export async function checkInAction(appointmentId: string, groomerId: string) {
  await checkInAppointment(appointmentId, groomerId)
  revalidatePath('/groomer')
}

export async function startStageAction(timeLogId: string) {
  await startStage(timeLogId, TimeLogSource.MANUAL)
  revalidatePath('/groomer')
}

export async function finishStageAction(timeLogId: string) {
  await finishStage(timeLogId, TimeLogSource.MANUAL)
  revalidatePath('/groomer')
}

export async function overrideStageAction(timeLogId: string, minutes: number) {
  await overrideStageDuration(timeLogId, minutes)
  revalidatePath('/groomer')
}

export async function reorderStagesAction(appointmentId: string, orderedIds: string[]) {
  await reorderStages(appointmentId, orderedIds)
  revalidatePath('/groomer')
}

export interface VoiceCommandResult {
  ok: boolean
  message: string
}

/** Ejecuta un comando de voz transcrito contra la agenda de hoy (Módulo 4). */
export async function runVoiceCommandAction(
  transcript: string,
  focusedAppointmentId: string | null
): Promise<VoiceCommandResult> {
  const command = parseVoiceCommand(transcript)
  if (!command) {
    return { ok: false, message: `No reconocí el comando: "${transcript}"` }
  }

  if (command.action === 'START_STAGE') {
    const appointment = await findTodayAppointmentByPetName(command.petName)
    if (!appointment) {
      return { ok: false, message: `No encontré una cita de hoy para "${command.petName}"` }
    }

    const stage = appointment.timeLogs.find((tl) => tl.stageType === command.stageType)
    if (!stage) {
      return { ok: false, message: `${command.petName} no tiene esa etapa en su servicio de hoy` }
    }

    await startStage(stage.id, TimeLogSource.VOICE)
    revalidatePath('/groomer')
    return { ok: true, message: `Iniciado: ${command.stageType} de ${command.petName}` }
  }

  if (command.action === 'FINISH_CURRENT') {
    if (!focusedAppointmentId) {
      return { ok: false, message: 'No hay una cita enfocada para finalizar. Haz clic en una cita primero.' }
    }
    const active = await findActiveStage(focusedAppointmentId)
    if (!active) {
      return { ok: false, message: 'La cita enfocada no tiene ninguna etapa activa.' }
    }
    await finishStage(active.id, TimeLogSource.VOICE)
    revalidatePath('/groomer')
    return { ok: true, message: 'Etapa finalizada.' }
  }

  return { ok: false, message: 'Comando no soportado.' }
}

/** Envío manual de una notificación de retraso sugerida por el Efecto en Cadena. */
export async function sendDelayNotificationAction(notificationId: string) {
  const notification = await prisma.notificationLog.findUniqueOrThrow({
    where: { id: notificationId },
    include: { tutor: true, appointment: { include: { pet: true } } },
  })

  const provider = getWhatsAppProvider()
  const result = await provider.send({
    to: notification.tutor.phoneWhatsApp,
    templateName: 'DELAY_ALERT',
    variables: {
      tutorName: notification.tutor.fullName,
      petName: notification.appointment?.pet.name ?? '',
    },
  })

  await prisma.notificationLog.update({
    where: { id: notificationId },
    data: { status: NotificationStatus.SENT, sentAt: new Date(), providerMessageId: result.providerMessageId },
  })

  revalidatePath('/groomer')
}
