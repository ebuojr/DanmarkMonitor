import type { Stock } from '@/lib/types/stocks'

const SYMBOLS = ['^OMXC25', 'NOVO-B.CO', 'MAERSK-B.CO', 'DSV.CO', 'ORSTED.CO', 'CARL-B.CO']

const DISPLAY_NAMES: Record<string, string> = {
  '^OMXC25':    'OMXC25',
  'NOVO-B.CO':  'Novo Nordisk',
  'MAERSK-B.CO':'Mærsk',
  'DSV.CO':     'DSV',
  'ORSTED.CO':  'Ørsted',
  'CARL-B.CO':  'Carlsberg',
}

interface ChartMeta {
  regularMarketPrice?: number
  previousClose?: number
  chartPreviousClose?: number
  currency?: string
  shortName?: string
  symbol?: string
}

async function fetchSymbol(symbol: string): Promise<Stock | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`
    const res = await fetch(url, {
      next: { revalidate: 30 },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'da-DK,da;q=0.9,en;q=0.8',
        'Referer': 'https://finance.yahoo.com/',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return null

    const json = await res.json() as { chart?: { result?: { meta: ChartMeta }[] } }
    const meta = json.chart?.result?.[0]?.meta
    if (!meta) return null

    const price = meta.regularMarketPrice ?? 0
    const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? price
    const change = price - prevClose
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0

    return {
      symbol,
      name: DISPLAY_NAMES[symbol] ?? meta.shortName ?? symbol,
      price,
      change,
      changePercent,
      currency: meta.currency ?? 'DKK',
    }
  } catch {
    return null
  }
}

export async function fetchDanishStocks(): Promise<Stock[]> {
  const results = await Promise.all(SYMBOLS.map(fetchSymbol))
  return results.filter((s): s is Stock => s !== null)
}
