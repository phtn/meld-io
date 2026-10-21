export interface EndpointParam {
  name: string
  type: string
  required: boolean
  description?: string
  examples: string[]
}

// Body Schema Interfaces for each endpoint
export interface QuoteBodySchema {
  countryCode: string
  sourceCurrencyCode: string
  destinationCurrencyCode: string
  paymentMethodType: string
  sourceAmount?: number
}

export interface CreateWidgetSessionBodySchema {
  sessionType: string
  sessionData: {
    countryCode: string
    destinationCurrencyCode: string
    serviceProvider: string
    sourceAmount: string
    sourceCurrencyCode: string
    walletAddress: string
    externalCustomerId?: string
    externalSessionId?: string
  }
}

export interface SessionQuoteBodySchema {
  sessionId: string
  sourceAmount?: number
  destinationAmount?: number
}

export interface WebhookBodySchema {
  url: string
  events: string[]
}

// Union type for all body schemas
export type EndpointBodySchema =
  QuoteBodySchema | CreateWidgetSessionBodySchema | SessionQuoteBodySchema | WebhookBodySchema

// Base endpoint config without bodySchema
interface BaseEndpointConfig {
  id: string
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
  params?: EndpointParam[]
  responseWithURL?: string
}

// Specific endpoint configs with typed bodySchema
interface QuoteEndpointConfig extends BaseEndpointConfig {
  id: 'quote'
  bodySchema: QuoteBodySchema
}

interface CreateWidgetSessionEndpointConfig extends BaseEndpointConfig {
  id: 'createWidgetSession'
  bodySchema: CreateWidgetSessionBodySchema
}

interface SessionQuoteEndpointConfig extends BaseEndpointConfig {
  id: 'session-quote'
  bodySchema: SessionQuoteBodySchema
}

interface WebhookEndpointConfig extends BaseEndpointConfig {
  id: 'webhook'
  bodySchema: WebhookBodySchema
}

// Endpoints without bodySchema
interface CreateSubAccountEndpointConfig extends BaseEndpointConfig {
  id: 'createSubAccount'
}

interface ConfigEndpointConfig extends BaseEndpointConfig {
  id: 'config'
}

interface SessionStatusEndpointConfig extends BaseEndpointConfig {
  id: 'session-status'
}

interface TransactionsEndpointConfig extends BaseEndpointConfig {
  id: 'transactions'
}

interface TransactionEndpointConfig extends BaseEndpointConfig {
  id: 'transaction'
}

interface WebhooksEndpointConfig extends BaseEndpointConfig {
  id: 'webhooks'
}

// Union type for all endpoint configs
export type EndpointConfig =
  | QuoteEndpointConfig
  | CreateWidgetSessionEndpointConfig
  | SessionQuoteEndpointConfig
  | WebhookEndpointConfig
  | CreateSubAccountEndpointConfig
  | ConfigEndpointConfig
  | SessionStatusEndpointConfig
  | TransactionsEndpointConfig
  | TransactionEndpointConfig
  | WebhooksEndpointConfig

// Type helper to extract body schema type from endpoint config
export type EndpointBodySchemaType<T extends EndpointConfig> = T extends { bodySchema: infer B } ? B : never

// Type helper to get body schema keys
export type BodySchemaKeys<T extends EndpointConfig> = T extends { bodySchema: infer B }
  ? B extends Record<string, unknown>
    ? keyof B
    : never
  : never

// Type guard to check if endpoint has bodySchema
export function hasBodySchema(
  endpoint: EndpointConfig
): endpoint is EndpointConfig & { bodySchema: EndpointBodySchema } {
  return 'bodySchema' in endpoint && endpoint.bodySchema !== undefined
}

