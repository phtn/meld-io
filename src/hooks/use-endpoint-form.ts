import { type EndpointConfig, type EndpointParameter, type OpenApiSchema, MELD_API_VERSION } from '@/lib/meld/endpoints'
import { useCallback, useEffect, useLinkedState } from 'octane'
import type { MeldEnvironment } from '../types'

type RequestParams = Record<string, string | string[]>

interface UseEndpointFormProps {
  endpoint: EndpointConfig
  apiKey: string
  apiKeyAvailable: boolean
  countryCode: string
  onRequestChange?: (
    url: string,
    method: EndpointConfig['method'],
    headers: Record<string, string>,
    body?: unknown,
    params?: RequestParams,
  ) => void
}

interface RequestInfo {
  url: string
  method: EndpointConfig['method']
  headers: Record<string, string>
  wireHeaders: Record<string, string>
  body?: unknown
  params?: RequestParams
  bodyError?: string
}

function parameterKey(parameter: EndpointParameter): string {
  return `${parameter.in}:${parameter.name}`
}

function stringifyValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function getParameterExample(parameter: EndpointParameter): unknown {
  if (parameter.example !== undefined && parameter.example !== '') return parameter.example
  if (parameter.schema.example !== undefined && parameter.schema.example !== '') return parameter.schema.example
  if (parameter.schema.default !== undefined && parameter.schema.default !== '') return parameter.schema.default
  return parameter.schema.enum?.[0]
}

function initialParameterValues(endpoint: EndpointConfig, countryCode: string): Record<string, string> {
  const values: Record<string, string> = {}
  endpoint.parameters.forEach((parameter) => {
    if (parameter.name.toLowerCase() === 'meld-version' || parameter.name.toLowerCase() === 'authorization') return
    const example = parameter.name === 'countryCode' && !parameter.example
      ? countryCode || getParameterExample(parameter)
      : getParameterExample(parameter)
    values[parameterKey(parameter)] = stringifyValue(example)
  })
  return values
}

function exampleFromSchema(schema: OpenApiSchema | undefined, depth = 0): unknown {
  if (!schema || depth > 7) return {}
  if (schema.example !== undefined) return schema.example
  if (schema.default !== undefined) return schema.default
  if (schema.enum?.length) return schema.enum[0]
  if (schema.oneOf?.length) return exampleFromSchema(schema.oneOf[0], depth + 1)
  if (schema.anyOf?.length) return exampleFromSchema(schema.anyOf[0], depth + 1)
  if (schema.allOf?.length) {
    return Object.assign({}, ...schema.allOf.map((part) => exampleFromSchema(part, depth + 1)))
  }

  if (schema.type === 'object' || schema.properties) {
    const result: Record<string, unknown> = {}
    Object.entries(schema.properties || {}).forEach(([key, property]) => {
      if (schema.required?.includes(key) || property.example !== undefined || property.default !== undefined) {
        result[key] = exampleFromSchema(property, depth + 1)
      }
    })
    return result
  }
  if (schema.type === 'array') return []
  if (schema.type === 'integer' || schema.type === 'number') return schema.minimum ?? 0
  if (schema.type === 'boolean') return false
  if (schema.type === 'string') return ''
  return {}
}

