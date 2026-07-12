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
  // Exchange sign convention confirmed 2026-07-12 against Energinet's own
  // dataset metadata (GET https://api.energidataservice.dk/meta/dataset/PowerSystemRightNow):
  // every Exchange_* column's `comment` field states "Positive values are
  // import ... negative values are export" (relative to the DK1/DK2/Bornholm
  // side of each pair). So positive = import INTO Denmark, negative = export
  // FROM Denmark.
  Exchange_Sum: number | null
  Exchange_DK1_DE: number | null
  Exchange_DK1_NL: number | null
  Exchange_DK1_GB: number | null
  Exchange_DK1_NO: number | null
  Exchange_DK1_SE: number | null
  Exchange_DK1_DK2: number | null
  Exchange_DK2_DE: number | null
  Exchange_DK2_SE: number | null
  Exchange_Bornholm_SE: number | null
}

export async function fetchEnergyData(): Promise<EnergyData> {
  const res = await fetch(
    `${BASE_URL}/dataset/PowerSystemRightNow?limit=1&sort=Minutes1UTC%20desc`,
    { next: { revalidate: 60 } }
  )

  if (!res.ok) throw new Error(`Energinet fetch failed: ${res.status}`)

  const json = await res.json()
  const r: PowerSystemRecord = json.records?.[0] ?? {}

  const windOffshore = r.OffshoreWindPower ?? 0
  const windOnshore = r.OnshoreWindPower ?? 0
  const wind = windOffshore + windOnshore
  const solar = r.SolarPower ?? 0
  const bio = r.ProductionLt100MW ?? 0
  const thermal = r.ProductionGe100MW ?? 0
  const hydro = 0
  const total = wind + solar + bio + thermal + hydro

  const renewablesPct = total > 0 ? Math.round(((wind + solar) / total) * 100) : 0

  // Per-neighbor flows: DK1_DK2 is an internal domestic transfer, not a
  // border flow, so it's excluded here (it's still folded into Exchange_Sum
  // upstream, which we pass through untouched).
  const flowInputs: { label: string; mw: number | null }[] = [
    { label: 'DE', mw: sumNullable(r.Exchange_DK1_DE, r.Exchange_DK2_DE) },
    {
      label: 'SE',
      mw: sumNullable(r.Exchange_DK1_SE, r.Exchange_DK2_SE, r.Exchange_Bornholm_SE),
    },
    { label: 'NO', mw: r.Exchange_DK1_NO },
    { label: 'NL', mw: r.Exchange_DK1_NL },
    { label: 'GB', mw: r.Exchange_DK1_GB },
  ]

  const flows = flowInputs
    .filter((f): f is { label: string; mw: number } => f.mw !== null)
    .map((f) => ({ label: f.label, mw: Math.round(f.mw) }))
    .sort((a, b) => Math.abs(b.mw) - Math.abs(a.mw))

  return {
    production: {
      wind: Math.round(wind),
      solar: Math.round(solar),
      bio: Math.round(bio),
      thermal: Math.round(thermal),
      hydro,
      total: Math.round(total),
    },
    windOffshore: Math.round(windOffshore),
    windOnshore: Math.round(windOnshore),
    exchange: {
      sum: Math.round(r.Exchange_Sum ?? 0),
      flows,
    },
    co2: Math.round(r.CO2Emission ?? 0),
    renewablesPct,
    updatedAt: r.Minutes1DK ?? new Date().toISOString(),
  }
}

function sumNullable(...values: (number | null)[]): number | null {
  const present = values.filter((v): v is number => v !== null)
  if (present.length === 0) return null
  return present.reduce((a, b) => a + b, 0)
}
