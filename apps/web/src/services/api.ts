import { auth } from '@/config/firebase'

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001'
const API_TIMEOUT = 30000 // 30 seconds

// Custom error class
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Request interceptor type
type RequestInterceptor = (config: RequestInit) => RequestInit | Promise<RequestInit>
type ResponseInterceptor = (response: Response) => Response | Promise<Response>

// Interceptors storage
const requestInterceptors: RequestInterceptor[] = []
const responseInterceptors: ResponseInterceptor[] = []

// Add request interceptor
export const addRequestInterceptor = (interceptor: RequestInterceptor) => {
  requestInterceptors.push(interceptor)
  return () => {
    const index = requestInterceptors.indexOf(interceptor)
    if (index !== -1) requestInterceptors.splice(index, 1)
  }
}

// Add response interceptor
export const addResponseInterceptor = (interceptor: ResponseInterceptor) => {
  responseInterceptors.push(interceptor)
  return () => {
    const index = responseInterceptors.indexOf(interceptor)
    if (index !== -1) responseInterceptors.splice(index, 1)
  }
}

// Get auth token
const getAuthToken = async (): Promise<string | null> => {
  try {
    const user = auth.currentUser
    if (!user) return null
    return await user.getIdToken()
  } catch (error) {
    console.error('Error getting auth token:', error)
    return null
  }
}

// API request function
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Build full URL
  const url = `${API_BASE_URL}${endpoint}`

  // Default headers
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'X-App-Version': import.meta.env.VITE_APP_VERSION || '3.0.0',
    'X-Tenant-ID': localStorage.getItem('tenantId') || 'default',
  }

  // Get auth token
  const token = await getAuthToken()
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`
  }

  // Merge options
  let config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  }

  // Apply request interceptors
  for (const interceptor of requestInterceptors) {
    config = await interceptor(config)
  }

  // Create abort controller for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

  try {
    // Make request
    let response = await fetch(url, {
      ...config,
      signal: controller.signal,
    })

    // Clear timeout
    clearTimeout(timeoutId)

    // Apply response interceptors
    for (const interceptor of responseInterceptors) {
      response = await interceptor(response)
    }

    // Handle non-OK responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        errorData.message || `Request failed with status ${response.status}`,
        response.status,
        errorData.code,
        errorData.details
      )
    }

    // Parse response
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return await response.json()
    }

    // Return text for non-JSON responses
    return (await response.text()) as any
  } catch (error) {
    // Clear timeout on error
    clearTimeout(timeoutId)

    // Handle abort error
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request timeout', 408, 'TIMEOUT')
    }

    // Re-throw API errors
    if (error instanceof ApiError) {
      throw error
    }

    // Handle other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500,
      'UNKNOWN_ERROR'
    )
  }
}

// Convenience methods
export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T = any>(endpoint: string, data?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
}

// Add default interceptors
// Retry interceptor
addResponseInterceptor(async (response) => {
  if (response.status === 503) {
    // Service unavailable - retry once
    await new Promise(resolve => setTimeout(resolve, 1000))
    return fetch(response.url, {
      method: response.method,
      headers: response.headers,
    })
  }
  return response
})

// Tenant ID interceptor
addRequestInterceptor((config) => {
  const tenantId = localStorage.getItem('tenantId')
  if (tenantId && config.headers instanceof Headers) {
    config.headers.set('X-Tenant-ID', tenantId)
  }
  return config
})

export default api
