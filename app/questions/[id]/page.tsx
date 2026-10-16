'use client'

import { use, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { VoteButtons } from '@/components/vote-buttons'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ArrowLeft, Edit2, Trash2, Share2, Calendar } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { answersApi, followApi, questionsApi, usersApi, VoteResponse } from '@/lib/api'

type VoteDirection = 'up' | 'down'

const getVoteTransition = (
  currentVotes: number,
  currentVote: VoteDirection | null,
  targetVote: VoteDirection
) => {
  if (currentVote === targetVote) {
    return {
      nextVotes: currentVotes + (targetVote === 'up' ? -1 : 1),
      nextVote: null as VoteDirection | null,
      removeVote: true,
    }
  }

  if (!currentVote) {
    return {
      nextVotes: currentVotes + (targetVote === 'up' ? 1 : -1),
      nextVote: targetVote,
      removeVote: false,
    }
  }

  return {
    nextVotes: currentVotes + (targetVote === 'up' ? 2 : -2),
    nextVote: targetVote,
    removeVote: false,
  }
}

const normalizeTag = (value: string): string | null => {
  const cleaned = value.trim().toLowerCase()
  if (!cleaned) {
    return null
  }

  return cleaned.startsWith('#') ? cleaned : `#${cleaned}`
}

const normalizeTags = (tags?: string[]) =>
  (tags ?? []).map(normalizeTag).filter((tag): tag is string => Boolean(tag))

type BackendUser = {
  id: number
  username: string
}

type BackendAnswer = {
  id: number
  content: string
  author?: BackendUser
  createdAt: string
  upvotes?: number
  downvotes?: number
}

type BackendQuestion = {
  id: number
  title: string
  content: string
  author?: BackendUser
  answers?: BackendAnswer[]
  upvotes?: number
  downvotes?: number
  createdAt: string
  tags?: string[]
}

type UiQuestion = {
  id: string
  title: string
  content: string
  author: string
  authorId?: number
  votes: number
  userVote: VoteDirection | null
  createdAt: string
  isOwner: boolean
  tags: string[]
}

type UiAnswer = {
  id: string
  content: string
  author: string
  authorId?: number
  votes: number
  userVote: VoteDirection | null
  createdAt: string
  isOwner: boolean
}

