'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { AuthForm } from '@/components/auth-form'
import { Compass, MessageCircle, Sparkles } from 'lucide-react'
import { authApi } from '@/lib/api'

export default function RegisterPage() {
  const router = useRouter()

  const handleRegister = async (data: Record<string, string>) => {
    if (!data.email || !data.password || !data.username) {
      throw new Error('Invalid registration data')
    }

    await authApi.register(data.username, data.email, data.password)

    localStorage.setItem(
      'user',
      JSON.stringify({ email: data.email, username: data.username })
    )

    router.push('/login')
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
              <h1 className="top-title">Build Your Public Problem-Solving Profile</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Join discussions, track your reputation, and share practical answers that help others ship faster.
              </p>
            </div>

            <div className="space-y-3 text-sm">
              <div className="soft-panel flex items-center gap-3 p-3">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-muted-foreground">Earn visibility through quality contributions</span>
              </div>
              <div className="soft-panel flex items-center gap-3 p-3">
                <Compass className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Follow experts and stay on top of active topics</span>
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
            <p className="text-sm text-muted-foreground">Create your account to start contributing.</p>
          </div>

        <Card className="surface-panel p-6 sm:p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Create account</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Join our community to ask and answer questions
              </p>
            </div>

            <AuthForm type="register" onSubmit={handleRegister} />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-2 text-muted-foreground">
                  Already have an account?
                </span>
              </div>
            </div>

            <Link
              href="/login"
              className="block text-center text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Sign in
            </Link>
          </div>
        </Card>

          <p className="text-center text-xs text-muted-foreground">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}
