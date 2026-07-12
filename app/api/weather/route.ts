import { NextResponse } from 'next/server'
import { fetchWeatherObservations, fetchWeatherWarnings } from '@/lib/api/dmi'

export async function GET() {
  const updatedAt = new Date().toISOString()

  try {
    const [stations, warnings] = await Promise.all([
      fetchWeatherObservations(),
      fetchWeatherWarnings(),
    ])
    return NextResponse.json({ data: { stations, warnings, updatedAt }, updatedAt })
  } catch (error) {
    console.error('[api/weather]', error)
    return NextResponse.json(
      { data: null, error: 'Upstream fetch failed', stale: false, updatedAt },
      { status: 500 }
    )
  }
}
