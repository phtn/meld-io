import { useCallback, useRef, useState } from 'octane'
import { MELD_API_VERSION, type MeldMethod } from '@/lib/meld/endpoints'
import type { ApiResponse, MeldEnvironment } from '../types'

type RequestParams = Record<string, string | string[]>

const getBaseUrl = (environment: MeldEnvironment): string => {
  return environment === 'sandbox' ? 'https://api-sb.meld.io' : 'https://api.meld.io'
}

function shouldRedactHeader(name: string): boolean {
  return /authorization|private|oauth/i.test(name)
}

export function useMeldApi() {
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleApiCall = useCallback(
    async (
      endpoint: string,
      apiKey: string,
      environment: MeldEnvironment,
      method: MeldMethod,
      body?: unknown,
      params?: RequestParams,
      requestHeaders?: Record<string, string>,
      apiKeyAvailable = false,
    ) => {
      abortControllerRef.current?.abort()
      const abortController = new AbortController()
      abortControllerRef.current = abortController
      setLoading(true)
      setResponse(null)

      const pathParams: Record<string, string> = {}
      const queryParams: RequestParams = {}
      Object.entries(params || {}).forEach(([key, value]) => {
        if (endpoint.includes(`{${key}}`)) {
          pathParams[key] = Array.isArray(value) ? value.join(',') : value
        } else {
          queryParams[key] = value
        }
      })

      let upstreamUrl = `${getBaseUrl(environment)}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
      let proxyPath = `/api/meld/${environment}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`
      Object.entries(pathParams).forEach(([key, value]) => {
        const encodedValue = encodeURIComponent(value)
        upstreamUrl = upstreamUrl.replace(`{${key}}`, encodedValue)
        proxyPath = proxyPath.replace(`{${key}}`, encodedValue)
      })

      const search = new URLSearchParams()
      Object.entries(queryParams).forEach(([key, value]) => {
        if (Array.isArray(value)) value.forEach((item) => search.append(key, item))
        else search.set(key, value)
      })
      const queryString = search.toString()
      if (queryString) {
        upstreamUrl += `?${queryString}`
        proxyPath += `?${queryString}`
      }

      const headers = new Headers({ Accept: 'application/json', 'Meld-Version': MELD_API_VERSION })
      if (body !== undefined) headers.set('Content-Type', 'application/json')
      Object.entries(requestHeaders || {}).forEach(([name, value]) => {
        const key = name.toLowerCase()
        if (key !== 'authorization' && key !== 'meld-version' && value.trim()) headers.set(name, value)
      })
      if (apiKey.trim()) headers.set('Authorization', `BASIC ${apiKey.trim()}`)

      const displayHeaders: Record<string, string> = {
        Authorization: apiKey.trim()
          ? 'BASIC [OVERRIDE REDACTED]'
          : apiKeyAvailable ? 'BASIC [SERVER KEY]' : 'BASIC [NOT CONFIGURED]',
        Accept: 'application/json',
        'Meld-Version': MELD_API_VERSION,
      }
      if (body !== undefined) displayHeaders['Content-Type'] = 'application/json'
      Object.entries(requestHeaders || {}).forEach(([name, value]) => {
        displayHeaders[name] = shouldRedactHeader(name) ? '[REDACTED]' : value
      })

      try {
        const fetchOptions: RequestInit = {
          method,
          headers,
          signal: abortController.signal,
        }
        if (body !== undefined && method !== 'GET' && method !== 'DELETE') {
          fetchOptions.body = JSON.stringify(body)
        }

        const result = await fetch(proxyPath, fetchOptions)
        if (abortController.signal.aborted) return

        const contentType = result.headers.get('content-type') || ''
        let data: unknown
        if (contentType.includes('application/json')) data = await result.json()
        else data = await result.text()

        if (!abortController.signal.aborted) {
          setResponse({
            success: result.ok,
            data,
            url: upstreamUrl,
            method,
            headers: displayHeaders,
            body: body ?? undefined,
            params: params || undefined,
          })
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError' && !abortController.signal.aborted) {
          setResponse({
            success: false,
            error: error.message,
            url: upstreamUrl,
            method,
            headers: displayHeaders,
            body,
            params: params || undefined,
          })
        }
      } finally {
        if (!abortController.signal.aborted) setLoading(false)
      }
    },
    [],
  )

  return { loading, response, handleApiCall }
}
