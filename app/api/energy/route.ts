import { NextResponse } from 'next/server'
import { fetchEnergyData } from '@/lib/api/energinet'

export async function GET() {
  const updatedAt = new Date().toISOString()
  try {
    const data = await fetchEnergyData()
    return NextResponse.json({ data, updatedAt })
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unknown error', stale: false, updatedAt },
      { status: 500 }
    )
  }
}
