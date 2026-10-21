import { MELD_API_VERSION, type EndpointConfig, type EndpointParameter, type OpenApiSchema } from '@/lib/meld/endpoints'
import {
  createEmptyWalletAddressSettings,
  getConfiguredWalletAddresses,
  getRequestValuePreset,
  getWalletAddressForAsset,
  isWalletAddressFieldName,
  WALLET_ADDRESS_ASSETS,
  type WalletAddressSettings
} from '@/lib/meld/request-presets'
import type { MeldEnvironment } from '../types'

type RequestParams = Record<string, string | string[]>

export interface EndpointFormValues {
  environment: MeldEnvironment
  paramValues: Record<string, string>
  bodyValues: Record<string, string>
  bodyText: string
}

export interface RequestInfo {
  url: string
  method: EndpointConfig['method']
  headers: Record<string, string>
  wireHeaders: Record<string, string>
  body?: unknown
  params?: RequestParams
  bodyError?: string
}

export function parameterFieldName(index: number): string {
  return `p${index}`
}

export function bodyFieldName(index: number): string {
  return `b${index}`
}

function stringifyValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function normalizeFieldName(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '').toLowerCase()
}

function isEmptyField(name: string, emptyFields: readonly string[]): boolean {
  const normalizedName = normalizeFieldName(name)
  return emptyFields.some((emptyField) => normalizeFieldName(emptyField) === normalizedName)
}

function mergePresetSchemas(left: OpenApiSchema, right: OpenApiSchema): OpenApiSchema {
  const properties = { ...(left.properties || {}) }
  Object.entries(right.properties || {}).forEach(([name, property]) => {
    properties[name] = properties[name] ? mergePresetSchemas(properties[name], property) : property
  })
  return {
    ...left,
    ...right,
    type: left.type || right.type,
    properties: Object.keys(properties).length > 0 ? properties : undefined,
    required: [...new Set([...(left.required || []), ...(right.required || [])])],
    enum: right.enum || left.enum
  }
}

function normalizePresetSchema(schema: OpenApiSchema, presetIndex: number, depth = 0): OpenApiSchema {
  if (depth > 8) return schema
  let normalized = { ...schema }
  ;(schema.allOf || []).forEach((part) => {
    normalized = mergePresetSchemas(normalized, normalizePresetSchema(part, presetIndex, depth + 1))
  })
  const variants = schema.oneOf || schema.anyOf || []
  if (variants.length > 0) {
    const variant = variants[presetIndex % variants.length]
    normalized = mergePresetSchemas(normalized, normalizePresetSchema(variant, presetIndex, depth + 1))
  }
  return normalized
}

function presetString(name: string, schema: OpenApiSchema, presetIndex: number, value?: string): string {
  const preset = getRequestValuePreset(presetIndex)
  const slug = name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  const shortVariants = ['u', 'g', 'j', 'p']
  const countryVariants = ['us', 'gb', 'jp', 'ph']
  const variantsByLength = [
    '',
    shortVariants,
    countryVariants,
    ['us1', 'gb2', 'jp3', 'ph4'],
    ['us01', 'gb02', 'jp03', 'ph04'],
    ['us-01', 'gb-02', 'jp-03', 'ph-04']
  ]
  let result = value ?? `${preset.id}-${slug || 'value'}-${presetIndex + 1}`
  const maxLength = schema.maxLength
  if (maxLength !== undefined && maxLength <= 5) {
    result = variantsByLength[maxLength]?.[presetIndex] ?? result
  }
  if (result.length < (schema.minLength || 0)) {
    const suffix = `${preset.id}${presetIndex + 1}`
    result += suffix.repeat(Math.ceil(((schema.minLength || 0) - result.length) / suffix.length))
  }
  return maxLength === undefined ? result : result.slice(0, maxLength)
}

