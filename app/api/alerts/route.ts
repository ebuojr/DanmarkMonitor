import { NextResponse } from 'next/server'
import { fetchWeatherWarnings } from '@/lib/api/dmi'
import type { Alert } from '@/lib/types/alerts'

export async function GET() {
  const updatedAt = new Date().toISOString()

  try {
    const warnings = await fetchWeatherWarnings()

    const severityMap: Record<string, Alert['severity']> = {
      extreme: 'critical',
      severe: 'severe',
      moderate: 'warning',
      minor: 'info',
    }
    const alerts: Alert[] = warnings.map((w) => ({
      id: w.id,
      severity: severityMap[w.severity] ?? 'info',
      title: w.event,
      description: w.description,
      area: w.area,
      issuedAt: w.onset,
      expiresAt: w.expires,
    }))

    return NextResponse.json({ data: { alerts, updatedAt }, updatedAt })
  } catch (error) {
    return NextResponse.json(
      { data: null, error: error instanceof Error ? error.message : 'Unknown error', stale: false, updatedAt },
      { status: 500 }
    )
  }
}
