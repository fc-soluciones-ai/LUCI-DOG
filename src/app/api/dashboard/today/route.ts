import { NextResponse } from 'next/server'
import { getTodayBoard } from '@/modules/time-tracking/board'

export async function GET() {
  const board = await getTodayBoard()
  return NextResponse.json(board)
}