export default function QuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [question, setQuestion] = useState<UiQuestion | null>(null)
  const [answers, setAnswers] = useState<UiAnswer[]>([])
  const [answerText, setAnswerText] = useState('')
  const [isPosting, setIsPosting] = useState(false)
  const [followingUserIds, setFollowingUserIds] = useState<Set<number>>(new Set())
  const [followBusyByUserId, setFollowBusyByUserId] = useState<Record<number, boolean>>({})

  const { currentUsername, currentUserId } = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        currentUsername: null,
        currentUserId: null,
      }
    }

    const raw = localStorage.getItem('user')
    if (!raw) {
      return {
        currentUsername: null,
        currentUserId: null,
      }
    }

    try {
      const parsed = JSON.parse(raw)
      const parsedId = Number(parsed?.id)
      return {
        currentUsername: parsed?.username || null,
        currentUserId: Number.isFinite(parsedId) ? parsedId : null,
      }
    } catch {
      return {
        currentUsername: null,
        currentUserId: null,
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadFollowingUsers = async () => {
      if (!currentUserId) {
        setFollowingUserIds(new Set())
        return
      }

      try {
        const followingUsers = await usersApi.getFollowing(currentUserId)
        if (cancelled) return
        setFollowingUserIds(new Set(followingUsers.map((user) => user.id)))
      } catch {
        if (!cancelled) {
          setFollowingUserIds(new Set())
        }
      }
    }

    void loadFollowingUsers()

    return () => {
      cancelled = true
    }
  }, [currentUserId])

  useEffect(() => {
    let cancelled = false

    const loadQuestion = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = (await questionsApi.getOne(id)) as BackendQuestion
        if (cancelled) return

        setQuestion({
          id: String(response.id),
          title: response.title,
          content: response.content,
          author: response.author?.username || 'Anonymous',
          authorId: response.author?.id,
          votes: (response.upvotes ?? 0) - (response.downvotes ?? 0),
          userVote: null,
          createdAt: response.createdAt,
          isOwner: response.author?.username === currentUsername,
          tags: normalizeTags(response.tags),
        })

        if (response.answers) {
          setAnswers(
            response.answers.map((answer) => ({
              id: String(answer.id),
              content: answer.content,
              author: answer.author?.username || 'Anonymous',
              authorId: answer.author?.id,
              votes: (answer.upvotes ?? 0) - (answer.downvotes ?? 0),
              userVote: null,
              createdAt: answer.createdAt,
              isOwner: answer.author?.username === currentUsername,
            }))
          )
        } else {
          const answerList = (await answersApi.listByQuestion(id)) as BackendAnswer[]
          if (cancelled) return
          setAnswers(
            answerList.map((answer) => ({
              id: String(answer.id),
              content: answer.content,
              author: answer.author?.username || 'Anonymous',
              authorId: answer.author?.id,
              votes: (answer.upvotes ?? 0) - (answer.downvotes ?? 0),
              userVote: null,
              createdAt: answer.createdAt,
              isOwner: answer.author?.username === currentUsername,
            }))
          )
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load question')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadQuestion()

    return () => {
      cancelled = true
    }
  }, [currentUsername, id])

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await questionsApi.delete(id)
      router.push('/')
    } catch (error) {
      console.error('Failed to delete question:', error)
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  const handlePostAnswer = async () => {
    if (!answerText.trim()) return
    setIsPosting(true)
    try {
      await answersApi.create(id, answerText.trim())
      setAnswerText('')
      const answerList = (await answersApi.listByQuestion(id)) as BackendAnswer[]
      setAnswers(
        answerList.map((answer) => ({
          id: String(answer.id),
          content: answer.content,
          author: answer.author?.username || 'Anonymous',
          authorId: answer.author?.id,
          votes: (answer.upvotes ?? 0) - (answer.downvotes ?? 0),
          userVote: null,
          createdAt: answer.createdAt,
          isOwner: answer.author?.username === currentUsername,
        }))
      )
    } catch (err) {
      console.error('Failed to post answer:', err)
    } finally {
      setIsPosting(false)
    }
  }

  const handleQuestionVote = async (voteType: VoteDirection) => {
    if (!question) return

    const previousState = {
      votes: question.votes,
      userVote: question.userVote,
    }

    const transition = getVoteTransition(question.votes, question.userVote, voteType)

    setQuestion((prev) =>
      prev
        ? {
            ...prev,
            votes: transition.nextVotes,
            userVote: transition.nextVote,
          }
        : prev
    )

    try {
      if (transition.removeVote) {
        await questionsApi.removeVote(id)
      } else {
        await questionsApi.vote(id, voteType)
      }

      const refreshedQuestion = (await questionsApi.getOne(id)) as BackendQuestion
      const refreshedVotes = (refreshedQuestion.upvotes ?? 0) - (refreshedQuestion.downvotes ?? 0)

      setQuestion((prev) =>
        prev
          ? {
              ...prev,
              votes: refreshedVotes,
            }
          : prev
      )

      setError(null)
    } catch (err) {
      setQuestion((prev) =>
        prev
          ? {
              ...prev,
              votes: previousState.votes,
              userVote: previousState.userVote,
            }
          : prev
      )
      setError(err instanceof Error ? err.message : 'Failed to vote on question')
    }
  }

  const handleAnswerVote = (answerId: string) => async (voteType: VoteDirection) => {
    const previousAnswer = answers.find((answer) => answer.id === answerId)
    if (!previousAnswer) return

    const transition = getVoteTransition(
      previousAnswer.votes,
      previousAnswer.userVote,
      voteType
    )

    setAnswers((prev) =>
      prev.map((answer) =>
        answer.id === answerId
          ? {
              ...answer,
              votes: transition.nextVotes,
              userVote: transition.nextVote,
            }
          : answer
      )
    )

    try {
      const response = (await answersApi.vote(answerId, voteType)) as VoteResponse
      const serverVoteTotal = response.upvotes - response.downvotes

      const action = response.action?.toUpperCase()
      const serverVoteState: VoteDirection | null =
        action === 'UPVOTED'
          ? 'up'
          : action === 'DOWNVOTED'
            ? 'down'
            : action === 'REMOVED'
              ? null
              : transition.nextVote

      setAnswers((prev) =>
        prev.map((answer) =>
          answer.id === answerId
            ? {
                ...answer,
                votes: serverVoteTotal,
                userVote: serverVoteState,
              }
            : answer
        )
      )
      setError(null)
    } catch (err) {
      setAnswers((prev) =>
        prev.map((answer) =>
          answer.id === answerId
            ? {
                ...answer,
                votes: previousAnswer.votes,
                userVote: previousAnswer.userVote,
              }
            : answer
        )
      )
      setError(err instanceof Error ? err.message : 'Failed to vote on answer')
    }
  }

  const isFollowingUser = (userId?: number) => {
    if (!userId) return false
    return followingUserIds.has(userId)
  }

  const canFollowUser = (userId?: number) => {
    if (!userId || !currentUserId) return false
    return userId !== currentUserId
  }

  const handleToggleFollow = async (targetUserId?: number) => {
    if (!targetUserId || !canFollowUser(targetUserId)) return

    if (followBusyByUserId[targetUserId]) return

    setFollowBusyByUserId((prev) => ({ ...prev, [targetUserId]: true }))
    try {
      const currentlyFollowing = followingUserIds.has(targetUserId)

      if (currentlyFollowing) {
        await followApi.unfollowUser(targetUserId)
      } else {
        await followApi.followUser(targetUserId)
      }

      setFollowingUserIds((prev) => {
        const next = new Set(prev)
        if (currentlyFollowing) {
          next.delete(targetUserId)
        } else {
          next.add(targetUserId)
        }
        return next
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update follow status')
    } finally {
      setFollowBusyByUserId((prev) => ({ ...prev, [targetUserId]: false }))
    }
  }

  const timeAgo = question
    ? formatDistanceToNow(new Date(question.createdAt), { addSuffix: true })
    : ''

  return (
    <div className="min-h-screen">
      <div className="page-shell max-w-5xl py-10 sm:py-12">
        {/* Header Navigation */}
        <Link href="/">
          <Button variant="ghost" className="-ml-2 mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Questions
          </Button>
        </Link>

        {/* Main Question Card */}
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading && !question ? (
          <div className="text-sm text-muted-foreground">Loading question...</div>
        ) : null}

        {question ? (
          <Card className="surface-panel mb-8 p-5 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row">
              {/* Votes */}
              <VoteButtons
                votes={question.votes}
                currentVote={question.userVote}
                onVote={handleQuestionVote}
              />

              {/* Content */}
              <div className="flex-1">
                <h1 className="top-title mb-4 text-3xl">
                  {question.title}
                </h1>

                {question.tags.length > 0 ? (
                  <div className="mb-5 flex flex-wrap gap-2">
                    {question.tags.map((tag, index) => (
                      <span
                        key={`${tag}-${index}`}
                        className="rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-medium text-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* Question Meta */}
                <div className="mb-6 flex flex-wrap items-center gap-4 border-b border-border/70 pb-6 text-sm">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{question.author.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">{question.author}</p>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {timeAgo}
                      </div>
                    </div>
                  </div>

                  {(question.isOwner || canFollowUser(question.authorId)) && (
                    <div className="ml-auto flex gap-2">
                      {canFollowUser(question.authorId) && question.authorId ? (
                        <Button
                          variant={isFollowingUser(question.authorId) ? 'outline' : 'default'}
                          size="sm"
                          className="rounded-md border-border/70"
                          disabled={followBusyByUserId[question.authorId]}
                          onClick={() => {
                            void handleToggleFollow(question.authorId)
                          }}
                        >
                          {followBusyByUserId[question.authorId]
                            ? 'Updating...'
                            : isFollowingUser(question.authorId)
                              ? 'Unfollow'
                              : 'Follow'}
                        </Button>
                      ) : null}

                      {question.isOwner && (
                        <>
                          <Button variant="outline" size="sm" className="gap-1 rounded-xl border-border/70 bg-transparent">
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 rounded-xl border-border/70 bg-transparent text-destructive"
                            onClick={() => setDeleteDialogOpen(true)}
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Question Content */}
                <div className="prose prose-sm max-w-none text-foreground mb-6">
                  {question.content.split('\n\n').map((paragraph, idx) => (
                    <p
                      key={idx}
                      className="mb-4 text-muted-foreground leading-relaxed whitespace-pre-wrap"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1 rounded-xl border-border/70 bg-transparent">
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ) : null}

        {/* Answers Section */}
        <div className="mb-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              Answers ({answers.length})
            </h2>
          </div>

          {/* Answer Cards */}
          <div className="space-y-4">
            {answers.map((answer) => (
              <Card key={answer.id} className="surface-panel p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                  <VoteButtons
                    votes={answer.votes}
                    currentVote={answer.userVote}
                    onVote={handleAnswerVote(answer.id)}
                  />

                  <div className="flex-1">
                    {/* Answer Meta */}
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{answer.author.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="text-sm">
                          <p className="font-medium text-foreground">{answer.author}</p>
                          <p className="text-muted-foreground">
                            {formatDistanceToNow(new Date(answer.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>

                      {canFollowUser(answer.authorId) && answer.authorId ? (
                        <Button
                          variant={isFollowingUser(answer.authorId) ? 'outline' : 'default'}
                          size="sm"
                          className="rounded-md border-border/70"
                          disabled={followBusyByUserId[answer.authorId]}
                          onClick={() => {
                            void handleToggleFollow(answer.authorId)
                          }}
                        >
                          {followBusyByUserId[answer.authorId]
                            ? 'Updating...'
                            : isFollowingUser(answer.authorId)
                              ? 'Unfollow'
                              : 'Follow'}
                        </Button>
                      ) : null}
                    </div>

                    {/* Answer Content */}
                    <p className="text-muted-foreground mb-4 whitespace-pre-wrap">
                      {answer.content}
                    </p>

                    {/* Answer Actions */}
                    {answer.isOwner && (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Answer Form */}
        <Card className="surface-panel p-5 sm:p-8">
          <h3 className="text-lg font-bold text-foreground mb-4">Post Your Answer</h3>
          <textarea
            placeholder="Share your knowledge and answer this question..."
            value={answerText}
            onChange={(event) => setAnswerText(event.target.value)}
            className="h-36 w-full resize-none rounded-xl border border-border/70 bg-background/80 p-4 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={handlePostAnswer}
              disabled={isPosting || !answerText.trim()}
              className="h-11 rounded-xl px-5"
            >
              {isPosting ? 'Posting...' : 'Post Answer'}
            </Button>
            <Button variant="outline" className="h-11 rounded-xl border-border/70 bg-transparent">Preview</Button>
          </div>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Question</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this question? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
