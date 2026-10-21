'use client'
import { type EndpointConfig, hasBodySchema } from '@/lib/meld/endpoints'
import { parseAsString, parseAsStringEnum, useQueryState, useQueryStates } from '@octanejs/nuqs'
import { useCallback, useEffect, useMemo } from 'octane'
import type { MeldEnvironment } from '../types'

interface UseEndpointFormProps {
  endpoint: EndpointConfig
  apiKey: string
  countryCode: string
  onRequestChange?: (
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    headers: Record<string, string>,
    body?: unknown,
    params?: Record<string, string>
  ) => void
}
interface RequestInfo {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers: Record<string, string>
  body?: unknown
  params?: Record<string, string>
}
// Helper to create query state parsers for all endpoint parameters
function createParamParsers(endpoint: EndpointConfig) {
  const parsers: Record<string, ReturnType<typeof parseAsString.withOptions>> = {}
  endpoint.params?.forEach((param) => {
    parsers[`meld.param.${param.name}`] = parseAsString.withOptions({
      history: 'push',
      shallow: false
    })
  })
  if (hasBodySchema(endpoint)) {
    const bodySchemaKeys = Object.keys(endpoint.bodySchema) as Array<keyof typeof endpoint.bodySchema>
    bodySchemaKeys.forEach((key) => {
      parsers[`meld.body.${String(key)}`] = parseAsString.withOptions({
        history: 'push',
        shallow: false
      })
    })
  }
  return parsers
}
export function useEndpointForm({ endpoint, apiKey, countryCode, onRequestChange }: UseEndpointFormProps) {
  const [environment, setEnvironment] = useQueryState(
    'meld.environment',
    parseAsStringEnum(['sandbox', 'production']).withDefault('sandbox').withOptions({
      history: 'push',
      shallow: false
    })
  ) as [MeldEnvironment, (value: MeldEnvironment) => void]
  // Create query states for all parameters dynamically
  const paramParsers = useMemo(() => createParamParsers(endpoint), [endpoint])
  const [paramStates, setParamStates] = useQueryStates(paramParsers as Parameters<typeof useQueryStates>[0], {
    history: 'push',
    shallow: false
  })
  // Extract param and body values from query states
  const paramValues = useMemo(() => {
    const values: Record<string, string> = {}
    endpoint.params?.forEach((param) => {
      const key = `meld.param.${param.name}`
      const value = paramStates[key]
      if (value) {
        values[param.name] = value
      } else if (param.name === 'countryCode' && endpoint.id === 'quote' && countryCode) {
        values[param.name] = countryCode
      }
    })
    return values
  }, [endpoint.params, endpoint.id, paramStates, countryCode])
  const bodyValues = useMemo(() => {
    const values: Record<string, string> = {}
    if (hasBodySchema(endpoint)) {
      // Type-safe iteration over bodySchema keys
      const bodySchemaKeys = Object.keys(endpoint.bodySchema) as Array<keyof typeof endpoint.bodySchema>
      bodySchemaKeys.forEach((key) => {
        const queryKey = `meld.body.${String(key)}`
        const value = paramStates[queryKey]
        if (value) {
          values[String(key)] = value
        } else {
          // If param is also in params, check paramValues as fallback
          const param = endpoint.params?.find((p) => p.name === String(key))
          if (param) {
            const paramKey = `meld.param.${String(key)}`
            const paramValue = paramStates[paramKey]
            if (paramValue) {
              values[String(key)] = paramValue
            } else if (key === 'countryCode' && endpoint.id === 'quote' && countryCode) {
              values[String(key)] = countryCode
            }
          } else if (key === 'countryCode' && endpoint.id === 'quote' && countryCode) {
            values[String(key)] = countryCode
          }
        }
      })
    }
    return values
  }, [endpoint, paramStates, countryCode])
  const setParamValue = useCallback(
    (name: string, value: string | null) => {
      const key = `meld.param.${name}`
      const updates: Record<string, string | null> = { [key]: value }
      // If this param is also in bodySchema, sync the body value
      if (hasBodySchema(endpoint) && name in endpoint.bodySchema) {
        const bodyKey = name as keyof typeof endpoint.bodySchema
        updates[`meld.body.${String(bodyKey)}`] = value
      }
      setParamStates(updates)
    },
    [setParamStates, endpoint]
  )
  const setBodyValue = useCallback(
    (name: string, value: string | null) => {
      const key = `meld.body.${name}`
      const updates: Record<string, string | null> = { [key]: value }
      // If this body field is also in params, sync the param value
      const param = endpoint.params?.find((p) => p.name === name)
      if (param) {
        updates[`meld.param.${name}`] = value
      }
      setParamStates(updates)
    },
    [setParamStates, endpoint.params]
  )
  // Helper function to get base URL
  const getBaseUrl = useCallback((env: MeldEnvironment): string => {
    return env === 'sandbox' ? 'https://api-sb.meld.io' : 'https://api.meld.io'
  }, [])
  // Helper function to get param type
  const getParamType = useCallback(
    (paramName: string): string | undefined => {
      return endpoint.params?.find((p) => p.name === paramName)?.type
    },
    [endpoint.params]
  )
  // Helper function to get value with proper type conversion
  const getTypedValue = useCallback((value: string, paramType: string | undefined): unknown => {
    if (paramType === 'number') {
      const numValue = Number(value)
      return isNaN(numValue) ? value : numValue
    }
    return value
  }, [])
  // Build request info
  const buildRequestInfo = useCallback((): RequestInfo => {
    const baseUrl = getBaseUrl(environment)
    const pathParams: Record<string, string> = {}
    const queryParams: Record<string, string> = {}
    // Separate path params from query params
    endpoint.params?.forEach((param) => {
      const value = paramValues[param.name]
      if (value) {
        if (endpoint.path.includes(`{${param.name}}`)) {
          pathParams[param.name] = value
        } else if (endpoint.method === 'GET') {
          queryParams[param.name] = value
        }
      }
    })
    // Build URL
    let url = `${baseUrl}${endpoint.path.startsWith('/') ? endpoint.path : `/${endpoint.path}`}`
    // Replace path parameters
    Object.entries(pathParams).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, value)
    })
    // Add query parameters for GET requests
    if (Object.keys(queryParams).length > 0 && endpoint.method === 'GET') {
      const queryString = new URLSearchParams(queryParams).toString()
      url = `${url}?${queryString}`
    }
    // Build body
    let body: unknown | undefined
    if (endpoint.method === 'POST' || endpoint.method === 'PUT') {
      // Special handling for createWidgetSession endpoint
      if (endpoint.id === 'createWidgetSession') {
        const sessionData: Record<string, unknown> = {}
        let sessionTypeValue: string | undefined
        // Collect all values from bodyValues and paramValues
        const allValues: Record<string, string> = { ...bodyValues }
        endpoint.params?.forEach((param) => {
          const value = paramValues[param.name]
          if (value && !endpoint.path.includes(`{${param.name}}`)) {
            allValues[param.name] = value
          }
        })
        // Structure the body for createWidgetSession
        Object.entries(allValues).forEach(([key, value]) => {
          if (value) {
            if (key === 'sessionType') {
              sessionTypeValue = value
            } else {
              // For sessionData, keep sourceAmount as string (as per API requirement)
              // All other fields respect their type definitions
              if (key === 'sourceAmount') {
                sessionData[key] = value
              } else {
                const paramType = getParamType(key)
                sessionData[key] = getTypedValue(value, paramType)
              }
            }
          }
        })
        // Build the nested body structure
        const nestedBody: Record<string, unknown> = {}
        if (sessionTypeValue) {
          nestedBody.sessionType = sessionTypeValue
        }
        if (Object.keys(sessionData).length > 0) {
          nestedBody.sessionData = sessionData
        }
        body = Object.keys(nestedBody).length > 0 ? nestedBody : undefined
      } else {
        // Default behavior for other endpoints
        const bodyObj: Record<string, unknown> = {}
        // Type-safe iteration over bodyValues
        Object.entries(bodyValues).forEach(([key, value]) => {
          if (value) {
            const paramType = getParamType(key)
            // Type assertion needed here since bodyObj is Record<string, unknown>
            // but we know the keys are valid from bodySchema
            bodyObj[key] = getTypedValue(value, paramType)
          }
        })
        // Also include params that aren't path params for POST/PUT
        endpoint.params?.forEach((param) => {
          const value = paramValues[param.name]
          if (value && !endpoint.path.includes(`{${param.name}}`)) {
            bodyObj[param.name] = getTypedValue(value, param.type)
          }
        })
        // Auto-inject countryCode for quote endpoint if not already present
        if (endpoint.id === 'quote' && !bodyObj.countryCode && countryCode) {
          bodyObj.countryCode = countryCode
        }
        body = Object.keys(bodyObj).length > 0 ? bodyObj : undefined
      }
    }
    // Build headers
    const headers: Record<string, string> = {
      Authorization: apiKey ? `BASIC ${apiKey.substring(0, 10)}...` : 'BASIC [API Key Required]',
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Meld-Version': '2025-03-04'
    }
    // Combine params - include pathParams for all methods so they can be replaced in URL
    const allParams = { ...pathParams, ...queryParams }
    return {
      url,
      method: endpoint.method,
      headers,
      body,
      params: Object.keys(allParams).length > 0 ? allParams : undefined
    }
  }, [endpoint, environment, paramValues, bodyValues, apiKey, countryCode, getBaseUrl, getParamType, getTypedValue])
  // Notify parent of request changes
  useEffect(() => {
    if (!onRequestChange) return
    const requestInfo = buildRequestInfo()
    onRequestChange(requestInfo.url, requestInfo.method, requestInfo.headers, requestInfo.body, requestInfo.params)
  }, [onRequestChange, buildRequestInfo])
  // Initialize default values and sync countryCode
  useEffect(() => {
    const updates: Record<string, string | null> = {}
    endpoint.params?.forEach((param) => {
      const key = `meld.param.${param.name}`
      const currentValue = paramStates[key]
      const isInBodySchema = hasBodySchema(endpoint) && param.name in endpoint.bodySchema
      const bodyKey = isInBodySchema ? `meld.body.${param.name}` : undefined
      const currentBodyValue = bodyKey ? paramStates[bodyKey] : undefined
      if (!currentValue) {
        if (param.name === 'countryCode' && endpoint.id === 'quote' && countryCode) {
          updates[key] = countryCode
          if (isInBodySchema && bodyKey) {
            updates[bodyKey] = countryCode
          }
        } else if (param.examples.length > 0) {
          const defaultValue = param.examples[0] || null
          updates[key] = defaultValue
          // Sync to body if it's also in bodySchema
          if (isInBodySchema && bodyKey && !currentBodyValue) {
            updates[bodyKey] = defaultValue
          }
        }
      } else if (
        param.name === 'countryCode' &&
        endpoint.id === 'quote' &&
        countryCode &&
        currentValue !== countryCode
      ) {
        updates[key] = countryCode
        if (isInBodySchema && bodyKey) {
          updates[bodyKey] = countryCode
        }
      } else if (isInBodySchema && bodyKey && currentValue && !currentBodyValue) {
        // Sync param value to body if param has value but body doesn't
        updates[bodyKey] = currentValue
      } else if (isInBodySchema && bodyKey && currentBodyValue && !currentValue) {
        // Sync body value to param if body has value but param doesn't
        updates[key] = currentBodyValue
      } else if (isInBodySchema && bodyKey && currentValue && currentBodyValue && currentValue !== currentBodyValue) {
        // If both exist but differ, prefer param value (or we could prefer body, but param seems more authoritative)
        updates[bodyKey] = currentValue
      }
    })
    if (hasBodySchema(endpoint)) {
      const bodySchemaKeys = Object.keys(endpoint.bodySchema) as Array<keyof typeof endpoint.bodySchema>
      bodySchemaKeys.forEach((key) => {
        const keyStr = String(key)
        const queryKey = `meld.body.${keyStr}`
        const currentValue = paramStates[queryKey]
        const param = endpoint.params?.find((p) => p.name === keyStr)
        const paramKey = param ? `meld.param.${keyStr}` : undefined
        const currentParamValue = paramKey ? paramStates[paramKey] : undefined
        if (!currentValue) {
          if (keyStr === 'countryCode' && endpoint.id === 'quote' && countryCode) {
            updates[queryKey] = countryCode
            if (paramKey) {
              updates[paramKey] = countryCode
            }
          } else if (param && param.examples.length > 0) {
            const defaultValue = param.examples[0] || null
            updates[queryKey] = defaultValue
            // Sync to param if param doesn't have a value
            if (paramKey && !currentParamValue) {
              updates[paramKey] = defaultValue
            }
          }
        } else if (keyStr === 'countryCode' && endpoint.id === 'quote' && countryCode && currentValue !== countryCode) {
          updates[queryKey] = countryCode
          if (paramKey) {
            updates[paramKey] = countryCode
          }
        } else if (paramKey && currentValue && !currentParamValue) {
          // Sync body value to param if body has value but param doesn't
          updates[paramKey] = currentValue
        }
      })
    }
    if (Object.keys(updates).length > 0) {
      setParamStates(updates)
    }
  }, [endpoint, countryCode, paramStates, setParamStates])
  // Build request info for submission
  const buildSubmitRequest = useCallback(() => {
    const pathParams: Record<string, string> = {}
    const queryParams: Record<string, string> = {}
    // Separate path params from query params
    endpoint.params?.forEach((param) => {
      const value = paramValues[param.name]
      if (value) {
        if (endpoint.path.includes(`{${param.name}}`)) {
          pathParams[param.name] = value
        } else if (endpoint.method === 'GET') {
          queryParams[param.name] = value
        }
      }
    })
    let body: unknown | undefined
    if (endpoint.method === 'POST' || endpoint.method === 'PUT') {
      // Special handling for createWidgetSession endpoint
      if (endpoint.id === 'createWidgetSession') {
        const sessionData: Record<string, unknown> = {}
        let sessionTypeValue: string | undefined
        // Collect all values from bodyValues and paramValues
        const allValues: Record<string, string> = { ...bodyValues }
        endpoint.params?.forEach((param) => {
          const value = paramValues[param.name]
          if (value && !endpoint.path.includes(`{${param.name}}`)) {
            allValues[param.name] = value
          }
        })
        // Structure the body for createWidgetSession
        Object.entries(allValues).forEach(([key, value]) => {
          if (value) {
            if (key === 'sessionType') {
              sessionTypeValue = value
            } else {
              // For sessionData, keep sourceAmount as string (as per API requirement)
              // All other fields respect their type definitions
              if (key === 'sourceAmount') {
                sessionData[key] = value
              } else {
                const paramType = getParamType(key)
                sessionData[key] = getTypedValue(value, paramType)
              }
            }
          }
        })
        // Build the nested body structure
        const nestedBody: Record<string, unknown> = {}
        if (sessionTypeValue) {
          nestedBody.sessionType = sessionTypeValue
        }
        if (Object.keys(sessionData).length > 0) {
          nestedBody.sessionData = sessionData
        }
        body = Object.keys(nestedBody).length > 0 ? nestedBody : undefined
      } else {
        // Default behavior for other endpoints
        const bodyObj: Record<string, unknown> = {}
        // Type-safe iteration over bodyValues
        Object.entries(bodyValues).forEach(([key, value]) => {
          if (value) {
            const paramType = getParamType(key)
            // Type assertion needed here since bodyObj is Record<string, unknown>
            // but we know the keys are valid from bodySchema
            bodyObj[key] = getTypedValue(value, paramType)
          }
        })
        // Also include params that aren't path params for POST/PUT
        endpoint.params?.forEach((param) => {
          const value = paramValues[param.name]
          if (value && !endpoint.path.includes(`{${param.name}}`)) {
            bodyObj[param.name] = getTypedValue(value, param.type)
          }
        })
        // Auto-inject countryCode for quote endpoint if not already present
        if (endpoint.id === 'quote' && !bodyObj.countryCode && countryCode) {
          bodyObj.countryCode = countryCode
        }
        body = Object.keys(bodyObj).length > 0 ? bodyObj : undefined
      }
    }
    // Include pathParams for all methods so they can be replaced in URL
    const allParams = { ...pathParams, ...queryParams }
    return {
      body,
      params: allParams
    }
  }, [endpoint, paramValues, bodyValues, countryCode, getParamType, getTypedValue])
  return {
    environment,
    setEnvironment,
    paramValues,
    bodyValues,
    setParamValue,
    setBodyValue,
    buildSubmitRequest
  }
}
