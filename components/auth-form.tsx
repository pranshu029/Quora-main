'use client'

import { type ChangeEvent, type FormEvent, useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Alert, AlertDescription } from './ui/alert'
import { Loader2 } from 'lucide-react'

interface AuthFormProps {
  type: 'login' | 'register'
  onSubmit: (data: Record<string, string>) => Promise<void>
}

export function AuthForm({ type, onSubmit }: AuthFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all required fields')
      return
    }

    if (type === 'register') {
      if (!formData.username) {
        setError('Username is required')
        return
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        return
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters')
        return
      }
    }

    setLoading(true)
    try {
      await onSubmit(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const inputBaseClass = 'h-11 rounded-md border-border bg-background focus-visible:ring-primary/70'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {type === 'register' && (
        <div className="space-y-2">
          <Label htmlFor="username" className="text-sm font-medium text-foreground/90">Username</Label>
          <Input
            id="username"
            name="username"
            placeholder="username"
            value={formData.username}
            onChange={handleChange}
            disabled={loading}
            className={inputBaseClass}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium text-foreground/90">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="example@gmail.com"
          value={formData.email}
          onChange={handleChange}
          disabled={loading}
          className={inputBaseClass}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium text-foreground/90">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••"
          value={formData.password}
          onChange={handleChange}
          disabled={loading}
          className={inputBaseClass}
        />
      </div>

      {type === 'register' && (
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground/90">Confirm Password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="••••••"
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={loading}
            className={inputBaseClass}
          />
        </div>
      )}

      <Button type="submit" className="h-11 w-full rounded-md" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {type === 'login' ? 'Sign In' : 'Create Account'}
      </Button>

      <p className="text-xs text-muted-foreground">
        {type === 'login'
          ? 'Use the same email and password you registered with.'
          : 'Choose a secure password with at least 6 characters.'}
      </p>
    </form>
  )
}
