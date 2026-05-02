'use client'

import { useNews } from '@/lib/hooks/useNews'
import type { Article } from '@/lib/types/news'

function ArticleRow({ article }: { article: Article }) {
  const time = new Date(article.pubDate).toLocaleTimeString('da-DK', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group block space-y-0.5 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium leading-tight group-hover:text-primary line-clamp-2">
          {article.title}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide">
          {article.source}
        </span>
        <span className="text-[10px] text-muted-foreground/40">{time}</span>
      </div>
    </a>
  )
}

export function NewsWidget() {
  const { data, isLoading, error } = useNews()

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse px-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <div className="h-3 bg-muted rounded w-full" />
            <div className="h-3 bg-muted rounded w-4/5" />
            <div className="h-2 bg-muted rounded w-1/3" />
          </div>
        ))}
      </div>
    )
  }

  if (error || !data?.data) {
    return <p className="px-2 text-xs text-muted-foreground">Nyheder utilgængelige</p>
  }

  return (
    <div className="space-y-0.5">
      {data.data.articles.map((article) => (
        <ArticleRow key={article.id} article={article} />
      ))}
    </div>
  )
}
