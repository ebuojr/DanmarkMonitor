import { NextResponse } from 'next/server'
import { fetchCphBoard } from '@/lib/api/cph'

export async function GET(request: Request) {
  const updatedAt = new Date().toISOString()
  const { searchParams } = new URL(request.url)
  const directionParam = searchParams.get('direction') ?? 'A'

  if (directionParam !== 'A' && directionParam !== 'D') {
    return NextResponse.json(
      { data: null, error: "direction must be 'A' or 'D'", updatedAt },
      { status: 400 }
    )
  }
  const direction = directionParam

  try {
    const flights = await fetchCphBoard(direction)
    return NextResponse.json({ data: { flights, direction, updatedAt }, updatedAt })
  } catch (error) {
    console.error('[api/airport]', error)
    return NextResponse.json(
      { data: null, error: 'Upstream fetch failed', updatedAt },
      { status: 500 }
    )
  }
}
