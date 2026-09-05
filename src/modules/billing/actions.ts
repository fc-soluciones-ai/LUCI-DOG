'use server'

import { revalidatePath } from 'next/cache'
import { PaymentMethod } from '@prisma/client'
import { closeServiceAndInvoice, manuallyUnblockTutor, submitProof, verifyProof } from './invoices'

export async function closeServiceAction(appointmentId: string, formData: FormData) {
  const descriptions = formData.getAll('itemDescription') as string[]
  const amounts = formData.getAll('itemAmount') as string[]

  const items = descriptions
    .map((description, i) => ({ description: description.trim(), amount: Number(amounts[i]) }))
    .filter((item) => item.description && item.amount > 0)

  if (items.length === 0) return

  const paymentMethod = formData.get('paymentMethod') as PaymentMethod
  const markPaidNow = paymentMethod === PaymentMethod.CASH
  const finishedPhotoUrl = (formData.get('finishedPhotoUrl') as string) || undefined

  await closeServiceAndInvoice({ appointmentId, items, finishedPhotoUrl, paymentMethod, markPaidNow })
  revalidatePath('/admin/facturacion')
}

export async function verifyProofAction(invoiceId: string, formData: FormData) {
  const verifiedBy = String(formData.get('verifiedBy') ?? '').trim()
  if (!verifiedBy) return
  await verifyProof(invoiceId, verifiedBy)
  revalidatePath('/admin/facturacion')
  revalidatePath('/admin/clientes')
}

export async function manuallyUnblockAction(tutorId: string, formData: FormData) {
  const unblockedBy = String(formData.get('unblockedBy') ?? '').trim()
  if (!unblockedBy) return
  await manuallyUnblockTutor(tutorId, unblockedBy)
  revalidatePath('/admin/facturacion')
  revalidatePath('/admin/clientes')
}

export async function submitProofAction(invoiceId: string, formData: FormData) {
  const proofUrl = String(formData.get('proofUrl') ?? '').trim()
  if (!proofUrl) return
  await submitProof(invoiceId, proofUrl)
  revalidatePath(`/pagar/${invoiceId}`)
}
