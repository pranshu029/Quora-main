import Link from 'next/link'
import { Card } from './ui/card'
import { Avatar, AvatarFallback } from './ui/avatar'
import { MessageSquare, ThumbsUp, Calendar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface QuestionCardProps {
  id: string
  title: string
  content: string
  author: string
  authorId?: string
  votes: number
  answerCount: number
  createdAt: Date | string
  tags?: string[]
}

const normalizeDisplayTag = (tag: string): string | null => {
  const cleaned = tag.trim().toLowerCase()
  if (!cleaned) {
    return null
  }

  return cleaned.startsWith('#') ? cleaned : `#${cleaned}`
}

export function QuestionCard({
  id,
  title,
  content,
  author,
  votes,
  answerCount,
  createdAt,
  tags = [],
}: QuestionCardProps) {
  const date = new Date(createdAt)
  const timeAgo = formatDistanceToNow(date, { addSuffix: true })
  const preview = content.substring(0, 150) + (content.length > 150 ? '...' : '')
  const normalizedTags = Array.from(
    new Set(
      tags
        .map(normalizeDisplayTag)
        .filter((tag): tag is string => Boolean(tag))
    )
  )
  const visibleTags = normalizedTags.slice(0, 4)

  return (
    <Link href={`/questions/${id}`} className="group block">
      <Card className="surface-panel mx-0 my-2 min-w-0 cursor-pointer p-5 transition-colors hover:border-border sm:p-6">
        <div className="space-y-4">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <h3 className="min-w-0 flex-1 break-words text-lg font-semibold leading-snug text-foreground transition-colors [overflow-wrap:anywhere] sm:text-xl">
              {title}
            </h3>

            <div className="hidden shrink-0 whitespace-nowrap rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary sm:block">
              {votes >= 0 ? '+' : ''}{votes}
            </div>
          </div>

          <p className="break-words text-sm leading-relaxed text-muted-foreground [overflow-wrap:anywhere]">
            {preview}
          </p>

          {visibleTags.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {visibleTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {normalizedTags.length > visibleTags.length ? (
                <span className="text-xs text-muted-foreground">
                  +{normalizedTags.length - visibleTags.length}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                  {author.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col text-xs leading-5">
                <span className="break-words font-medium text-foreground [overflow-wrap:anywhere]">{author}</span>
                <div className="flex flex-wrap items-center gap-x-1 break-words text-muted-foreground">
                  <Calendar className="h-3 w-3 shrink-0" />
                  {timeAgo}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-4 whitespace-nowrap text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <ThumbsUp className="w-4 h-4" />
                <span>{votes}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                <span>{answerCount}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
