import Link from 'next/link'
import { Card } from './ui/card'
import { Avatar, AvatarFallback } from './ui/avatar'
import { ThumbsUp, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface AnswerCardProps {
  id: string
  content: string
  author: string
  authorId?: string
  votes: number
  questionId: string
  questionTitle: string
  createdAt: Date | string
}

export function AnswerCard({
  id,
  content,
  author,
  votes,
  questionId,
  questionTitle,
  createdAt,
}: AnswerCardProps) {
  const date = new Date(createdAt)
  const timeAgo = formatDistanceToNow(date, { addSuffix: true })
  const preview = content.substring(0, 100) + (content.length > 100 ? '...' : '')

  return (
    <Link href={`/questions/${questionId}#answer-${id}`}>
      <Card className="p-6 hover:shadow-md transition-all duration-200 cursor-pointer border-border hover:border-primary/30 group">
        <div className="space-y-3">
          {/* Question Link */}
          <div className="mb-2">
            <p className="text-xs text-muted-foreground">Answered on:</p>
            <p className="text-sm font-medium text-primary group-hover:underline line-clamp-1">
              {questionTitle}
            </p>
          </div>

          {/* Content Preview */}
          <p className="text-sm text-muted-foreground line-clamp-2">{preview}</p>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{author.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-xs">
                <span className="font-medium text-foreground">{author}</span>
                <span className="text-muted-foreground">{timeAgo}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <ThumbsUp className="w-4 h-4" />
              <span>{votes}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  )
}
