export interface SearchPaymentTransaction {
  id: string
  createdAt: string
  serviceProvider: string
  sessionId: string
  status: string
  transactionType: string
  updatedAt: string
  sourceAmount?: number | string | null
  sourceCurrencyCode?: string | null
  destinationAmount?: number | string | null
  destinationCurrencyCode?: string | null
  [key: string]: unknown
}

export interface SearchPaymentTransactionResponseData {
  transactions?: SearchPaymentTransaction[]
  count?: number
  remaining?: number
  totalCount?: number
}

export interface ActivityLogsResponseData {
  action: string
  actor: {
    id: string | null
    name: string
    type: string
  }
  attributes: {
    accountId: string
    requestId: string
    serviceProviders: string[]
  }
  details: string | null
  entity: {
    id: string
    type: string
  }
  key: string
  occurredAt: string
}
