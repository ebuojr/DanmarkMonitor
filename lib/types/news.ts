export type NewsSource = string

export interface Article {
  id: string
  title: string
  description?: string
  link: string
  pubDate: string
  source: NewsSource
  imageUrl?: string
}

export interface NewsData {
  articles: Article[]
  updatedAt: string
}

export interface NewsResponse {
  data: NewsData | null
  error?: string
  stale?: boolean
  updatedAt: string
}
