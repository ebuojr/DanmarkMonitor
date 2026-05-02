import type { Disruption, DisruptionType } from '@/lib/types/transport'

// Rejseplanen API — requires free API key from help.rejseplanen.dk
// Register at: https://help.rejseplanen.dk/hc/da/articles/214174465
const BASE_URL = 'https://xmlopen.rejseplanen.dk/bin/rest.exe'

function getApiKey(): string {
  const key = process.env.REJSEPLANEN_API_KEY
  if (!key) throw new Error('REJSEPLANEN_API_KEY environment variable not set')
  return key
}

// Rejseplanen returns XML; we request JSON format where supported
export async function fetchDisruptions(): Promise<Disruption[]> {
  const key = getApiKey()

  // Service messages / journey messages endpoint
  const url = `${BASE_URL}/JourneyDetail?format=json&key=${key}`

  // NOTE: Rejseplanen does not have a dedicated disruptions list endpoint in the public API.
  // The typical approach is to monitor specific lines. For now we return an empty list
  // until the specific endpoint is confirmed with the API key holder.
  // See: https://help.rejseplanen.dk/hc/da/articles/214174465
  void url

  return []
}

export type { Disruption, DisruptionType }
