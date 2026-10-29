'use client'

import { useTransition } from 'react'

interface Props {
  href: string
  label?: string
  /** Server Action ya bindeada (ej. marcar el aviso como enviado). Corre al tocar el botón, sin bloquear que se abra WhatsApp. */
  onSent: () => Promise<void>
}

/** Abre WhatsApp con el mensaje ya escrito (nueva pestaña) y registra el envío. */
export function WhatsAppSendLink({ href, label = 'Enviar por WhatsApp', onSent }: Props) {
  const [pending, startTransition] = useTransition()

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => startTransition(() => onSent())}
      aria-disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
    >
      💬 {pending ? 'Registrando...' : label}
    </a>
  )
}
