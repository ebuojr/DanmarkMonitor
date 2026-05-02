import Parser from 'rss-parser'
import type { Article, NewsSource } from '@/lib/types/news'

const parser = new Parser({
  headers: { 'User-Agent': 'DanmarkMonitor/1.0 (https://github.com/DanmarkMonitor)' },
  timeout: 8000,
})

export const RSS_FEEDS: { url: string; source: NewsSource }[] = [
  { url: 'https://www.dr.dk/nyheder/service/feeds/allenyheder', source: 'DR' },
  { url: 'https://feeds.tv2.dk/nyheder/rss', source: 'TV2' },
]

export async function fetchRssFeed(url: string, source: NewsSource): Promise<Article[]> {
  const feed = await parser.parseURL(url)

  return feed.items.slice(0, 15).map((item, i) => ({
    id: item.guid ?? item.link ?? `${source}-${i}`,
    title: item.title ?? '',
    description: item.contentSnippet ?? item.summary ?? '',
    link: item.link ?? '',
    pubDate: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
    source,
    imageUrl: item.enclosure?.url,
  }))
}

export async function fetchAllNews(): Promise<Article[]> {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(({ url, source }) => fetchRssFeed(url, source))
  )

  const articles = results
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

  return articles
}
