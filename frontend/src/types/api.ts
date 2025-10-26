// API response types

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  error: string | null
}

