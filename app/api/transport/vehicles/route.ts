import { NextResponse } from 'next/server'
import { fetchLiveVehicles } from '@/lib/api/rejseplanen-livemap'
import type { ViewportBbox } from '@/lib/api/rejseplanen-livemap'

export async function GET(request: Request) {
  const updatedAt = new Date().toISOString()
  const { searchParams } = new URL(request.url)
  const minLon = parseFloat(searchParams.get('minLon') ?? '')
  const maxLon = parseFloat(searchParams.get('maxLon') ?? '')
  const minLat = parseFloat(searchParams.get('minLat') ?? '')
  const maxLat = parseFloat(searchParams.get('maxLat') ?? '')
  const viewport: ViewportBbox | undefined =
    [minLon, maxLon, minLat, maxLat].every(isFinite)
      ? { minLon, maxLon, minLat, maxLat }
      : undefined

  try {
    const vehicles = await fetchLiveVehicles(viewport)
    return NextResponse.json({ data: { vehicles, updatedAt }, updatedAt })
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unknown error', updatedAt },
      { status: 500 }
    )
  }
}
