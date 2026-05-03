import { NextResponse } from 'next/server'
import { fetchLiveAircraft } from '@/lib/api/adsb'

export const revalidate = 15

export async function GET() {
  const updatedAt = new Date().toISOString()

  try {
    const aircraft = await fetchLiveAircraft()
    return NextResponse.json({ data: { aircraft, updatedAt }, updatedAt })
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unknown error', updatedAt },
      { status: 500 }
    )
  }
}
