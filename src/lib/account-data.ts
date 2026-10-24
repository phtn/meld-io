import type { ApiResponse } from '@/types'
import { Key } from 'octane'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function getApiError(response: ApiResponse | null): string | null {
  if (!response || response.success) return null
  if (response.error) return response.error
  if (isRecord(response.data)) {
    if (typeof response.data.error === 'string') return response.data.error
    if (typeof response.data.message === 'string') return response.data.message
  }
  return 'Meld API request failed.'
}

export function getAccountRecords(
  data: unknown,
  collectionNames: readonly string[],
  depth = 0
): Record<string, unknown>[] {
  if (depth > 6) return []
  if (typeof data === 'string') {
    try {
      return getAccountRecords(JSON.parse(data), collectionNames, depth + 1)
    } catch {
      return []
    }
  }
  if (Array.isArray(data)) return data.filter(isRecord)
  if (!isRecord(data)) return []

  for (const name of collectionNames) {
    const key = Object.keys(data).find((candidate) => candidate.toLowerCase() === name.toLowerCase())
    if (!key) continue
    const collection = data[key]
    if (Array.isArray(collection)) return collection.filter(isRecord)
    if (isRecord(collection)) {
      const nestedRecords = getAccountRecords(collection, collectionNames, depth + 1)
      if (nestedRecords.length > 0) return nestedRecords
      if (name.toLowerCase() === 'transaction') return [collection]
    }
  }

  for (const name of ['data', 'result', 'response']) {
    const key = Object.keys(data).find((candidate) => candidate.toLowerCase() === name) as unknown as Key[]
    const nested = key ? data[key as any] : undefined
    if (nested && nested !== data) {
      const records = getAccountRecords(nested, collectionNames, depth + 1)
      if (records.length > 0) return records
    }
  }

  for (const [key, nested] of Object.entries(data)) {
    if ([...collectionNames, 'data', 'result', 'response'].some((name) => name.toLowerCase() === key.toLowerCase()))
      continue
    if (Array.isArray(nested)) {
      const records = nested.filter(isRecord)
      if (records.length > 0) return records
      continue
    }
    if (!isRecord(nested)) continue
    const records = getAccountRecords(nested, collectionNames, depth + 1)
    if (records.length > 0) return records
  }
  return []
}

export function getAccountText(record: Record<string, unknown>, names: readonly string[]): string {
  for (const name of names) {
    const value = record[name]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  }
  return '—'
}

export function formatAccountDate(value: string): string {
  if (value === '—') return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