function presetNumber(schema: OpenApiSchema, name: string, presetIndex: number): number {
  const integer = schema.type === 'integer'
  const step = integer ? 1 : 0.5
  let value: number
  if (schema.minimum !== undefined && schema.maximum !== undefined) {
    value = schema.minimum + (schema.maximum - schema.minimum) * (presetIndex / 3)
  } else if (schema.minimum !== undefined) {
    value = schema.minimum + step * presetIndex
  } else if (schema.maximum !== undefined) {
    value = schema.maximum - step * (3 - presetIndex)
  } else {
    value = /amount|quantity|value/i.test(name) ? [100, 200, 500, 1000][presetIndex] : [1, 10, 25, 50][presetIndex]
  }
  if (integer) value = Math.round(value)
  if (schema.minimum !== undefined) value = Math.max(schema.minimum, value)
  if (schema.maximum !== undefined) value = Math.min(schema.maximum, value)
  return value
}

function presetLeafValue(
  currentValue: unknown,
  schema: OpenApiSchema,
  name: string,
  presetIndex: number,
  walletAddresses: WalletAddressSettings,
  emptyFields: readonly string[]
): unknown {
  const normalized = normalizePresetSchema(schema, presetIndex)
  const preset = getRequestValuePreset(presetIndex)
  const normalizedName = normalizeFieldName(name)
  const enumValues = normalized.enum || []
  const hasEnumValue = (value: unknown) => enumValues.some((option) => String(option) === String(value))
  const type =
    normalized.type ||
    (typeof currentValue === 'string' ? 'string' : typeof normalized.example === 'string' ? 'string' : undefined) ||
    (typeof currentValue === 'number' ? 'number' : typeof normalized.example === 'number' ? 'number' : undefined) ||
    (typeof currentValue === 'boolean' ? 'boolean' : typeof normalized.example === 'boolean' ? 'boolean' : 'string')

  if (/^country(code)?$/.test(normalizedName) && (!enumValues.length || hasEnumValue(preset.countryCode))) {
    return preset.countryCode
  }
  if (normalizedName === 'sourceamount') return type === 'string' ? '20' : 20
  if (normalizedName === 'sourcecurrencycode' || normalizedName === 'sourcecurrency') {
    const description = normalized.description || ''
    if (/fiat/i.test(description)) return 'USD'
    return /crypto|digital asset/i.test(description) ? 'USDC' : 'USD'
  }
  if (
    [
      'paymentmethodtype',
      'serviceprovider',
      'serviceproviders',
      'includeswap',
      'customerid',
      'customerids',
      'externalcustomerid',
      'subdivision'
    ].includes(normalizedName)
  )
    return ''
  if (normalizedName.includes('currency')) {
    const isDestinationCurrency = normalizedName.includes('destination')
    const currencyValue = isDestinationCurrency ? preset.assetCode : preset.currencyCode
    if (!enumValues.length || hasEnumValue(currencyValue)) return currencyValue
    if (isDestinationCurrency) return ''
  }
  if (enumValues.length > 0) return enumValues[presetIndex % enumValues.length]
  if (type === 'boolean') return presetIndex % 2 === 1
  if (type === 'number' || type === 'integer') return presetNumber({ ...normalized, type }, name, presetIndex)
  if (type === 'array') {
    const count = Math.max(1, normalized.minItems || 0)
    const itemSchema = normalized.items || { type: 'string' }
    return Array.from({ length: count }, (_, index) =>
      presetSchemaValue(undefined, itemSchema, `${name} item ${index + 1}`, presetIndex, walletAddresses, emptyFields)
    )
  }

  const format = normalized.format?.toLowerCase()
  if (format === 'email') return presetString(name, normalized, presetIndex, `developer+${preset.id}@example.com`)
  if (format === 'uri' || format === 'url')
    return presetString(name, normalized, presetIndex, `https://${preset.id}.example.com/${name}`)
  if (format === 'uuid') return `00000000-0000-4000-8000-${String(presetIndex + 1).padStart(12, '0')}`
  if (format === 'date') return `2025-01-${String(presetIndex + 1).padStart(2, '0')}`
  if (format === 'time') return `09:${String(presetIndex * 10).padStart(2, '0')}:00`
  if (format === 'date-time' || format === 'datetime') {
    const day = Math.min(28, presetIndex + (/end/i.test(name) ? 2 : 1))
    return `2025-01-${String(day).padStart(2, '0')}T12:00:00.000Z`
  }
  if (/phone/i.test(name)) {
    const phone =
      preset.countryCode === 'GB'
        ? '+44-20-7946-0958'
        : preset.countryCode === 'JP'
          ? '+81-3-5550-0103'
          : preset.countryCode === 'PH'
            ? '+63-2-8555-0104'
            : '+1-202-555-0100'
    return presetString(name, normalized, presetIndex, phone)
  }
  if (normalizedName === 'firstname') return presetString(name, normalized, presetIndex, preset.firstName)
  if (normalizedName === 'lastname') return presetString(name, normalized, presetIndex, preset.lastName)
  if (normalizedName === 'name')
    return presetString(name, normalized, presetIndex, `${preset.firstName} ${preset.lastName}`)
  if (/name/i.test(name)) return presetString(name, normalized, presetIndex, `${preset.firstName} ${preset.lastName}`)
  return presetString(name, normalized, presetIndex)
}

