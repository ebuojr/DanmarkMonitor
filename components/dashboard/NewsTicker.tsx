'use client'

import { useEffect, useState } from 'react'
import { useNews } from '@/lib/hooks/useNews'

const SOURCE_COLORS: Record<string, string> = {
  DR:  'text-blue-400',
  TV2: 'text-orange-400',
}

const INTERVAL_MS = 6000

export function NewsTicker() {
  const { data } = useNews()
  const articles = data?.data?.articles ?? []
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (articles.length < 2) return
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex((i) => (i + 1) % articles.length)
        setVisible(true)
      }, 350)
    }, INTERVAL_MS)
    return () => clearInterval(id)
  }, [articles.length])

  const article = articles[index]

  return (
    <div className="flex items-center gap-0 h-full overflow-hidden">
      <div className="shrink-0 flex items-center gap-2 border-r border-border px-3 h-full">
        <span className="size-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
        <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Nyheder
        </span>
      </div>

      <div className="flex-1 min-w-0 px-3 overflow-hidden">
        {!article ? (
          <div className="h-3 bg-muted rounded animate-pulse w-64" />
        ) : (
          <div
            className="flex items-center gap-2 text-xs min-w-0 transition-opacity duration-300"
            style={{ opacity: visible ? 1 : 0 }}
          >
            <span className={`shrink-0 font-semibold text-[10px] tracking-wider uppercase ${SOURCE_COLORS[article.source] ?? 'text-muted-foreground'}`}>
              {article.source}
            </span>
            <span className="text-foreground truncate">{article.title}</span>
            {article.pubDate && (
              <span className="shrink-0 text-muted-foreground/60 text-[10px]">
                {new Date(article.pubDate).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
        )}
      </div>

      {articles.length > 1 && (
        <div className="shrink-0 flex items-center gap-1 px-3 border-l border-border h-full">
          <span className="text-[10px] text-muted-foreground/50 tabular-nums">
            {index + 1}/{articles.length}
          </span>
        </div>
      )}
    </div>
  )
}
