import { Role } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getTodayBoard } from '@/modules/time-tracking/board'
import { Board } from '@/components/dashboard/Board'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const board = await getTodayBoard()
  const groomerOptions = await prisma.staff.findMany({
    where: { role: Role.GROOMER, active: true },
    select: { id: true, fullName: true },
  })

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Monitor de Tiempos en Mesa</h1>
      <p className="text-slate-600">
        Agenda de hoy con semáforo de procrastinación, comandos de voz y Efecto en Cadena.
      </p>
      <Board initialBoard={board} groomerOptions={groomerOptions} />
    </div>
  )
}
