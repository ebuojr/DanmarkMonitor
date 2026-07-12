import { NextResponse } from 'next/server'
import { fetchCphBoard } from '@/lib/api/cph'
import { fetchBllBoard } from '@/lib/api/bll'
import { fetchAarBoard } from '@/lib/api/aar'
import type { AirportCode, BoardFlight } from '@/lib/types/flights'

const FETCHERS: Record<AirportCode, (direction: 'A' | 'D') => Promise<BoardFlight[]>> = {
  CPH: fetchCphBoard,
  BLL: fetchBllBoard,
  AAR: fetchAarBoard,
}

export async function GET(request: Request) {
  const updatedAt = new Date().toISOString()
  const { searchParams } = new URL(request.url)
  const directionParam = searchParams.get('direction') ?? 'A'
  const codeParam = searchParams.get('code') ?? 'CPH'

  if (directionParam !== 'A' && directionParam !== 'D') {
    return NextResponse.json(
      { data: null, error: "direction must be 'A' or 'D'", updatedAt },
      { status: 400 }
    )
  }
  const direction = directionParam

  if (codeParam !== 'CPH' && codeParam !== 'BLL' && codeParam !== 'AAR') {
    return NextResponse.json(
      { data: null, error: "code must be 'CPH', 'BLL', or 'AAR'", updatedAt },
      { status: 400 }
    )
  }
  const code = codeParam

  try {
    const flights = await FETCHERS[code](direction)
    return NextResponse.json({ data: { flights, direction, airport: code, updatedAt }, updatedAt })
  } catch (error) {
    console.error('[api/airport]', error)
    return NextResponse.json(
      { data: null, error: 'Upstream fetch failed', updatedAt },
      { status: 500 }
    )
  }
}
