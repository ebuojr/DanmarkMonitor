import type { EnergyData } from '@/lib/types/energy'

const BASE_URL = 'https://api.energidataservice.dk'

interface PowerSystemRecord {
  Minutes1DK: string
  CO2Emission: number | null
  SolarPower: number | null
  OffshoreWindPower: number | null
  OnshoreWindPower: number | null
  ProductionGe100MW: number | null
  ProductionLt100MW: number | null
}

export async function fetchEnergyData(): Promise<EnergyData> {
  const res = await fetch(
    `${BASE_URL}/dataset/PowerSystemRightNow?limit=1&sort=Minutes1UTC%20desc`,
    { next: { revalidate: 60 } }
  )

  if (!res.ok) throw new Error(`Energinet fetch failed: ${res.status}`)

  const json = await res.json()
  const r: PowerSystemRecord = json.records?.[0] ?? {}

  const wind = (r.OffshoreWindPower ?? 0) + (r.OnshoreWindPower ?? 0)
  const solar = r.SolarPower ?? 0
  const bio = r.ProductionLt100MW ?? 0
  const thermal = r.ProductionGe100MW ?? 0
  const hydro = 0
  const total = wind + solar + bio + thermal + hydro

  const renewablesPct = total > 0 ? Math.round(((wind + solar) / total) * 100) : 0

  return {
    production: {
      wind: Math.round(wind),
      solar: Math.round(solar),
      bio: Math.round(bio),
      thermal: Math.round(thermal),
      hydro,
      total: Math.round(total),
    },
    co2: Math.round(r.CO2Emission ?? 0),
    renewablesPct,
    updatedAt: r.Minutes1DK ?? new Date().toISOString(),
  }
}