function walletAssetCodeForField(parent: Record<string, unknown>, name: string, presetIndex: number): string {
  const normalizedName = name.toLowerCase()
  const currencyKeys = normalizedName.includes('source')
    ? ['sourceCurrencyCode', 'sourceCurrency', 'sourceAssetCode']
    : normalizedName.includes('destination')
      ? ['destinationCurrencyCode', 'destinationCurrency', 'destinationAssetCode']
      : [
          'destinationCurrencyCode',
          'destinationCurrency',
          'currencyCode',
          'sourceCurrencyCode',
          'sourceCurrency',
          'sourceAssetCode'
        ]
  for (const key of currencyKeys) {
    const value = parent[key]
    if (typeof value !== 'string') continue
    const asset = value.toUpperCase()
    if (WALLET_ADDRESS_ASSETS.includes(asset as (typeof WALLET_ADDRESS_ASSETS)[number])) return asset
  }
  return getRequestValuePreset(presetIndex).assetCode
}

function configuredWalletFieldValue(
  propertyName: string,
  propertySchema: OpenApiSchema,
  parent: Record<string, unknown>,
  walletAddresses: WalletAddressSettings,
  presetIndex: number
): unknown {
  if (normalizePresetSchema(propertySchema, presetIndex).type === 'array') {
    const addresses = getConfiguredWalletAddresses(walletAddresses)
    return addresses.length > 0 ? addresses : undefined
  }
  return (
    getWalletAddressForAsset(walletAddresses, walletAssetCodeForField(parent, propertyName, presetIndex)) || undefined
  )
}

function presetSchemaValue(
  currentValue: unknown,
  schema: OpenApiSchema,
  name: string,
  presetIndex: number,
  walletAddresses: WalletAddressSettings,
  emptyFields: readonly string[] = [],
  depth = 0
): unknown {
  if (depth > 8) return currentValue
  const normalized = normalizePresetSchema(schema, presetIndex)
  const properties = normalized.properties || {}
  if (normalized.type === 'object' || Object.keys(properties).length > 0) {
    const currentObject =
      currentValue && typeof currentValue === 'object' && !Array.isArray(currentValue)
        ? (currentValue as Record<string, unknown>)
        : {}
    const result = { ...currentObject }
    Object.entries(properties).forEach(([propertyName, propertySchema]) => {
      if (isEmptyField(propertyName, emptyFields)) {
        delete result[propertyName]
        return
      }
      const normalizedName = normalizeFieldName(propertyName)
      if (
        normalizedName === 'customerid' ||
        normalizedName === 'paymentmethodtype' ||
        normalizedName === 'serviceprovider' ||
        normalizedName === 'serviceproviders' ||
        normalizedName === 'includeswap'
      ) {
        delete result[propertyName]
        return
      }
      if (isWalletAddressFieldName(propertyName)) {
        const walletValue = configuredWalletFieldValue(
          propertyName,
          propertySchema,
          currentObject,
          walletAddresses,
          presetIndex
        )
        if (walletValue === undefined) delete result[propertyName]
        else result[propertyName] = walletValue
        return
      }
      const nextValue = presetSchemaValue(
        currentObject[propertyName],
        propertySchema,
        propertyName,
        presetIndex,
        walletAddresses,
        emptyFields,
        depth + 1
      )
      if (nextValue !== undefined) result[propertyName] = nextValue
    })
    return result
  }
  return presetLeafValue(currentValue, normalized, name, presetIndex, walletAddresses, emptyFields)
}

