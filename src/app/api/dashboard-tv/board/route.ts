import { NextResponse } from 'next/server'
import { getPipelineBoard } from '@/modules/control-center/pipelineBoard'

export async function GET() {
  const board = await getPipelineBoard()
  return NextResponse.json(board)
}
