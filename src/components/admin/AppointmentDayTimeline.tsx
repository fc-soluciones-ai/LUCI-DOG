export interface TimelineAppointment {
  id: string
  startMin: number // minutos desde medianoche, hora Costa Rica
  endMin: number
  title: string
  subtitle: string
  timeLabel: string
  chips: string[]
  statusColorClass: string
}

const ROW_HEIGHT_PX = 64
const MIN_BLOCK_HEIGHT_PX = 40

function assignLanes(items: TimelineAppointment[]) {
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin)
  const laneEnds: number[] = []
  const placed = sorted.map((item) => {
    let lane = laneEnds.findIndex((end) => end <= item.startMin)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(item.endMin)
    } else {
      laneEnds[lane] = item.endMin
    }
    return { item, lane }
  })
  const totalLanes = Math.max(laneEnds.length, 1)
  return placed.map(({ item, lane }) => ({ item, lane, totalLanes }))
}

/** Vista de calendario por día para Citas/Agenda — reemplaza la lista plana (había que bajar hasta el final para ver la cita más reciente). */
export function AppointmentDayTimeline({
  openHour,
  closeHour,
  appointments,
}: {
  openHour: number
  closeHour: number
  appointments: TimelineAppointment[]
}) {
  const hours = Array.from({ length: Math.max(closeHour - openHour, 1) }, (_, i) => openHour + i)
  const totalHeight = hours.length * ROW_HEIGHT_PX
  const placed = assignLanes(appointments)

  return (
    <div className="mt-3 flex rounded-lg border border-slate-200 bg-white">
      <div className="w-16 flex-none border-r border-slate-100">
        {hours.map((hour) => (
          <div key={hour} style={{ height: ROW_HEIGHT_PX }} className="relative">
            <span className="absolute -top-2.5 right-2 text-xs text-slate-400">
              {hour === 0 ? '12 am' : hour < 12 ? `${hour} am` : hour === 12 ? '12 pm' : `${hour - 12} pm`}
            </span>
          </div>
        ))}
      </div>

      <div className="relative flex-1" style={{ height: totalHeight }}>
        {hours.map((hour) => (
          <div
            key={hour}
            className="absolute inset-x-0 border-t border-slate-100"
            style={{ top: (hour - openHour) * ROW_HEIGHT_PX }}
          />
        ))}

        {placed.map(({ item, lane, totalLanes }) => {
          const top = Math.max(((item.startMin - openHour * 60) / 60) * ROW_HEIGHT_PX, 0)
          const height = Math.max(((item.endMin - item.startMin) / 60) * ROW_HEIGHT_PX, MIN_BLOCK_HEIGHT_PX)
          const widthPct = 100 / totalLanes

          return (
            <div
              key={item.id}
              style={{
                top,
                height,
                left: `${lane * widthPct}%`,
                width: `calc(${widthPct}% - 6px)`,
              }}
              className={`absolute overflow-hidden rounded-md border px-2 py-1 text-xs shadow-sm transition hover:z-10 hover:shadow-md ${item.statusColorClass}`}
            >
              <p className="truncate font-medium">
                {item.timeLabel} · {item.title}
              </p>
              <p className="truncate opacity-80">{item.subtitle}</p>
              {item.chips.length > 0 && <p className="truncate opacity-70">{item.chips.join(' · ')}</p>}
            </div>
          )
        })}

        {appointments.length === 0 && (
          <p className="absolute inset-x-0 top-4 text-center text-sm text-slate-400">Sin citas este día.</p>
        )}
      </div>
    </div>
  )
}
