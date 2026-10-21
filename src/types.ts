export interface ApiResponse {
  success: boolean
  data?: unknown
  error?: string
  url?: string
  method?: string
  headers?: Record<string, string>
  body?: unknown
  params?: Record<string, string>
}

export interface RequestPreview {
  url?: string
  method?: string
  headers?: Record<string, string>
  body?: unknown
  params?: Record<string, string>
}

export type MeldEnvironment = 'sandbox' | 'production'