function applyDetectedCountry(value: unknown, schema: OpenApiSchema | undefined, countryCode: string): unknown {
  if (!countryCode || !schema || !value || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map((item) => applyDetectedCountry(item, schema.items, countryCode))

  const result = { ...(value as Record<string, unknown>) }
  Object.entries(schema.properties || {}).forEach(([name, property]) => {
    if (name === 'countryCode' && typeof result[name] === 'string') result[name] = countryCode
    else if (result[name] !== undefined) result[name] = applyDetectedCountry(result[name], property, countryCode)
  })
  return result
}

function initialBodyText(endpoint: EndpointConfig, countryCode: string): string {
  if (!endpoint.requestBody) return ''
  const example = endpoint.requestBody.example !== undefined
    ? endpoint.requestBody.example
    : exampleFromSchema(endpoint.requestBody.schema)
  const value = applyDetectedCountry(example, endpoint.requestBody.schema, countryCode)
  return JSON.stringify(value, null, 2)
}

function parseRequestBody(bodyText: string, requestBody: EndpointConfig['requestBody']): { body?: unknown; error?: string } {
  if (!requestBody) return {};
  if (!bodyText.trim()) {
    return requestBody.required ? { error: 'A JSON request body is required.' } : {};
  }
  try {
    return { body: JSON.parse(bodyText) };
  } catch {
    return { error: 'Request body must be valid JSON.' };
  }
}

function shouldRedactHeader(name: string): boolean {
  return /authorization|private|oauth/i.test(name)
}

export function useEndpointForm({ endpoint, apiKey, apiKeyAvailable, countryCode, onRequestChange }: UseEndpointFormProps) {
  const [environment, setEnvironment] = useLinkedState('meld-environment', () => 'sandbox' as MeldEnvironment)
  const [paramValues, setParamValues] = useLinkedState(
    endpoint.id,
    () => initialParameterValues(endpoint, countryCode),
  )
  const [bodyText, setBodyText] = useLinkedState(endpoint.id, () => initialBodyText(endpoint, countryCode))

  const setParamValue = useCallback((key: string, value: string | null) => {
    setParamValues((current) => ({ ...current, [key]: value || '' }))
  }, [setParamValues])

  const setBodyValue = useCallback((value: string) => setBodyText(value), [setBodyText])

  const buildRequestInfo = useCallback((): RequestInfo => {
    const pathParams: Record<string, string> = {}
    const queryParams: RequestParams = {}
    const wireHeaders: Record<string, string> = {}
    let url = `${environment === 'sandbox' ? 'https://api-sb.meld.io' : 'https://api.meld.io'}${endpoint.path}`

    endpoint.parameters.forEach((parameter) => {
      const value = paramValues[parameterKey(parameter)] || ''
      const normalizedLocation = parameter.in.toLowerCase()
      if (normalizedLocation === 'path') {
        if (value) pathParams[parameter.name] = value
      } else if (normalizedLocation === 'query') {
        if (value) {
          const isArray = parameter.schema.type === 'array'
          const arrayValues = isArray ? value.split(',').map((part) => part.trim()).filter(Boolean) : []
          if (!isArray) {
            queryParams[parameter.name] = value
          } else {
            const delimiter = parameter.style === 'spaceDelimited' ? ' ' : parameter.style === 'pipeDelimited' ? '|' : ','
            const explode = parameter.explode ?? (parameter.style ?? 'form') === 'form'
            queryParams[parameter.name] = explode ? arrayValues : arrayValues.join(delimiter)
          }
        }
      } else if (normalizedLocation === 'header' && parameter.name.toLowerCase() !== 'meld-version' && parameter.name.toLowerCase() !== 'authorization') {
        if (value) wireHeaders[parameter.name] = value
      }
    })

    Object.entries(pathParams).forEach(([name, value]) => {
      url = url.replace(`{${name}}`, encodeURIComponent(value))
    })
    const queryString = new URLSearchParams()
    Object.entries(queryParams).forEach(([name, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => queryString.append(name, item))
      } else {
        queryString.set(name, value)
      }
    })
    if (queryString.size > 0) url += `?${queryString.toString()}`

    const { body, error: bodyError } = parseRequestBody(bodyText, endpoint.requestBody)

    const headers: Record<string, string> = {
      Authorization: apiKey.trim()
        ? 'BASIC [OVERRIDE REDACTED]'
        : apiKeyAvailable ? 'BASIC [SERVER KEY]' : 'BASIC [NOT CONFIGURED]',
      Accept: 'application/json',
      'Meld-Version': MELD_API_VERSION,
    }
    if (endpoint.requestBody) headers['Content-Type'] = endpoint.requestBody.contentType || 'application/json'
    Object.entries(wireHeaders).forEach(([name, value]) => {
      headers[name] = shouldRedactHeader(name) ? '[REDACTED]' : value
    })

    const params = { ...pathParams, ...queryParams }
    return {
      url,
      method: endpoint.method,
      headers,
      wireHeaders,
      body,
      params: Object.keys(params).length > 0 ? params : undefined,
      bodyError,
    }
  }, [endpoint, environment, paramValues, bodyText, apiKey, apiKeyAvailable])

  useEffect(() => {
    if (!onRequestChange) return
    const requestInfo = buildRequestInfo()
    onRequestChange(requestInfo.url, requestInfo.method, requestInfo.headers, requestInfo.body, requestInfo.params)
  }, [onRequestChange, buildRequestInfo])

  const buildSubmitRequest = useCallback(() => {
    const requestInfo = buildRequestInfo()
    return {
      body: requestInfo.body,
      params: requestInfo.params || {},
      headers: requestInfo.wireHeaders,
      bodyError: requestInfo.bodyError,
    }
  }, [buildRequestInfo])

  return {
    environment,
    setEnvironment,
    paramValues,
    setParamValue,
    bodyText,
    bodyError: parseRequestBody(bodyText, endpoint.requestBody).error,
    setBodyValue,
    buildSubmitRequest,
  }
}
