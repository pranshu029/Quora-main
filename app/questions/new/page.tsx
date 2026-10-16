'use client'

import { type ChangeEvent, type FormEvent, type KeyboardEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'
import { questionsApi } from '@/lib/api'

const MAX_TAGS = 8

const normalizeTag = (rawTag: string): string | null => {
  const cleaned = rawTag
    .trim()
    .toLowerCase()
    .replace(/^#+/, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  if (!cleaned) {
    return null
  }

  return `#${cleaned}`
}

const parseTags = (rawInput: string) =>
  rawInput
    .split(',')
    .map(normalizeTag)
    .filter((tag): tag is string => Boolean(tag))

export default function NewQuestionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    tags: [] as string[],
  })

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  const addTagsFromInput = () => {
    if (!tagInput.trim()) {
      return
    }

    const parsedTags = parseTags(tagInput)
    if (parsedTags.length === 0) {
      setTagInput('')
      return
    }

    setFormData((prev) => {
      const mergedTags = Array.from(new Set([...prev.tags, ...parsedTags])).slice(
        0,
        MAX_TAGS
      )
      return { ...prev, tags: mergedTags }
    })
    setTagInput('')
    setError('')
  }

  const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      addTagsFromInput()
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (tagInput.trim()) {
      const parsedTags = parseTags(tagInput)
      if (parsedTags.length > 0) {
        setFormData((prev) => ({
          ...prev,
          tags: Array.from(new Set([...prev.tags, ...parsedTags])).slice(0, MAX_TAGS),
        }))
      }
    }

    if (!formData.title.trim()) {
      setError('Question title is required')
      return
    }

    if (!formData.content.trim()) {
      setError('Question description is required')
      return
    }

    if (formData.title.length < 10) {
      setError('Title must be at least 10 characters')
      return
    }

    if (formData.content.length < 20) {
      setError('Description must be at least 20 characters')
      return
    }

    setLoading(true)
    try {
      const parsedTagInput = tagInput.trim() ? parseTags(tagInput) : []
      const tagsForSubmit = Array.from(
        new Set([...formData.tags, ...parsedTagInput])
      ).slice(0, MAX_TAGS)

      await questionsApi.create(
        formData.title.trim(),
        formData.content.trim(),
        tagsForSubmit
      )
      router.push('/') // Redirect to home after creation
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create question')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      <div className="page-shell max-w-3xl py-10 sm:py-12">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Question Composer
            </span>
            <h1 className="top-title">Ask a Thoughtful Question</h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Help others by sharing your question with the community
            </p>
          </div>
        </div>

        {/* Form Card */}
        <Card className="surface-panel p-5 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Title Field */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-base font-semibold">
                Question Title
              </Label>
              <p className="text-sm text-muted-foreground">
                Be specific and use a clear title
              </p>
              <Input
                id="title"
                name="title"
                placeholder="What is your question? Be specific and clear..."
                value={formData.title}
                onChange={handleChange}
                disabled={loading}
                className="h-12 rounded-xl border-border/70 bg-background/80"
              />
              <p className="text-xs text-muted-foreground">
                {formData.title.length} / 150 characters
              </p>
            </div>

            {/* Content Field */}
            <div className="space-y-2">
              <Label htmlFor="content" className="text-base font-semibold">
                Question Details
              </Label>
              <p className="text-sm text-muted-foreground">
                Provide more context and details about your question
              </p>
              <Textarea
                id="content"
                name="content"
                placeholder="Explain your question in detail. Include any relevant code, error messages, or context that might help others understand your problem..."
                value={formData.content}
                onChange={handleChange}
                disabled={loading}
                rows={10}
                className="resize-none rounded-xl border-border/70 bg-background/80"
              />
              <p className="text-xs text-muted-foreground">
                {formData.content.length} characters
              </p>
            </div>

            {/* Tags Field */}
            <div className="space-y-2">
              <Label htmlFor="tags" className="text-base font-semibold">
                Tags
              </Label>
              <p className="text-sm text-muted-foreground">
                Add comma-separated tags to help others find your question.
              </p>

              <Input
                id="tags"
                name="tags"
                placeholder="react, spring-boot, jwt"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={addTagsFromInput}
                disabled={loading || formData.tags.length >= MAX_TAGS}
                className="h-11 rounded-xl border-border/70 bg-background/80"
              />

              <p className="text-xs text-muted-foreground">
                Press Enter or comma to add up to {MAX_TAGS} tags.
              </p>

              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent-foreground transition hover:bg-accent/20"
                    disabled={loading}
                  >
                    {tag} ×
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <Button type="submit" disabled={loading} className="h-11 flex-1 rounded-xl shadow-sm">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Post Your Question
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                className="h-11 rounded-xl border-border/70 bg-card/70"
              >
                <Link href="/">Cancel</Link>
              </Button>
            </div>
          </form>
        </Card>

        {/* Tips Section */}
        <Card className="soft-panel mt-8 p-6">
          <h3 className="font-semibold text-foreground mb-3">Tips for writing a good question:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Use a specific, descriptive title</li>
            <li>• Include relevant code snippets or error messages</li>
            <li>• Explain what you have tried so far</li>
            <li>• Provide context about your environment (language, framework, version)</li>
            <li>• Check if similar questions have already been answered</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
