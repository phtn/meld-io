import { useCallback, useRef, useState } from 'octane'
import type { ApiResponse, MeldEnvironment } from '../types'

export function useMeldApi() {
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const getBaseUrl = (environment: MeldEnvironment): string => {
    return environment === 'sandbox' ? 'https://api-sb.meld.io' : 'https://api.meld.io'
  }
  const handleApiCall = useCallback(
    async (
      endpoint: string,
      apiKey: string,
      environment: MeldEnvironment,
      method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
      body?: unknown,
      params?: Record<string, string>
    ) => {
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      // Create new AbortController for this request
      const abortController = new AbortController()
      abortControllerRef.current = abortController
      setLoading(true)
      setResponse(null)
      try {
        const baseUrl = getBaseUrl(environment)
        let url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
        // Separate path params from query params
        const pathParams: Record<string, string> = {}
        const queryParams: Record<string, string> = {}
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            // Check if this is a path parameter (exists in the endpoint path)
            if (endpoint.includes(`{${key}}`)) {
              pathParams[key] = value
            } else {
              // It's a query parameter
              queryParams[key] = value
            }
          })
        }
        // Replace path parameters first
        Object.entries(pathParams).forEach(([key, value]) => {
          url = url.replace(`{${key}}`, value)
        })
        // Add query parameters for GET requests after path replacement
        if (method === 'GET' && Object.keys(queryParams).length > 0) {
          const queryString = new URLSearchParams(queryParams).toString()
          url = `${url}?${queryString}`
        }
        // Combine all params for response display (path + query)
        const allParams = { ...pathParams, ...queryParams }
        const headers: HeadersInit = {
          Authorization: `BASIC ${apiKey}`,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
        const fetchOptions: RequestInit = {
          method,
          headers,
          signal: abortController.signal
        }
        if (body && (method === 'POST' || method === 'PUT')) {
          fetchOptions.body = JSON.stringify(body)
        }
        const response = await fetch(url, fetchOptions)
        if (abortController.signal.aborted) {
          return
        }
        const contentType = response.headers.get('content-type') || ''
        let data: unknown
        if (contentType.includes('application/json')) {
          data = await response.json()
        } else {
          data = await response.text()
        }
        if (!abortController.signal.aborted) {
          setResponse({
            success: response.ok,
            data,
            url,
            method,
            headers: {
              Authorization: `BASIC ${apiKey.substring(0, 10)}...`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
              'Meld-Version': '2025-03-04'
            },
            body: body || undefined,
            params: Object.keys(allParams).length > 0 ? allParams : params || undefined
          })
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError' && !abortController.signal.aborted) {
          // Build error URL with path params replaced
          let errorUrl = `${getBaseUrl(environment)}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
          if (params) {
            Object.entries(params).forEach(([key, value]) => {
              if (endpoint.includes(`{${key}}`)) {
                errorUrl = errorUrl.replace(`{${key}}`, value)
              }
            })
          }
          setResponse({
            success: false,
            error: error.message,
            url: errorUrl,
            method,
            params: params || undefined
          })
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false)
        }
      }
    },
    []
  )
  return { loading, response, handleApiCall }
}
