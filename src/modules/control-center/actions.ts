'use server'

import { revalidatePath } from 'next/cache'
import type { ServiceStageType } from '@prisma/client'
import { createWorkstation, setWorkstationActive } from './workstations'
import {
  createPipeline,
  createProcessStep,
  createSubProcess,
  deleteProcessStep,
  deleteSubProcess,
  setPipelineActive,
} from './pipelines'
import {
  assignWorkstation,
  checkInPipelineAppointment,
  finishAppointmentStep,
  overrideAppointmentStepDuration,
  startAppointmentStep,
  toggleSubProcess,
} from './appointmentSteps'

function num(formData: FormData, key: string): number | undefined {
  const value = formData.get(key)
  if (typeof value !== 'string' || value.trim() === '') return undefined
  return Number(value)
}

// --- Admin: Estaciones ---

export async function createWorkstationAction(formData: FormData) {
  await createWorkstation({
    name: String(formData.get('name')),
    category: formData.get('category') as ServiceStageType,
    sortOrder: num(formData, 'sortOrder') ?? 0,
  })
  revalidatePath('/admin/stations')
}

export async function setWorkstationActiveAction(workstationId: string, active: boolean) {
  await setWorkstationActive(workstationId, active)
  revalidatePath('/admin/stations')
}

// --- Admin: Pipelines ---

export async function createPipelineAction(formData: FormData) {
  await createPipeline({
    name: String(formData.get('name')),
    description: (formData.get('description') as string) || undefined,
    serviceId: (formData.get('serviceId') as string) || undefined,
  })
  revalidatePath('/admin/pipelines')
}

export async function setPipelineActiveAction(pipelineId: string, active: boolean) {
  await setPipelineActive(pipelineId, active)
  revalidatePath('/admin/pipelines')
}

export async function createProcessStepAction(pipelineId: string, formData: FormData) {
  await createProcessStep({
    pipelineId,
    name: String(formData.get('name')),
    order: num(formData, 'order') ?? 1,
    stageType: formData.get('stageType') as ServiceStageType,
    standardDurationMin: num(formData, 'standardDurationMin') ?? 30,
  })
  revalidatePath('/admin/pipelines')
}

export async function deleteProcessStepAction(processStepId: string) {
  await deleteProcessStep(processStepId)
  revalidatePath('/admin/pipelines')
}

export async function createSubProcessAction(processStepId: string, formData: FormData) {
  await createSubProcess({
    processStepId,
    name: String(formData.get('name')),
    order: num(formData, 'order') ?? 1,
  })
  revalidatePath('/admin/pipelines')
}

export async function deleteSubProcessAction(subProcessId: string) {
  await deleteSubProcess(subProcessId)
  revalidatePath('/admin/pipelines')
}

// --- Operación de piso (Control Center) ---

export async function checkInPipelineAppointmentAction(appointmentId: string, formData: FormData) {
  const groomerId = (formData.get('groomerId') as string) || undefined
  await checkInPipelineAppointment(appointmentId, groomerId)
  revalidatePath('/groomer')
}

export async function assignWorkstationAction(appointmentStepId: string, workstationId: string) {
  await assignWorkstation(appointmentStepId, workstationId)
  revalidatePath('/groomer')
}

export async function startAppointmentStepAction(appointmentStepId: string) {
  await startAppointmentStep(appointmentStepId)
  revalidatePath('/groomer')
}

export async function finishAppointmentStepAction(appointmentStepId: string) {
  await finishAppointmentStep(appointmentStepId)
  revalidatePath('/groomer')
}

export async function overrideAppointmentStepAction(appointmentStepId: string, minutes: number) {
  await overrideAppointmentStepDuration(appointmentStepId, minutes)
  revalidatePath('/groomer')
}

export async function toggleSubProcessAction(appointmentStepId: string, subProcessId: string) {
  await toggleSubProcess(appointmentStepId, subProcessId)
  revalidatePath('/groomer')
}
