'use client'

import { useNews } from '@/lib/hooks/useNews'
import type { Article } from '@/lib/types/news'
import { WidgetSkeleton, WidgetError } from '@/components/ui/widget-state'

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
        <p className="text-sm font-medium leading-snug group-hover:text-primary line-clamp-2">
          {article.title}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wide">
          {article.source}
        </span>
        <span className="text-xs text-muted-foreground">{time}</span>
      </div>
    </a>
  )
}

export function NewsWidget() {
  const { data, isLoading, error } = useNews()

  if (isLoading) {
    return (
      <div className="px-2">
        <WidgetSkeleton lines={5} />
      </div>
    )
  }

  if (error || !data?.data) {
    return (
      <div className="px-2">
        <WidgetError label="Nyheder utilgængelige" />
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {data.data.articles.map((article) => (
        <ArticleRow key={article.id} article={article} />
      ))}
    </div>
  )
}
