import { NextResponse } from 'next/server'
import { fetchLiveAircraft } from '@/lib/api/adsb'

export async function GET() {
  const updatedAt = new Date().toISOString()

  try {
    const aircraft = await fetchLiveAircraft()
    return NextResponse.json({ data: { aircraft, updatedAt }, updatedAt })
  } catch (error) {
    console.error('[api/flights]', error)
    return NextResponse.json(
      { data: null, error: 'Upstream fetch failed', updatedAt },
      { status: 500 }
    )
  }
}
