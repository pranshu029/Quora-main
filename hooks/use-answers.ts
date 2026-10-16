'use client'

import { useState, useCallback } from 'react'

export interface Answer {
  id: string
  content: string
  author: string
  authorId: string
  questionId: string
  votes: number
  createdAt: Date | string
  updatedAt?: Date | string
}

export function useAnswers(questionId?: string) {
  const [answers, setAnswers] = useState<Answer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAnswers = useCallback(
    async (qId?: string) => {
      const id = qId || questionId
      if (!id) throw new Error('Question ID is required')

      setLoading(true)
      setError(null)

      try {
        // Replace with actual API call
        const response = await fetch(`/api/answers/question/${id}`)

        if (!response.ok) {
          throw new Error('Failed to fetch answers')
        }

        const data = await response.json()
        setAnswers(data)

        return data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [questionId]
  )

  const createAnswer = useCallback(
    async (content: string, qId?: string) => {
      const id = qId || questionId
      if (!id) throw new Error('Question ID is required')

      setLoading(true)
      setError(null)

      try {
        // Replace with actual API call
        const token = localStorage.getItem('authToken')
        const response = await fetch('/api/answers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ questionId: id, content }),
        })

        if (!response.ok) {
          throw new Error('Failed to create answer')
        }

        const answer: Answer = await response.json()
        setAnswers((prev) => [...prev, answer])

        return answer
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [questionId]
  )

  const updateAnswer = useCallback(async (id: string, content: string) => {
    setLoading(true)
    setError(null)

    try {
      // Replace with actual API call
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/answers/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        throw new Error('Failed to update answer')
      }

      const updated: Answer = await response.json()
      setAnswers((prev) =>
        prev.map((ans) => (ans.id === id ? updated : ans))
      )

      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteAnswer = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      // Replace with actual API call
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/answers/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete answer')
      }

      setAnswers((prev) => prev.filter((ans) => ans.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const voteAnswer = useCallback(async (id: string, voteType: 'up' | 'down') => {
    setError(null)

    try {
      // Replace with actual API call
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/answers/${id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: voteType }),
      })

      if (!response.ok) {
        throw new Error('Failed to vote')
      }

      return await response.json()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      throw err
    }
  }, [])

  return {
    answers,
    loading,
    error,
    fetchAnswers,
    createAnswer,
    updateAnswer,
    deleteAnswer,
    voteAnswer,
  }
}
