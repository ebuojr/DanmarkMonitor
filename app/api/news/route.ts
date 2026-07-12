import { NextResponse } from 'next/server'
import { fetchWallnotNews } from '@/lib/api/wallnot'

export async function GET() {
  const updatedAt = new Date().toISOString()
  try {
    const articles = await fetchWallnotNews()
    return NextResponse.json({ data: { articles, updatedAt }, updatedAt })
  } catch (error) {
    console.error('[api/news]', error)
    return NextResponse.json(
      { data: null, error: 'Upstream fetch failed', stale: false, updatedAt },
      { status: 500 }
    )
  }
}
