'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { ArrowLeft, Bell, CheckCheck, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { notificationsApi, type NotificationResponse } from '@/lib/api'

const getIsRead = (notification: NotificationResponse) =>
  Boolean(notification.isRead ?? notification.read)

const formatType = (type: string) =>
  type
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationResponse[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyNotificationId, setBusyNotificationId] = useState<number | null>(null)
  const [isMarkingAll, setIsMarkingAll] = useState(false)

  const handleUnauthorized = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      window.dispatchEvent(new Event('auth-change'))
    }
    router.replace('/login')
  }

  const loadNotifications = async () => {
    if (typeof window !== 'undefined' && !localStorage.getItem('authToken')) {
      handleUnauthorized()
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [notificationList, unread] = await Promise.all([
        notificationsApi.list(),
        notificationsApi.getUnreadCount(),
      ])

      setNotifications(notificationList)
      setUnreadCount(unread.unreadCount)
    } catch (err) {
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? (err as { status?: number }).status
          : undefined

      if (status === 401) {
        handleUnauthorized()
        return
      }

      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadNotifications()
  }, [])

  const unreadInList = useMemo(
    () => notifications.filter((notification) => !getIsRead(notification)).length,
    [notifications]
  )

  const emitNotificationsUpdated = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('notifications-updated'))
    }
  }

  const handleMarkAsRead = async (notificationId: number) => {
    setBusyNotificationId(notificationId)

    try {
      await notificationsApi.markAsRead(notificationId)

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true, read: true }
            : notification
        )
      )
      setUnreadCount((previous) => Math.max(previous - 1, 0))
      emitNotificationsUpdated()
    } catch (err) {
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? (err as { status?: number }).status
          : undefined

      if (status === 401) {
        handleUnauthorized()
        return
      }

      setError(err instanceof Error ? err.message : 'Failed to mark notification as read')
    } finally {
      setBusyNotificationId(null)
    }
  }

  const handleMarkAllAsRead = async () => {
    setIsMarkingAll(true)

    try {
      await notificationsApi.markAllAsRead()
      setNotifications((previous) =>
        previous.map((notification) => ({ ...notification, isRead: true, read: true }))
      )
      setUnreadCount(0)
      emitNotificationsUpdated()
    } catch (err) {
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? (err as { status?: number }).status
          : undefined

      if (status === 401) {
        handleUnauthorized()
        return
      }

      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read')
    } finally {
      setIsMarkingAll(false)
    }
  }

  return (
    <div className="min-h-screen">
      <div className="page-shell max-w-5xl py-10 sm:py-12">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-2">
            <Link href="/" className="inline-block">
              <Button variant="ghost" className="-ml-3 gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Questions
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              Stay updated with follows, answers, and vote activity.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void loadNotifications()
              }}
              disabled={loading}
              className="h-10 gap-2 rounded-xl border-border/70 bg-card/70"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                void handleMarkAllAsRead()
              }}
              disabled={isMarkingAll || unreadCount === 0}
              className="h-10 gap-2 rounded-xl shadow-sm"
            >
              <CheckCheck className="h-4 w-4" />
              {isMarkingAll ? 'Marking...' : 'Mark All Read'}
            </Button>
          </div>
        </div>

        <Card className="surface-panel mb-5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Bell className="h-4 w-4" />
              <span>Total notifications: {notifications.length}</span>
            </div>
            <Badge variant={unreadCount > 0 ? 'default' : 'secondary'}>
              {unreadCount} unread
            </Badge>
          </div>
        </Card>

        {error ? (
          <div className="mb-5 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading ? (
          <Card className="surface-panel p-8 text-sm text-muted-foreground">
            Loading notifications...
          </Card>
        ) : null}

        {!loading && notifications.length === 0 ? (
          <Card className="surface-panel border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          </Card>
        ) : null}

        {!loading && notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const isRead = getIsRead(notification)

              return (
                <Card
                  key={notification.id}
                  className={`surface-panel p-4 transition ${
                    isRead ? 'bg-card/85' : 'bg-primary/5 ring-1 ring-primary/20'
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={isRead ? 'secondary' : 'default'}>
                          {isRead ? 'Read' : 'Unread'}
                        </Badge>
                        <Badge variant="outline">{formatType(String(notification.type))}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground">
                        {notification.message}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isRead || busyNotificationId === notification.id}
                      onClick={() => {
                        void handleMarkAsRead(notification.id)
                      }}
                      className="h-9 rounded-xl border-border/70 bg-transparent"
                    >
                      {busyNotificationId === notification.id ? 'Updating...' : 'Mark Read'}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : null}

        {!loading && notifications.length > 0 && unreadInList !== unreadCount ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Syncing unread counts from server...
          </p>
        ) : null}
      </div>
    </div>
  )
}