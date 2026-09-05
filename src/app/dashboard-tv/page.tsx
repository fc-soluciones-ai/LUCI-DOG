import { getPipelineBoard } from '@/modules/control-center/pipelineBoard'
import { getTvDisplaySession } from '@/modules/auth/tvSession'
import { TvBoard } from '@/components/tv/TvBoard'

export const dynamic = 'force-dynamic'

export default async function DashboardTvPage() {
  const [board, tvSession] = await Promise.all([getPipelineBoard(), getTvDisplaySession()])
  return <TvBoard initialBoard={board} tvSession={tvSession} />
}
