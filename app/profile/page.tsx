'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Loader2, LogOut, Settings, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import {
  authApi,
  followApi,
  questionsApi,
  usersApi,
  type UserProfileResponse,
  type UserResponse,
} from '@/lib/api'

type ActiveTab = 'questions' | 'answers' | 'network' | 'settings'

type MessageType = 'success' | 'error'

type InlineMessage = {
  type: MessageType
  text: string
}

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim().length > 0) {
      return message
    }
  }

  return fallback
}

const emitAuthChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('auth-change'))
  }
}

export default function ProfilePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ActiveTab>('questions')
  const [profile, setProfile] = useState<UserProfileResponse | null>(null)
  const [questionTitles, setQuestionTitles] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [followers, setFollowers] = useState<UserResponse[]>([])
  const [following, setFollowing] = useState<UserResponse[]>([])
  const [networkLoading, setNetworkLoading] = useState(false)
  const [networkMessage, setNetworkMessage] = useState<InlineMessage | null>(null)
  const [networkBusyByUserId, setNetworkBusyByUserId] = useState<Record<number, boolean>>({})

  const [bioDraft, setBioDraft] = useState('')
  const [bioBusy, setBioBusy] = useState(false)
  const [bioMessage, setBioMessage] = useState<InlineMessage | null>(null)

  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<InlineMessage | null>(null)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const followingIds = useMemo(
    () => new Set(following.map((user) => user.id)),
    [following]
  )

  useEffect(() => {
    let cancelled = false

    const loadProfile = async () => {
      const token = localStorage.getItem('authToken')
      if (!token) {
        router.replace('/login')
        return
      }

      setLoading(true)
      setPageError(null)

      try {
        const myProfile = await usersApi.getMyProfile()
        if (cancelled) return

        setProfile(myProfile)
        setBioDraft(myProfile.bio ?? '')

        localStorage.setItem(
          'user',
          JSON.stringify({
            id: String(myProfile.userId),
            username: myProfile.username,
            email: myProfile.email,
          })
        )

        const uniqueQuestionIds = Array.from(
          new Set(myProfile.answers.map((answer) => answer.questionId))
        )

        if (uniqueQuestionIds.length === 0) {
          setQuestionTitles({})
        } else {
          const titleEntries = await Promise.all(
            uniqueQuestionIds.map(async (questionId) => {
              try {
                const question = await questionsApi.getOne(String(questionId))
                return [String(questionId), question.title] as const
              } catch {
                return [String(questionId), `Question #${questionId}`] as const
              }
            })
          )

          if (cancelled) return
          setQuestionTitles(Object.fromEntries(titleEntries))
        }

        setNetworkLoading(true)
        setNetworkMessage(null)
        try {
          const [followersList, followingList] = await Promise.all([
            usersApi.getFollowers(myProfile.userId),
            usersApi.getFollowing(myProfile.userId),
          ])

          if (cancelled) return
          setFollowers(followersList)
          setFollowing(followingList)
        } catch (networkError) {
          if (!cancelled) {
            setNetworkMessage({
              type: 'error',
              text: getErrorMessage(networkError, 'Failed to load network data'),
            })
          }
        } finally {
          if (!cancelled) {
            setNetworkLoading(false)
          }
        }
      } catch (error) {
        if (cancelled) return

        const status =
          typeof error === 'object' && error !== null && 'status' in error
            ? (error as { status?: number }).status
            : undefined

        if (status === 401) {
          localStorage.removeItem('authToken')
          localStorage.removeItem('user')
          emitAuthChanged()
          router.replace('/login')
          return
        }

        setPageError(getErrorMessage(error, 'Failed to load profile'))
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadProfile()

    return () => {
      cancelled = true
    }
  }, [router])

  const handleBioSave = async (event: FormEvent) => {
    event.preventDefault()
    if (!profile) return

    const nextBio = bioDraft.trim()
    setBioBusy(true)
    setBioMessage(null)

    try {
      await usersApi.updateMyProfile(nextBio)
      setProfile((prev) => (prev ? { ...prev, bio: nextBio || null } : prev))
      setBioMessage({
        type: 'success',
        text: nextBio
          ? 'Bio updated successfully.'
          : 'Bio cleared successfully.',
      })
    } catch (error) {
      setBioMessage({
        type: 'error',
        text: getErrorMessage(error, 'Failed to update bio'),
      })
    } finally {
      setBioBusy(false)
    }
  }

  const handleBioDelete = async () => {
    if (!profile) return

    setBioBusy(true)
    setBioMessage(null)

    try {
      await usersApi.deleteMyBio()
      setBioDraft('')
      setProfile((prev) => (prev ? { ...prev, bio: null } : prev))
      setBioMessage({ type: 'success', text: 'Bio deleted successfully.' })
    } catch (error) {
      setBioMessage({
        type: 'error',
        text: getErrorMessage(error, 'Failed to delete bio'),
      })
    } finally {
      setBioBusy(false)
    }
  }

  const handlePasswordChange = async (event: FormEvent) => {
    event.preventDefault()
    setPasswordMessage(null)

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setPasswordMessage({
        type: 'error',
        text: 'Please fill in all password fields.',
      })
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage({
        type: 'error',
        text: 'New password must be at least 6 characters.',
      })
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' })
      return
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordMessage({
        type: 'error',
        text: 'New password must be different from current password.',
      })
      return
    }

    setPasswordBusy(true)
    try {
      await usersApi.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      )

      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setPasswordMessage({
        type: 'success',
        text: 'Password changed successfully.',
      })
    } catch (error) {
      setPasswordMessage({
        type: 'error',
        text: getErrorMessage(error, 'Failed to change password'),
      })
    } finally {
      setPasswordBusy(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await authApi.logout()
    } catch {
      // Token is stateless; local cleanup should still proceed.
    } finally {
      localStorage.removeItem('authToken')
      localStorage.removeItem('user')
      emitAuthChanged()
      router.push('/login')
      setIsLoggingOut(false)
    }
  }

  const handleToggleNetworkFollow = async (targetUserId: number) => {
    if (!profile || targetUserId === profile.userId) return
    if (networkBusyByUserId[targetUserId]) return

    const currentlyFollowing = followingIds.has(targetUserId)

    setNetworkBusyByUserId((prev) => ({ ...prev, [targetUserId]: true }))
    setNetworkMessage(null)

    try {
      if (currentlyFollowing) {
        await followApi.unfollowUser(targetUserId)
      } else {
        await followApi.followUser(targetUserId)
      }

      const [followersList, followingList] = await Promise.all([
        usersApi.getFollowers(profile.userId),
        usersApi.getFollowing(profile.userId),
      ])

      setFollowers(followersList)
      setFollowing(followingList)
      setNetworkMessage({
        type: 'success',
        text: currentlyFollowing ? 'User unfollowed.' : 'User followed.',
      })
    } catch (error) {
      setNetworkMessage({
        type: 'error',
        text: getErrorMessage(error, 'Failed to update follow status'),
      })
    } finally {
      setNetworkBusyByUserId((prev) => ({ ...prev, [targetUserId]: false }))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="page-shell max-w-5xl py-10 sm:py-12">
          <Card className="surface-panel p-8">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading your profile...
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen">
        <div className="page-shell max-w-5xl py-10 sm:py-12">
          <Card className="surface-panel space-y-4 p-8">
            <p className="text-destructive text-sm">
              {pageError || 'Unable to load profile.'}
            </p>
            <div className="flex gap-3">
              <Button onClick={() => window.location.reload()}>Retry</Button>
              <Link href="/">
                <Button variant="outline">Back to Home</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="page-shell max-w-5xl py-10 sm:py-12">
        {/* Header Navigation */}
        <Link href="/">
          <Button variant="ghost" className="gap-2 -ml-2 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Questions
          </Button>
        </Link>

        {/* Profile Header */}
        <Card className="surface-panel mb-8 p-6 sm:p-8">
          <div className="mb-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-start sm:gap-6">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl">
                  {profile.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground">
                  {profile.username}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">{profile.email}</p>
                <p className="text-muted-foreground mt-2">
                  {profile.bio || 'No bio added yet.'}
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                  <div className="soft-panel p-3">
                    <p className="font-semibold text-foreground">{profile.reputation}</p>
                    <p className="text-muted-foreground">Reputation</p>
                  </div>
                  <div className="soft-panel p-3">
                    <p className="font-semibold text-foreground">{profile.questionCount}</p>
                    <p className="text-muted-foreground">Questions</p>
                  </div>
                  <div className="soft-panel p-3">
                    <p className="font-semibold text-foreground">{profile.answerCount}</p>
                    <p className="text-muted-foreground">Answers</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex w-full flex-col gap-2 sm:w-auto">
              <Button
                variant="outline"
                className="gap-2 rounded-xl border-border/70 bg-transparent"
                onClick={() => setActiveTab('settings')}
              >
                <Settings className="w-4 h-4" />
                Settings
              </Button>
              <Button
                variant="outline"
                className="gap-2 rounded-xl border-border/70 bg-transparent text-destructive"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </Button>
            </div>
          </div>

          {pageError ? (
            <Alert variant="destructive">
              <AlertDescription>{pageError}</AlertDescription>
            </Alert>
          ) : null}
        </Card>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ActiveTab)}
          className="w-full"
        >
          <TabsList className="mb-8 grid w-full grid-cols-2 gap-1 rounded-xl md:grid-cols-4">
            <TabsTrigger value="questions">
              My Questions ({profile.questions.length})
            </TabsTrigger>
            <TabsTrigger value="answers">
              My Answers ({profile.answers.length})
            </TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Questions Tab */}
          <TabsContent value="questions" className="space-y-4">
            {profile.questions.length > 0 ? (
              <div className="space-y-4">
                {profile.questions.map((question) => (
                  <Link key={question.id} href={`/questions/${question.id}`}>
                    <Card className="surface-panel p-5 transition hover:-translate-y-0.5">
                      <h3 className="font-semibold text-foreground mb-2 line-clamp-2">
                        {question.title}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Asked{' '}
                        {formatDistanceToNow(new Date(question.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="surface-panel p-8 text-center">
                <p className="text-muted-foreground mb-4">You haven't asked any questions yet</p>
                <Link href="/questions/new">
                  <Button>Ask Your First Question</Button>
                </Link>
              </Card>
            )}
          </TabsContent>

          {/* Answers Tab */}
          <TabsContent value="answers" className="space-y-4">
            {profile.answers.length > 0 ? (
              <div className="space-y-4">
                {profile.answers.map((answer) => (
                  <Link
                    key={answer.id}
                    href={`/questions/${answer.questionId}#answer-${answer.id}`}
                  >
                    <Card className="surface-panel p-5 transition hover:-translate-y-0.5">
                      <p className="text-xs text-muted-foreground mb-2">Answer on</p>
                      <h3 className="font-semibold text-primary mb-3 line-clamp-1">
                        {questionTitles[String(answer.questionId)] || `Question #${answer.questionId}`}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {answer.content}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Answered{' '}
                        {formatDistanceToNow(new Date(answer.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card className="surface-panel p-8 text-center">
                <p className="text-muted-foreground mb-4">You haven't answered any questions yet</p>
                <Link href="/">
                  <Button>Browse Questions</Button>
                </Link>
              </Card>
            )}
          </TabsContent>

          {/* Network Tab */}
          <TabsContent value="network" className="space-y-6">
            {networkMessage ? (
              <Alert variant={networkMessage.type === 'error' ? 'destructive' : 'default'}>
                <AlertDescription>{networkMessage.text}</AlertDescription>
              </Alert>
            ) : null}

            {networkLoading ? (
              <Card className="p-6 border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading followers and following...
                </div>
              </Card>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card className="surface-panel space-y-4 p-6">
                  <h2 className="text-lg font-semibold text-foreground">
                    Followers ({followers.length})
                  </h2>

                  {followers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No followers yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {followers.map((user) => {
                        const isOwnProfile = user.id === profile.userId
                        const isFollowingBack = followingIds.has(user.id)
                        const isBusy = Boolean(networkBusyByUserId[user.id])

                        return (
                          <div
                            key={`follower-${user.id}`}
                            className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-card/70 p-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback>
                                  {user.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {user.username}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {user.email}
                                </p>
                              </div>
                            </div>

                            {!isOwnProfile ? (
                              <Button
                                size="sm"
                                variant={isFollowingBack ? 'outline' : 'default'}
                                className="rounded-md"
                                disabled={isBusy}
                                onClick={() => {
                                  void handleToggleNetworkFollow(user.id)
                                }}
                              >
                                {isBusy
                                  ? 'Updating...'
                                  : isFollowingBack
                                    ? 'Unfollow'
                                    : 'Follow Back'}
                              </Button>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card>

                <Card className="surface-panel space-y-4 p-6">
                  <h2 className="text-lg font-semibold text-foreground">
                    Following ({following.length})
                  </h2>

                  {following.length === 0 ? (
                    <p className="text-sm text-muted-foreground">You are not following anyone yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {following.map((user) => {
                        const isBusy = Boolean(networkBusyByUserId[user.id])

                        return (
                          <div
                            key={`following-${user.id}`}
                            className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback>
                                  {user.username.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {user.username}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {user.email}
                                </p>
                              </div>
                            </div>

                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-transparent"
                              disabled={isBusy}
                              onClick={() => {
                                void handleToggleNetworkFollow(user.id)
                              }}
                            >
                              {isBusy ? 'Updating...' : 'Unfollow'}
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="p-6 border-border space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Edit Bio</h2>

              <form onSubmit={handleBioSave} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bioDraft}
                    onChange={(event) => {
                      setBioDraft(event.target.value)
                      setBioMessage(null)
                    }}
                    placeholder="Tell the community about yourself"
                    rows={5}
                    disabled={bioBusy}
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={bioBusy}>
                    {bioBusy ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Bio'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 text-destructive"
                    disabled={bioBusy || (!bioDraft.trim() && !profile.bio)}
                    onClick={handleBioDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Bio
                  </Button>
                </div>
              </form>

              {bioMessage ? (
                <Alert variant={bioMessage.type === 'error' ? 'destructive' : 'default'}>
                  <AlertDescription>{bioMessage.text}</AlertDescription>
                </Alert>
              ) : null}
            </Card>

            <Card className="p-6 border-border space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Change Password</h2>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        currentPassword: event.target.value,
                      }))
                    }
                    disabled={passwordBusy}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        newPassword: event.target.value,
                      }))
                    }
                    disabled={passwordBusy}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: event.target.value,
                      }))
                    }
                    disabled={passwordBusy}
                  />
                </div>

                <Button type="submit" disabled={passwordBusy}>
                  {passwordBusy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </form>

              {passwordMessage ? (
                <Alert
                  variant={passwordMessage.type === 'error' ? 'destructive' : 'default'}
                >
                  <AlertDescription>{passwordMessage.text}</AlertDescription>
                </Alert>
              ) : null}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