export const meldEndpoints: EndpointConfig[] = [
  {
    id: 'createSubAccount',
    name: 'Create Sub Account',
    method: 'GET',
    path: '/accounts/sub-accounts',
    description: 'Create a new sub account',
    params: [
      {
        name: 'name',
        type: 'string',
        required: true,
        description: 'Name of the sub account',
        examples: ['John Doe', 'Jane Smith']
      },
      {
        name: 'serviceProvider',
        type: 'string',
        required: true,
        description: 'Service provider of the sub account',
        examples: ['BRALE', 'NOAH']
      },
      {
        name: 'serviceProviderSubAccountId',
        type: 'string',
        required: true,
        description: 'The subaccount ID provided from the service provider.',
        examples: ['', '']
      }
    ]
  },
  {
    id: 'config',
    name: 'Get Config',
    method: 'GET',
    path: '/v1/config',
    description: 'Retrieve configuration information from the Meld API',
    params: []
  },
  {
    id: 'quote',
    name: 'Buy Crypto Quote',
    method: 'POST',
    path: '/payments/crypto/quote',
    description: 'Get a quote for buying cryptocurrency',
    params: [
      {
        name: 'countryCode',
        type: 'string',
        required: true,
        description: 'Country code (auto-detected)',
        examples: ['US', 'GB', 'CA', 'AU', 'PH']
      },
      {
        name: 'sourceCurrencyCode',
        type: 'string',
        required: true,
        description: 'Currency code (e.g., USD, EUR)',
        examples: ['USD', 'EUR', 'JPY', 'PHP']
      },
      {
        name: 'destinationCurrencyCode',
        type: 'string',
        required: true,
        description: 'Destination cryptocurrency code',
        examples: ['USDC', 'ETH', 'BTC', 'USDT']
      },
      {
        name: 'sourceAmount',
        type: 'number',
        required: false,
        description: 'Source amount to convert',
        examples: ['100', '500', '1000', '2500']
      },
      {
        name: 'paymentMethodType',
        type: 'string',
        required: true,
        description: 'Payment method type (e.g., CREDIT_DEBIT_CARD)',
        examples: ['CREDIT_DEBIT_CARD']
      }
    ],
    bodySchema: {
      countryCode: '',
      sourceCurrencyCode: '',
      destinationCurrencyCode: '',
      paymentMethodType: '',
      sourceAmount: undefined
    } satisfies QuoteBodySchema
  },
  {
    id: 'createWidgetSession',
    name: 'Create Widget Session',
    method: 'POST',
    path: '/crypto/session/widget',
    description: 'Create a new session for a transaction',
    params: [
      {
        name: 'sessionType',
        required: true,
        description: 'Session type',
        type: 'string',
        examples: ['BUY', 'SELL', 'TRANSFER']
      },
      {
        name: 'countryCode',
        type: 'string',
        required: true,
        description: 'Country code (auto-detected)',
        examples: ['US', 'GB', 'CA', 'AU', 'PH']
      },
      {
        name: 'sourceCurrencyCode',
        type: 'string',
        required: true,
        description: 'Currency code (e.g., USD, EUR)',
        examples: ['USD', 'EUR', 'JPY', 'PHP']
      },
      {
        name: 'destinationCurrencyCode',
        type: 'string',
        required: true,
        description: 'Destination cryptocurrency code',
        examples: ['USDC', 'ETH', 'BTC', 'USDT']
      },
      {
        name: 'sourceAmount',
        type: 'number',
        required: true,
        description: 'Source amount to convert',
        examples: ['100', '500', '1000', '2500']
      },
      {
        name: 'paymentMethodType',
        type: 'string',
        required: true,
        description: 'Payment method type (e.g., CREDIT_DEBIT_CARD)',
        examples: ['CREDIT_DEBIT_CARD']
      },
      {
        name: 'serviceProvider',
        type: 'string',
        required: true,
        description: 'Service provider name',
        examples: ['TRANSAK', 'KRYPTONIM', 'SWAPPED']
      },
      {
        name: 'walletAddress',
        type: 'string',
        required: true,
        description: 'Destination wallet address',
        examples: [String(process.env.NEXT_PUBLIC_BITCOIN_ADDRESS)]
      },
      {
        name: 'externalCustomerId',
        type: 'string',
        required: false,
        description: 'Customer ID',
        examples: ['testCustomer', 'T02', 'T03']
      },
      {
        name: 'externalSessionId',
        type: 'string',
        required: false,
        description: 'Session ID',
        examples: ['testSession', 'S02', 'S03']
      }
    ],
    responseWithURL: 'widgetUrl',
    bodySchema: {
      sessionType: '',
      sessionData: {
        countryCode: '',
        destinationCurrencyCode: '',
        serviceProvider: '',
        sourceAmount: '',
        sourceCurrencyCode: '',
        walletAddress: '',
        externalCustomerId: undefined,
        externalSessionId: undefined
      }
    } satisfies CreateWidgetSessionBodySchema
  },
  {
    id: 'session-quote',
    name: 'Get Session Quote',
    method: 'POST',
    path: '/v1/session/quote',
    description: 'Get a quote for a specific session',
    params: [
      {
        name: 'sessionId',
        type: 'string',
        required: true,
        description: 'Session identifier',
        examples: ['session-001', 'sess-12345', 'session-abc', 'sess-xyz', 'session-999']
      },
      {
        name: 'sourceAmount',
        type: 'number',
        required: false,
        description: 'Source amount',
        examples: ['100', '500', '1000', '2500', '5000']
      },
      {
        name: 'destinationAmount',
        type: 'number',
        required: false,
        description: 'Destination amount',
        examples: ['100', '500', '1000', '2500', '5000']
      }
    ],
    bodySchema: {
      sessionId: '',
      sourceAmount: undefined,
      destinationAmount: undefined
    } satisfies SessionQuoteBodySchema
  },
  {
    id: 'session-status',
    name: 'Get Session Status',
    method: 'GET',
    path: '/v1/session/{sessionId}',
    description: 'Get the status of a specific session',
    params: [
      {
        name: 'sessionId',
        type: 'string',
        required: true,
        description: 'Session identifier',
        examples: ['session-001', 'sess-12345', 'session-abc', 'sess-xyz', 'session-999']
      }
    ]
  },
  {
    id: 'transactions',
    name: 'List Transactions',
    method: 'GET',
    path: '/payments/transactions',
    description: 'List all transactions',
    params: [
      {
        name: 'limit',
        type: 'number',
        required: false,
        description: 'Number of results to return',
        examples: ['10', '25', '50', '100', '200']
      },
      {
        name: 'offset',
        type: 'number',
        required: false,
        description: 'Number of results to skip',
        examples: ['0', '10', '25', '50', '100']
      },
      {
        name: 'status',
        type: 'string',
        required: false,
        description: 'Filter by transaction status',
        examples: ['pending', 'completed', 'failed', 'cancelled', 'processing']
      }
    ]
  },
  {
    id: 'transaction',
    name: 'Get Transaction',
    method: 'GET',
    path: '/payments/transactions/{id}',
    description: 'Get details of a specific transaction',
    params: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: 'Transaction identifier',
        examples: ['txn-001']
      }
    ]
  },
  {
    id: 'webhooks',
    name: 'List Webhooks',
    method: 'GET',
    path: '/v1/webhooks',
    description: 'List all configured webhooks',
    params: []
  },
  {
    id: 'webhook',
    name: 'Create Webhook',
    method: 'POST',
    path: '/v1/webhooks',
    description: 'Create a new webhook',
    params: [
      {
        name: 'url',
        type: 'string',
        required: true,
        description: 'Webhook URL',
        examples: [
          'https://example.com/webhook',
          'https://api.example.com/meld/webhook',
          'https://webhook.site/unique-id',
          'https://myapp.com/api/meld/callback',
          'https://localhost:3000/api/webhooks/meld'
        ]
      },
      {
        name: 'events',
        type: 'array',
        required: true,
        description: 'Events to subscribe to',
        examples: [
          'transaction.completed',
          'transaction.failed',
          'session.created',
          'quote.updated',
          'payment.received'
        ]
      }
    ],
    bodySchema: {
      url: '',
      events: []
    } satisfies WebhookBodySchema
  }
]

export function getEndpointById(id: string): EndpointConfig | undefined {
  return meldEndpoints.find((endpoint) => endpoint.id === id)
}
