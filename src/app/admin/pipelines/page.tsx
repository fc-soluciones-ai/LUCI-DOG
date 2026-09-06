import { redirect } from 'next/navigation'

// Renombrado a "Procesos" — se conserva esta ruta como redirect por enlaces guardados.
export default function PipelinesRedirectPage() {
  redirect('/admin/procesos')
}
