import type { Article } from '@/lib/types/news'

const WALLNOT_URL =
  'https://wallnot.dk/?category=indland&category=sport&category=kultur&category=debat&category=erhverv&category=andet'

const DANISH_MONTHS: Record<string, number> = {
  januar: 1, februar: 2, marts: 3, april: 4, maj: 5, juni: 6,
  juli: 7, august: 8, september: 9, oktober: 10, november: 11, december: 12,
}

function parseDanishDate(text: string): string {
  const m = text.match(/(\d+)\.\s+(\w+)\s+(\d{4})/)
  if (!m) return new Date().toISOString().slice(0, 10)
  const day = m[1].padStart(2, '0')
  const month = String(DANISH_MONTHS[m[2].toLowerCase()] ?? 1).padStart(2, '0')
  return `${m[3]}-${month}-${day}`
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&aelig;/gi, 'ae')
    .replace(/&oslash;/gi, 'o')
    .replace(/&aring;/gi, 'a')
}

export async function fetchWallnotNews(): Promise<Article[]> {
  const res = await fetch(WALLNOT_URL, {
    next: { revalidate: 600 },
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DanmarkMonitor/1.0)' },
  })
  if (!res.ok) throw new Error(`wallnot.dk returned ${res.status}`)

  const html = await res.text()
  const articles: Article[] = []

  const dateMatch = html.match(/<h3>([^<]+)<\/h3>/)
  const dateStr = dateMatch ? parseDanishDate(dateMatch[1]) : new Date().toISOString().slice(0, 10)

  const articleRe = /<p class="article">([\s\S]*?)<\/p>/g
  let block: RegExpExecArray | null

  while ((block = articleRe.exec(html)) !== null) {
    const inner = block[1]

    const timeMatch = inner.match(/(\d{2}:\d{2})/)
    const time = timeMatch ? timeMatch[1] : '00:00'
    const pubDate = `${dateStr}T${time}:00`

    const sourceMatch = inner.match(/title="Artikel fra ([^-"]+?) -/)
    const source = sourceMatch ? sourceMatch[1].trim() : 'Ukendt'

    const artMatch = inner.match(/<span class="art">\s*<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/)
    if (!artMatch) continue

    const link = artMatch[1]
    const title = decodeHtmlEntities(artMatch[2].trim())

    articles.push({ id: link, title, link, pubDate, source })
  }

  return articles
}
