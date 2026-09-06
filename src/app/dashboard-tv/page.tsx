import { getPipelineBoard } from '@/modules/control-center/pipelineBoard'
import { getTvDisplaySession } from '@/modules/auth/tvSession'
import { getBranding } from '@/modules/config/branding'
import { TvBoard } from '@/components/tv/TvBoard'

export const dynamic = 'force-dynamic'

export default async function DashboardTvPage() {
  const [board, tvSession, branding] = await Promise.all([getPipelineBoard(), getTvDisplaySession(), getBranding()])
  return <TvBoard initialBoard={board} tvSession={tvSession} businessName={branding.businessName} logoUrl={branding.logoUrl} />
}
