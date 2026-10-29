import { NextResponse, type NextRequest } from 'next/server'
import { getUpcomingMaintenanceAlerts } from '@/modules/inventory/equipment'
import { assertCronAuthorized } from '@/lib/cron/auth'

/**
 * Pensado para correr diario: calcula qué equipos vencen mantenimiento en los
 * próximos 14 días (o ya vencidos). Por ahora solo expone el cálculo — sin
 * proveedor de email configurado, la notificación queda en el badge/banner
 * visual de /admin/equipos hasta que se conecte un canal de envío.
 */
export async function POST(request: NextRequest) {
  const unauthorized = assertCronAuthorized(request)
  if (unauthorized) return unauthorized

  const alerts = await getUpcomingMaintenanceAlerts()
  return NextResponse.json({ count: alerts.length, alerts })
}
