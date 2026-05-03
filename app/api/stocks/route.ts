import { NextResponse } from 'next/server'
import { fetchDanishStocks } from '@/lib/api/stocks'

export const revalidate = 60

export async function GET() {
  const updatedAt = new Date().toISOString()
  try {
    const stocks = await fetchDanishStocks()
    return NextResponse.json({ data: { stocks, updatedAt }, updatedAt })
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unknown error', updatedAt },
      { status: 500 }
    )
  }
}
