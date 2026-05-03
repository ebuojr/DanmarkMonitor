import { NextResponse } from 'next/server'
import { fetchWallnotNews } from '@/lib/api/wallnot'

export async function GET() {
  const updatedAt = new Date().toISOString()
  try {
    const articles = await fetchWallnotNews()
    return NextResponse.json({ data: { articles, updatedAt }, updatedAt })
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unknown error', stale: false, updatedAt },
      { status: 500 }
    )
  }
}
