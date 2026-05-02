import { NextResponse } from 'next/server'
import { fetchWeatherObservations, fetchWeatherWarnings } from '@/lib/api/dmi'

export async function GET() {
  const updatedAt = new Date().toISOString()

  if (!process.env.DMI_API_KEY) {
    return NextResponse.json({
      data: { stations: [], warnings: [], updatedAt },
      error: 'DMI_API_KEY not configured. Register at opendatadocs.dmi.govcloud.dk',
      updatedAt,
    })
  }

  try {
    const [stations, warnings] = await Promise.all([
      fetchWeatherObservations(),
      fetchWeatherWarnings(),
    ])
    return NextResponse.json({ data: { stations, warnings, updatedAt }, updatedAt })
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unknown error', stale: false, updatedAt },
      { status: 500 }
    )
  }
}
