'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from './ui/button'
import { Bell, MessageCircle, PenSquare, User } from 'lucide-react'
import { notificationsApi } from '@/lib/api'

export default function Navbar() {
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const checkAuth = () => {
    if (typeof window === 'undefined') return
    const token = localStorage.getItem('authToken')
    setIsAuthenticated(Boolean(token))
  }

  useEffect(() => {
    checkAuth()
    window.addEventListener('storage', checkAuth)
    window.addEventListener('focus', checkAuth)
    window.addEventListener('auth-change', checkAuth)

    return () => {
      window.removeEventListener('storage', checkAuth)
      window.removeEventListener('focus', checkAuth)
      window.removeEventListener('auth-change', checkAuth)
    }
  }, [pathname])

  useEffect(() => {
    let cancelled = false

    const loadUnreadCount = async () => {
      if (!isAuthenticated) {
        setUnreadCount(0)
        return
      }

      try {
        const response = await notificationsApi.getUnreadCount()
        if (!cancelled) {
          setUnreadCount(response.unreadCount)
        }
      } catch {
        if (!cancelled) {
          setUnreadCount(0)
        }
      }
    }

    const handleNotificationsUpdated = () => {
      void loadUnreadCount()
    }

    void loadUnreadCount()
    window.addEventListener('notifications-updated', handleNotificationsUpdated)

    return () => {
      cancelled = true
      window.removeEventListener('notifications-updated', handleNotificationsUpdated)
    }
  }, [isAuthenticated, pathname])

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <MessageCircle className="h-5 w-5" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-foreground">QuestHub</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <>
                <Link href="/notifications" className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 rounded-md border-border bg-transparent px-3"
                  >
                    <Bell className="h-4 w-4" />
                    <span className="hidden md:inline">Notifications</span>
                  </Button>
                  {unreadCount > 0 ? (
                    <span className="absolute -right-2 -top-2 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  ) : null}
                </Link>

                <Link href="/profile">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 rounded-md border-border bg-transparent px-3"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Profile</span>
                  </Button>
                </Link>
              </>
            ) : (
              <Link href="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-md border-border bg-transparent px-3"
                >
                  <span className="hidden sm:inline">Sign In</span>
                  <span className="sm:hidden">Login</span>
                </Button>
              </Link>
            )}
            <Link href="/questions/new">
              <Button size="sm" className="h-9 gap-2 rounded-md px-4">
                <PenSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Ask Question</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
