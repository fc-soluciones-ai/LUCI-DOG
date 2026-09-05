import { getPipelineBoard } from '@/modules/control-center/pipelineBoard'
import { TvBoard } from '@/components/tv/TvBoard'

export const dynamic = 'force-dynamic'

export default async function DashboardTvPage() {
  const board = await getPipelineBoard()
  return <TvBoard initialBoard={board} />
}
