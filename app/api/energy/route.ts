import { NextResponse } from 'next/server'
import { fetchEnergyData } from '@/lib/api/energinet'

export async function GET() {
  const updatedAt = new Date().toISOString()
  try {
    const data = await fetchEnergyData()
    return NextResponse.json({ data, updatedAt })
  } catch (error) {
    console.error('[api/energy]', error)
    return NextResponse.json(
      { data: null, error: 'Upstream fetch failed', stale: false, updatedAt },
      { status: 500 }
    )
  }
}
