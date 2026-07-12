import { NextResponse } from 'next/server'
import { fetchElectricityPrices } from '@/lib/api/prices'

export async function GET() {
  const updatedAt = new Date().toISOString()

  try {
    const data = await fetchElectricityPrices()
    return NextResponse.json({ data, updatedAt })
  } catch (error) {
    console.error('[api/prices]', error)
    return NextResponse.json(
      { data: null, error: 'Upstream fetch failed', updatedAt },
      { status: 500 }
    )
  }
}
