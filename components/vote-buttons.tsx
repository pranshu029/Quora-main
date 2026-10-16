'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { ThumbsUp, ThumbsDown } from 'lucide-react'

interface VoteButtonsProps {
  votes: number
  currentVote?: 'up' | 'down' | null
  onVote: (type: 'up' | 'down') => Promise<void>
  isLoading?: boolean
}

export function VoteButtons({
  votes,
  currentVote = null,
  onVote,
  isLoading = false,
}: VoteButtonsProps) {
  const [isVoting, setIsVoting] = useState(false)

  const handleVote = async (type: 'up' | 'down') => {
    if (isVoting || isLoading) return

    setIsVoting(true)
    try {
      await onVote(type)
    } catch (error) {
      console.error('Vote request failed:', error)
    } finally {
      setIsVoting(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-border bg-background p-1.5">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-md"
        onClick={() => handleVote('up')}
        disabled={isVoting || isLoading}
        title="Upvote"
      >
        <ThumbsUp
          className={`h-4 w-4 ${currentVote === 'up' ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
        />
      </Button>

      <span className="min-w-6 text-center text-sm font-semibold text-foreground">{votes}</span>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-md"
        onClick={() => handleVote('down')}
        disabled={isVoting || isLoading}
        title="Downvote"
      >
        <ThumbsDown
          className={`h-4 w-4 ${currentVote === 'down' ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`}
        />
      </Button>
    </div>
  )
}
