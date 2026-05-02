import { NextResponse } from 'next/server'
import { fetchDisruptions } from '@/lib/api/rejseplanen'

export async function GET() {
  const updatedAt = new Date().toISOString()

  if (!process.env.REJSEPLANEN_API_KEY) {
    return NextResponse.json({
      data: { disruptions: [], updatedAt },
      error: 'REJSEPLANEN_API_KEY not configured. Register at help.rejseplanen.dk',
      updatedAt,
    })
  }

  try {
    const disruptions = await fetchDisruptions()
    return NextResponse.json({ data: { disruptions, updatedAt }, updatedAt })
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unknown error', stale: false, updatedAt },
      { status: 500 }
    )
  }
}