export function applyRequestBodyPreset(
  body: unknown,
  schema: OpenApiSchema,
  presetIndex: number,
  walletAddresses: WalletAddressSettings = createEmptyWalletAddressSettings(),
  emptyFields: readonly string[] = []
): unknown {
  return presetSchemaValue(body, schema, 'body', presetIndex, walletAddresses, emptyFields)
}

function schemaHasWalletAddresses(schema: OpenApiSchema, presetIndex: number, depth = 0): boolean {
  if (depth > 8) return false
  const normalized = normalizePresetSchema(schema, presetIndex)
  const hasWalletProperty = Object.entries(normalized.properties || {}).some(
    ([name, property]) => isWalletAddressFieldName(name) || schemaHasWalletAddresses(property, presetIndex, depth + 1)
  )
  return (
    hasWalletProperty ||
    (normalized.type === 'array' && normalized.items
      ? schemaHasWalletAddresses(normalized.items, presetIndex, depth + 1)
      : false)
  )
}

export function applyWalletAddressesToRequestBody(
  body: unknown,
  schema: OpenApiSchema,
  walletAddresses: WalletAddressSettings,
  presetIndex = 0,
  emptyFields: readonly string[] = [],
  depth = 0
): unknown {
  if (depth > 8) return body
  const normalized = normalizePresetSchema(schema, presetIndex)

  if (normalized.type === 'array' && Array.isArray(body) && normalized.items) {
    return body.map((item) =>
      applyWalletAddressesToRequestBody(item, normalized.items!, walletAddresses, presetIndex, emptyFields, depth + 1)
    )
  }

  const properties = normalized.properties || {}
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(properties).length === 0) return body

  const currentObject = body as Record<string, unknown>
  const result = { ...currentObject }
  Object.entries(properties).forEach(([propertyName, propertySchema]) => {
    if (isEmptyField(propertyName, emptyFields)) {
      delete result[propertyName]
      return
    }
    if (isWalletAddressFieldName(propertyName)) {
      const walletValue = configuredWalletFieldValue(
        propertyName,
        propertySchema,
        currentObject,
        walletAddresses,
        presetIndex
      )
      if (walletValue === undefined) delete result[propertyName]
      else result[propertyName] = walletValue
      return
    }

    const currentValue = currentObject[propertyName]
    if (
      currentValue !== undefined ||
      (getConfiguredWalletAddresses(walletAddresses).length > 0 &&
        schemaHasWalletAddresses(propertySchema, presetIndex))
    ) {
      const nextValue = applyWalletAddressesToRequestBody(
        currentValue ?? {},
        propertySchema,
        walletAddresses,
        presetIndex,
        emptyFields,
        depth + 1
      )
      if (nextValue !== undefined) result[propertyName] = nextValue
    }
  })
  return result
}

function getParameterExample(parameter: EndpointParameter): unknown {
  if (parameter.example !== undefined && parameter.example !== '') return parameter.example
  if (parameter.schema.example !== undefined && parameter.schema.example !== '') return parameter.schema.example
  if (parameter.schema.default !== undefined && parameter.schema.default !== '') return parameter.schema.default
  return parameter.schema.enum?.[0]
}

