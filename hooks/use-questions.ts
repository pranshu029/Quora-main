'use client'

import { useState, useCallback } from 'react'

export interface Question {
  id: string
  title: string
  content: string
  author: string
  authorId: string
  votes: number
  answerCount: number
  createdAt: Date | string
  updatedAt?: Date | string
}

export interface PaginatedResponse<T> {
  data: T[]
  page: number
  size: number
  total: number
  totalPages: number
}

export function useQuestions() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchQuestions = useCallback(async (page = 0, size = 10) => {
    setLoading(true)
    setError(null)

    try {
      // Replace with actual API call
      const response = await fetch(`/api/questions?page=${page}&size=${size}`)

      if (!response.ok) {
        throw new Error('Failed to fetch questions')
      }

      const data: PaginatedResponse<Question> = await response.json()
      setQuestions(data.data)

      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchQuestion = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      // Replace with actual API call
      const response = await fetch(`/api/questions/${id}`)

      if (!response.ok) {
        throw new Error('Failed to fetch question')
      }

      const question: Question = await response.json()
      return question
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const createQuestion = useCallback(
    async (title: string, content: string) => {
      setLoading(true)
      setError(null)

      try {
        // Replace with actual API call
        const token = localStorage.getItem('authToken')
        const response = await fetch('/api/questions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title, content }),
        })

        if (!response.ok) {
          throw new Error('Failed to create question')
        }

        const question: Question = await response.json()
        return question
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const updateQuestion = useCallback(
    async (id: string, title: string, content: string) => {
      setLoading(true)
      setError(null)

      try {
        // Replace with actual API call
        const token = localStorage.getItem('authToken')
        const response = await fetch(`/api/questions/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title, content }),
        })

        if (!response.ok) {
          throw new Error('Failed to update question')
        }

        const question: Question = await response.json()
        return question
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An error occurred'
        setError(message)
        throw err
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const deleteQuestion = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)

    try {
      // Replace with actual API call
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/questions/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to delete question')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const voteQuestion = useCallback(async (id: string, voteType: 'up' | 'down') => {
    setError(null)

    try {
      // Replace with actual API call
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/questions/${id}/vote`, {
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
    questions,
    loading,
    error,
    fetchQuestions,
    fetchQuestion,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    voteQuestion,
  }
}
