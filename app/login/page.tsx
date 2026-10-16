'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { AuthForm } from '@/components/auth-form'
import { ArrowRight, MessageCircle, ShieldCheck } from 'lucide-react'
import { authApi, usersApi } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()

  const emitAuthChanged = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-change'))
    }
  }

  const handleLogin = async (data: Record<string, string>) => {
    if (!data.email || !data.password) {
      throw new Error('Invalid credentials')
    }

    const response = await authApi.login(data.email, data.password)
    const token = (response as { token?: string }).token

    if (!token) {
      throw new Error('Login failed')
    }

    localStorage.setItem('authToken', token)

    let userPayload: Record<string, string> = { email: data.email }
    try {
      const profile = await usersApi.getMyProfile()
      userPayload = {
        id: String(profile.userId),
        username: profile.username,
        email: profile.email,
      }
    } catch {
      // Login should still succeed even if profile prefetch fails.
    }

    localStorage.setItem('user', JSON.stringify(userPayload))
    emitAuthChanged()

    router.push('/')
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="surface-panel hidden p-8 lg:block">
          <div className="space-y-6">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <MessageCircle className="h-6 w-6" />
            </div>

            <div>
              <h1 className="top-title">Welcome back to QuestHub</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Rejoin your technical threads, continue helping others, and keep your
                knowledge trail alive.
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="soft-panel flex items-center gap-3 p-3">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Secure JWT-authenticated sessions</span>
              </div>
              <div className="soft-panel flex items-center gap-3 p-3">
                <ArrowRight className="h-4 w-4 text-accent" />
                <span className="text-muted-foreground">Get notified on follows, votes, and answers</span>
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <div className="flex flex-col items-center gap-2 lg:hidden">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <MessageCircle className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-semibold text-foreground">QuestHub</h1>
            <p className="text-sm text-muted-foreground">Share knowledge, ask sharper questions.</p>
          </div>

        <Card className="surface-panel p-6 sm:p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Welcome back</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in to your account to continue
              </p>
            </div>

            <AuthForm type="login" onSubmit={handleLogin} />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-2 text-muted-foreground">
                  Don't have an account?
                </span>
              </div>
            </div>

            <Link
              href="/register"
              className="block text-center text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Create an account
            </Link>
          </div>
        </Card>

          <p className="text-center text-xs text-muted-foreground">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}
