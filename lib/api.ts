// API Service - Centralized API calls with authentication

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export type VoteDirection = 'up' | 'down'
export type VoteType = 'UPVOTE' | 'DOWNVOTE'

const toVoteType = (direction: VoteDirection): VoteType =>
  direction === 'up' ? 'UPVOTE' : 'DOWNVOTE'

export interface ApiResponse<T> {
  data: T
  status: number
  message?: string
}

export interface ApiError {
  status: number
  message: string
  errors?: Record<string, string>
}

export interface LoginResponse {
  message: string
  token: string
}

export interface RegisterResponse {
  message: string
}

export interface UserResponse {
  id: number
  username: string
  email: string
  followersCount: number
  followingCount: number
}

export interface AnswerResponse {
  id: number
  content: string
  author?: UserResponse
  createdAt: string
  upvotes: number
  downvotes: number
}

export interface QuestionResponse {
  id: number
  title: string
  content: string
  author?: UserResponse
  answers?: AnswerResponse[]
  upvotes: number
  downvotes: number
  createdAt: string
  tags: string[]
}

export interface VoteResponse {
  action: string
  upvotes: number
  downvotes: number
  ownerReputation: number
}

export interface FollowResponse {
  message: string
}

export interface QuestionSummaryResponse {
  id: number
  title: string
  createdAt: string
}

export interface AnswerSummaryResponse {
  id: number
  content: string
  questionId: number
  createdAt: string
}

export interface UserProfileResponse {
  userId: number
  username: string
  email: string
  bio: string | null
  reputation: number
  questionCount: number
  answerCount: number
  questions: QuestionSummaryResponse[]
  answers: AnswerSummaryResponse[]
}

export interface NotificationResponse {
  id: number
  message: string
  type: string
  isRead?: boolean
  read?: boolean
  createdAt: string
}

export interface UnreadCountResponse {
  unreadCount: number
}

export interface CreateQuestionResponse {
  id: number
  message: string
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    const token = this.getAuthToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    return headers
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('authToken')
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    })

    const contentType = response.headers.get('content-type') || ''
    const raw = await response.text()
    let data: unknown = raw

    if (contentType.includes('application/json') && raw) {
      try {
        data = JSON.parse(raw)
      } catch {
        data = raw
      }
    }

    if (!response.ok) {
      const error: ApiError = {
        status: response.status,
        message:
          typeof data === 'object' && data !== null && 'message' in data
            ? (data as { message?: string }).message || 'An error occurred'
            : typeof data === 'string' && data
            ? data
            : 'An error occurred',
        errors:
          typeof data === 'object' && data !== null && 'errors' in data
            ? (data as { errors?: Record<string, string> }).errors
            : undefined,
      }
      throw error
    }

    return {
      data: data as T,
      status: response.status,
      message:
        typeof data === 'object' && data !== null && 'message' in data
          ? (data as { message?: string }).message
          : undefined,
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await this.request<T>(endpoint)
    return response.data
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    const options: RequestInit = { method: 'POST' }
    if (body !== undefined) {
      options.body = JSON.stringify(body)
    }
    const response = await this.request<T>(endpoint, options)
    return response.data
  }

  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    const options: RequestInit = { method: 'PUT' }
    if (body !== undefined) {
      options.body = JSON.stringify(body)
    }
    const response = await this.request<T>(endpoint, options)
    return response.data
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'DELETE',
    })
    return response.data
  }
}

export const apiClient = new ApiClient()

// Auth endpoints
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<LoginResponse>('/api/auth/login', { email, password }),

  register: (username: string, email: string, password: string) =>
    apiClient.post<RegisterResponse>('/api/auth/register', { username, email, password }),

  logout: () => apiClient.post<string>('/api/auth/logout'),
}

// Questions endpoints
export const questionsApi = {
  list: (page = 0, size = 10) =>
    apiClient.get<PageResponse<QuestionResponse>>(`/api/questions?page=${page}&size=${size}`),

  getAll: () => apiClient.get<QuestionResponse[]>('/api/questions/all'),

  getOne: (id: string) => apiClient.get<QuestionResponse>(`/api/questions/${id}`),

  create: (title: string, content: string, tags?: string[]) =>
    apiClient.post<CreateQuestionResponse>('/api/questions', {
      title,
      content,
      ...(tags && tags.length > 0 ? { tags } : {}),
    }),

  update: (id: string, title: string, content: string) =>
    apiClient.put<string>(`/api/questions/${id}`, { title, content }),

  delete: (id: string) => apiClient.delete<string>(`/api/questions/${id}`),

  vote: (id: string, type: VoteDirection) =>
    apiClient.post<void>(`/api/questions/${id}/vote`, {
      voteType: toVoteType(type),
    }),

  removeVote: (id: string) => apiClient.delete<void>(`/api/questions/${id}/vote`),
}

// Answers endpoints
export const answersApi = {
  listByQuestion: (questionId: string) =>
    apiClient.get<AnswerResponse[]>(`/api/answers/question/${questionId}`),

  create: (questionId: string, content: string) =>
    apiClient.post<string>('/api/answers', { questionId, content }),

  update: (id: string, content: string) =>
    apiClient.put<string>(`/api/answers/${id}`, { content }),

  delete: (id: string) => apiClient.delete<string>(`/api/answers/${id}`),

  getByUser: (userId: string) =>
    apiClient.get<AnswerResponse[]>(`/api/answers/user/${userId}`),

  getUserAnswers: () => apiClient.get<AnswerResponse[]>('/api/answers/me'),

  vote: (id: string, type: VoteDirection) =>
    apiClient.post<VoteResponse>(
      `/api/answers/${id}/vote?voteType=${toVoteType(type)}`
    ),
}

// Users endpoints
export const usersApi = {
  getMyProfile: () => apiClient.get<UserProfileResponse>('/api/users/me/profile'),

  updateMyProfile: (bio: string) =>
    apiClient.put<void>('/api/users/me/profile', { bio }),

  deleteMyBio: () => apiClient.delete<string>('/api/users/me/bio'),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.put<string>('/api/users/me/change-password', {
      currentPassword,
      newPassword,
    }),

  getFollowers: (userId: string | number) =>
    apiClient.get<UserResponse[]>(`/api/users/${userId}/followers`),

  getFollowing: (userId: string | number) =>
    apiClient.get<UserResponse[]>(`/api/users/${userId}/following`),
}

export const followApi = {
  followUser: (userId: string | number) =>
    apiClient.post<FollowResponse>(`/api/follow/${userId}`),

  unfollowUser: (userId: string | number) =>
    apiClient.delete<FollowResponse>(`/api/follow/${userId}`),
}

export const notificationsApi = {
  list: () => apiClient.get<NotificationResponse[]>('/api/notifications'),

  getUnreadCount: () =>
    apiClient.get<UnreadCountResponse>('/api/notifications/unread-count'),

  markAsRead: (id: string | number) =>
    apiClient.put<void>(`/api/notifications/${id}/read`),

  markAllAsRead: () => apiClient.put<void>('/api/notifications/read-all'),
}
