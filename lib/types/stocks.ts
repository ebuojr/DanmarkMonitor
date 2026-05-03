export interface Stock {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  currency: string
}

export interface StocksResponse {
  stocks: Stock[]
  updatedAt: string
}
