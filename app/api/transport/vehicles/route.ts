import { NextResponse } from 'next/server'
import { fetchLiveVehicles } from '@/lib/api/rejseplanen-livemap'

export async function GET() {
  const updatedAt = new Date().toISOString()

  try {
    const vehicles = await fetchLiveVehicles()
    return NextResponse.json({ data: { vehicles, updatedAt }, updatedAt })
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unknown error', updatedAt },
      { status: 500 }
    )
  }
}
