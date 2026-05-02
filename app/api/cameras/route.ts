import { NextResponse } from 'next/server'
import { fetchCameras } from '@/lib/api/vejdirektoratet'

export async function GET() {
  const updatedAt = new Date().toISOString()
  try {
    const cameras = await fetchCameras()
    return NextResponse.json({ data: { cameras, updatedAt }, updatedAt })
  } catch (error) {
    return NextResponse.json(
      { data: { cameras: [], updatedAt }, error: error instanceof Error ? error.message : 'Unknown error', updatedAt }
    )
  }
}