export function initialParameterValues(
  endpoint: EndpointConfig,
  countryCode: string,
  presetIndex = 0,
  walletAddresses: WalletAddressSettings = createEmptyWalletAddressSettings()
): Record<string, string> {
  const values: Record<string, string> = {}
  endpoint.parameters.forEach((parameter, index) => {
    if (parameter.name.toLowerCase() === 'meld-version' || parameter.name.toLowerCase() === 'authorization') return
    const normalizedName = normalizeFieldName(parameter.name)
    if (isEmptyField(parameter.name, endpoint.emptyFields)) {
      values[parameterFieldName(index)] = ''
      return
    }
    if (normalizedName === 'customerid' || normalizedName === 'subdivision') {
      values[parameterFieldName(index)] = ''
      return
    }
    if (isWalletAddressFieldName(parameter.name)) {
      const normalizedSchema = normalizePresetSchema(parameter.schema, presetIndex)
      values[parameterFieldName(index)] =
        normalizedSchema.type === 'array'
          ? getConfiguredWalletAddresses(walletAddresses).join(', ')
          : getWalletAddressForAsset(walletAddresses, getRequestValuePreset(presetIndex).assetCode)
      return
    }
    const example =
      parameter.name === 'countryCode' && !parameter.example
        ? countryCode || getParameterExample(parameter)
        : getParameterExample(parameter)
    const value = presetSchemaValue(
      example,
      parameter.schema,
      parameter.name,
      presetIndex,
      walletAddresses,
      endpoint.emptyFields
    )
    values[parameterFieldName(index)] = stringifyValue(value)
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

export function initialBodyText(
  endpoint: EndpointConfig,
  countryCode: string,
  presetIndex = 0,
  walletAddresses: WalletAddressSettings = createEmptyWalletAddressSettings()
): string {
  if (!endpoint.requestBody) return ''
  const example =
    endpoint.requestBody.example !== undefined
      ? endpoint.requestBody.example
      : exampleFromSchema(endpoint.requestBody.schema)
  const detectedCountryValue = applyDetectedCountry(example, endpoint.requestBody.schema, countryCode)
  const value = applyRequestBodyPreset(
    detectedCountryValue,
    endpoint.requestBody.schema,
    presetIndex,
    walletAddresses,
    endpoint.emptyFields
  )
  return JSON.stringify(value, null, 2)
}

export function parseRequestBody(
  bodyText: string,
  requestBody: EndpointConfig['requestBody']
): { body?: unknown; error?: string } {
  if (!requestBody) return {}
  if (!bodyText.trim()) {
    return requestBody.required ? { error: 'A JSON request body is required.' } : {}
  }
  try {
    return { body: JSON.parse(bodyText) }
  } catch {
    return { error: 'Request body must be valid JSON.' }
  }
}

function shouldRedactHeader(name: string): boolean {
  return /authorization|private|oauth/i.test(name)
}

export function buildRequestInfo(
  endpoint: EndpointConfig,
  values: EndpointFormValues,
  apiKey: string,
  apiKeyAvailable: boolean
): RequestInfo {
  const pathParams: Record<string, string> = {}
  const queryParams: RequestParams = {}
  const wireHeaders: Record<string, string> = {}
  let url = `${values.environment === 'sandbox' ? 'https://api-sb.meld.io' : 'https://api.meld.io'}${endpoint.path}`

  endpoint.parameters.forEach((parameter, index) => {
    const value = values.paramValues[parameterFieldName(index)] || ''
    const normalizedLocation = parameter.in.toLowerCase()
    if (normalizedLocation === 'path') {
      if (value) pathParams[parameter.name] = value
    } else if (normalizedLocation === 'query') {
      if (value) {
        const isArray = parameter.schema.type === 'array'
        const arrayValues = isArray
          ? value
              .split(',')
              .map((part) => part.trim())
              .filter(Boolean)
          : []
        if (!isArray) {
          queryParams[parameter.name] = value
        } else {
          const delimiter = parameter.style === 'spaceDelimited' ? ' ' : parameter.style === 'pipeDelimited' ? '|' : ','
          const explode = parameter.explode ?? (parameter.style ?? 'form') === 'form'
          queryParams[parameter.name] = explode ? arrayValues : arrayValues.join(delimiter)
        }
      }
    } else if (
      normalizedLocation === 'header' &&
      parameter.name.toLowerCase() !== 'meld-version' &&
      parameter.name.toLowerCase() !== 'authorization'
    ) {
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

  const { body, error: bodyError } = parseRequestBody(values.bodyText, endpoint.requestBody)
  const headers: Record<string, string> = {
    Authorization: apiKey.trim()
      ? 'BASIC [OVERRIDE REDACTED]'
      : apiKeyAvailable
        ? 'BASIC [SERVER KEY]'
        : 'BASIC [NOT CONFIGURED]',
    Accept: 'application/json',
    'Meld-Version': MELD_API_VERSION
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
    bodyError
  }
}
