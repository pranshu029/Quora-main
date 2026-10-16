'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuestionCard } from '@/components/question-card'
import { questionsApi } from '@/lib/api'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

type BackendQuestion = {
  id: number
  title: string
  content: string
  author?: { id: number; username: string }
  answers?: unknown[]
  upvotes?: number
  downvotes?: number
  createdAt: string
  tags?: string[]
}

type SpringPage<T> = {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

type UiQuestion = {
  id: string
  title: string
  content: string
  author: string
  votes: number
  answerCount: number
  createdAt: string
  tags: string[]
}

const PAGE_SIZE = 5
const normalizeTag = (value: string): string | null => {
  const cleaned = value.trim().toLowerCase()
  if (!cleaned) {
    return null
  }

  return cleaned.startsWith('#') ? cleaned : `#${cleaned}`
}

function normalizeQuestions(payload: SpringPage<BackendQuestion> | BackendQuestion[]) {
  const items = Array.isArray(payload) ? payload : payload.content

  return items.map((q) => ({
    id: String(q.id),
    title: q.title,
    content: q.content,
    author: q.author?.username || 'Anonymous',
    votes: (q.upvotes ?? 0) - (q.downvotes ?? 0),
    answerCount: q.answers?.length ?? 0,
    createdAt: q.createdAt,
    tags: (q.tags ?? [])
      .map(normalizeTag)
      .filter((tag): tag is string => Boolean(tag)),
  }))
}

export default function Home() {
  const [currentPage, setCurrentPage] = useState(1)
  const [questions, setQuestions] = useState<UiQuestion[]>([])
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadQuestions = async () => {
      setLoading(true)
      setError(null)

      try {
        const pageIndex = Math.max(currentPage - 1, 0)
        const response = await questionsApi.list(pageIndex, PAGE_SIZE)
        const normalized = normalizeQuestions(response as SpringPage<BackendQuestion>)
        if (!cancelled) {
          setQuestions(normalized)
          setTotalQuestions(
            Array.isArray(response)
              ? normalized.length
              : (response as SpringPage<BackendQuestion>).totalElements
          )
          setTotalPages(
            Array.isArray(response)
              ? Math.max(Math.ceil(normalized.length / PAGE_SIZE), 1)
              : (response as SpringPage<BackendQuestion>).totalPages || 1
          )
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load questions')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadQuestions()

    return () => {
      cancelled = true
    }
  }, [currentPage])

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return
    setCurrentPage(page)
  }

  return (
    <div className="min-h-screen">
      <div className="page-shell py-8 sm:py-10">
        <section className="surface-panel mb-8 min-w-0 p-5 sm:mb-9 sm:p-8 lg:p-9">
          <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:items-end">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                Community Knowledge Exchange
              </span>

              <h1 className="text-balance break-words text-3xl font-semibold leading-[1.15] tracking-tight text-foreground [overflow-wrap:anywhere] sm:text-4xl lg:text-5xl">
                Ask Better Questions. Build Better Answers.
              </h1>

              <p className="max-w-2xl break-words text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                QuestHub is where engineers and learners troubleshoot together, capture hard-won insights,
                and turn edge cases into reusable knowledge.
              </p>

              <div className="flex min-w-0 flex-wrap items-center gap-3 border-l-2 border-primary/50 pl-4 text-sm">
                <span className="text-2xl font-semibold tabular-nums text-foreground">
                  {totalQuestions}
                </span>
                <span className="text-muted-foreground">questions shared by the community</span>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-3 lg:items-end">
              <Link href="/questions/new" className="w-full lg:w-auto">
                <Button className="h-11 w-full gap-2 rounded-md px-6 lg:w-auto">
                  <Plus className="h-4 w-4" />
                  Ask Question
                </Button>
              </Link>
              <p className="break-words text-xs leading-5 text-muted-foreground lg:text-right">
                Add context, expected behavior, and constraints for faster answers.
              </p>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <section className="min-w-0 space-y-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h2 className="min-w-0 break-words text-xl font-semibold leading-tight text-foreground sm:text-2xl">
              Latest Discussions
            </h2>
            <Link href="/questions/new" className="shrink-0 text-sm font-medium text-primary hover:text-primary/80">
              Start a thread <ArrowUpRight className="ml-1 inline h-4 w-4" />
            </Link>
          </div>

          {loading && questions.length === 0 ? (
            <div className="surface-panel p-6 text-sm text-muted-foreground">
              Loading questions...
            </div>
          ) : null}

          {questions.map((question) => (
            <QuestionCard key={question.id} {...question} />
          ))}

          {!loading && questions.length === 0 && !error ? (
            <div className="surface-panel border-dashed p-10 text-center text-sm text-muted-foreground">
              No questions yet. Be the first to ask!
            </div>
          ) : null}
        </section>

        {totalPages > 1 ? (
          <Pagination className="mt-10">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault()
                    goToPage(currentPage - 1)
                  }}
                  className={
                    currentPage === 1 ? 'pointer-events-none opacity-50' : undefined
                  }
                />
              </PaginationItem>

              {Array.from({ length: totalPages }).map((_, index) => {
                const pageNumber = index + 1
                return (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      href="#"
                      isActive={pageNumber === currentPage}
                      onClick={(event) => {
                        event.preventDefault()
                        goToPage(pageNumber)
                      }}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                )
              })}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(event) => {
                    event.preventDefault()
                    goToPage(currentPage + 1)
                  }}
                  className={
                    currentPage === totalPages
                      ? 'pointer-events-none opacity-50'
                      : undefined
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        ) : null}
      </div>
    </div>
  )
}
