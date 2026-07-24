import { NextResponse } from 'next/server'
import { fetchDisruptions } from '@/lib/api/hafas'

export const revalidate = 120

export async function GET() {
  try {
    const disruptions = await fetchDisruptions()
    return NextResponse.json({
      data: { disruptions },
      updatedAt: new Date().toISOString(),
    })
  } catch (err) {
    return NextResponse.json(
      { data: null, error: err instanceof Error ? err.message : 'ukendt fejl', updatedAt: new Date().toISOString() },
      { status: 500 }
    )
  }
}
