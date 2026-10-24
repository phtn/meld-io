import catalog from './catalog.generated.json'

export const MELD_API_VERSION = catalog.version

export type MeldMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type MeldEnvironment = 'sandbox' | 'production'

export interface OpenApiSchema {
  title?: string
  type?: string
  format?: string
  description?: string
  example?: unknown
  examples?: unknown[]
  default?: unknown
  enum?: unknown[]
  required?: string[]
  properties?: Record<string, OpenApiSchema>
  items?: OpenApiSchema
  additionalProperties?: boolean | OpenApiSchema
  oneOf?: OpenApiSchema[]
  anyOf?: OpenApiSchema[]
  allOf?: OpenApiSchema[]
  nullable?: boolean
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  minItems?: number
  maxItems?: number
}

export interface EndpointParameter {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie'
  required: boolean
  description?: string
  schema: OpenApiSchema
  example?: unknown
  style?: string
  explode?: boolean
}

export interface EndpointRequestBody {
  required: boolean
  description?: string
  contentType?: string
  schema: OpenApiSchema
  example?: unknown
}

export interface EndpointConfig {
  id: string
  operationId?: string
  name: string
  description: string
  emptyFields: string[]
  defaultFieldValues: Record<string, unknown>
  responseWithURL?: string
  method: MeldMethod
  path: string
  deprecated: boolean
  parameters: EndpointParameter[]
  requestBody?: EndpointRequestBody
  categoryId: string
  category: string
  categoryDeprecated: boolean
  categoryNotice?: string
}

interface GeneratedEndpoint extends Omit<
  EndpointConfig,
  'categoryId' | 'category' | 'categoryDeprecated' | 'categoryNotice' | 'emptyFields' | 'defaultFieldValues'
> {}

type GeneratedCategory = Omit<EndpointCategory, 'endpoints'> & {
  endpoints: GeneratedEndpoint[]
}

export interface EndpointCategory {
  id: string
  name: string
  deprecated: boolean
  notice?: string
  endpoints: Array<GeneratedEndpoint & Pick<EndpointConfig, 'emptyFields' | 'defaultFieldValues'>>
}

/**
 * Add endpoint-specific normalized field names here. Keys are endpoint IDs;
 * omitted endpoints default to an empty list.
 */
const emptyFieldsByEndpointId: Record<string, string[]> = {
  'crypto-post-payments-crypto-quote': [
    'includeswap',
    'externalcustomerid',
    'paymentmethodtype',
    'serviceproviders',
    'subdivision'
  ],
  'crypto-post-crypto-session-widget': [
    'bypasskyc',
    'externalsessionid',
    'externalsubaccountcustomerid',
    'clientipaddress',
    'lockfields',
    'redirecturl',
    'wallettag',
    'institutionid',
    'subaccountcustomerid'
  ],
  'crypto-get-payments-transactions-by-id': [],
  'crypto-get-payments-transactions': [
    'statuses',
    'serviceproviders',
    'limit',
    'amountfrom',
    'amountto',
    'from',
    'to',
    'before',
    'after',
    'apiaccessprofileids',
    'customerids',
    'externalcustomerids',
    'sessionids',
    'externalsessionids',
    'externalreferenceids',
    'types',
    'orderids',
    'serviceprovidertransactionid',
    'subaccountcustomerids',
    'externalsubaccountcustomerids'
  ],
  'crypto-get-payments-transactions-sessions-by-sessionid': [],
  'crypto-post-crypto-order-headless-offramp': ['externalsubaccountcustomerid', 'subaccountcustomerid'],
  'crypto-post-crypto-order-headless-onramp': [
    'clientipaddress',
    'customerphonenumber',
    'subaccountcustomerid',
    'externalsubaccountcustomerid',
    'redirecturl'
  ],
  'crypto-post-payments-virtual-account-deposit-instructions': [],
  'crypto-get-crypto-onramp-by-serviceprovider-requirements': [],
  'network-partners-get-network-partner-supported-countries': [],
  'network-partners-get-network-partner-supported-currencies': [],
  'network-partners-get-network-partner-supported-fiat-limits': [],
  'network-partners-get-network-partner-supported-kyc-limits': [],
  'network-partners-get-network-partner-supported-partners': [],
  'network-partners-get-network-partner-supported-payment-methods': [],
  'network-partners-get-network-partner-supported-payment-methods-requirements': [],
  'network-partners-get-network-partner-supported-routes-by-category-by-countrycode-by-sourcecurrencycode-by-destinationcurrencycode':
    [],
  'network-partners-get-network-partner-defaults': [],
  'network-partners-get-network-partner-defaults-limits': [],
  'network-partners-get-network-partner-defaults-limits-by-currency': [],
  'network-partners-get-network-partner-defaults-by-country-by-category': [],
  'bank-linking-post-bank-linking-connect-start': [],
  'bank-linking-post-bank-linking-connect-repair': [],
  'bank-linking-get-bank-linking-connections-by-connectionid': [],
  'bank-linking-delete-bank-linking-connections-by-connectionid': [],
  'bank-linking-get-bank-linking-connections': [],
  'bank-linking-post-bank-linking-connections-by-connectionid-update': [],
  'bank-linking-post-bank-linking-connections-by-connectionid-refresh': [],
  'bank-linking-post-bank-linking-connections-import': [],
  'bank-linking-get-bank-linking-accounts-by-financialaccountid': [],
  'bank-linking-get-bank-linking-accounts': [],
  'bank-linking-post-bank-linking-accounts-by-financialaccountid-processors-create-token': [],
  'bank-linking-get-bank-linking-transactions-by-transactionid': [],
  'bank-linking-get-bank-linking-transactions': [],
  'bank-linking-get-bank-linking-investments-holdings-by-investmentholdingid': [],
  'bank-linking-get-bank-linking-investments-holdings': [],
  'bank-linking-get-bank-linking-investments-transactions-by-investmenttransactionid': [],
  'bank-linking-get-bank-linking-investments-transactions': [],
  'bank-linking-get-institutions-by-institutionid': [],
  'bank-linking-get-institutions': [],
  'payments-post-payments-tokens': [],
  'payments-post-payments-transactions': [],
  'payments-get-payments-transactions': [],
  'payments-post-payments-transactions-by-id-capture': [],
  'payments-get-payments-transactions-by-id': [],
  'payments-post-payments-transactions-by-id-refund': [],
  'payments-post-payments-transactions-payout': [],
  'payments-post-payments-external-import': [],
  'payments-post-payments-external-refund': [],
  'payments-post-payments-risk-analysis': [],
  'customer-post-accounts-customers': [],
  'customer-get-accounts-customers': [
    'customerids',
    'externalcustomerid',
    'email',
    'phone',
    'before',
    'after',
    'limit',
    'type'
  ],
  'customer-patch-accounts-customers-by-customerid': [],
  'customer-delete-accounts-customers-by-customerid': [],
  'customer-post-accounts-customers-by-customerid-addresses': [],
  'customer-post-accounts-customers-by-customerid-kyc-initiate': [],
  'customer-patch-accounts-customers-by-customerid-kyc-initiate': [],
  'customer-post-accounts-customers-by-customerid-verifications': [],
  'customer-get-accounts-customers-by-customerid-verifications': [],
  'customer-post-accounts-customers-by-customerid-verifications-by-verificationid-confirm': [],
  'service-providers-get-service-providers': [],
  'service-providers-get-service-providers-properties-countries': [],
  'service-providers-get-service-providers-properties-crypto-currencies': [],
  'service-providers-get-service-providers-properties-defaults-by-country': [],
  'service-providers-get-service-providers-properties-fiat-currencies': [],
  'service-providers-get-service-providers-properties-payment-methods': [],
  'service-providers-get-service-providers-limits-crypto-currency-sells': [],
  'service-providers-get-service-providers-limits-fiat-currency-purchases': [],
  'service-providers-get-service-providers-limits-kyc-fiat-levels': [],
  'webhooks-post-notifications-webhooks': [],
  'webhooks-get-notifications-webhooks': ['before', 'after', 'limit'],
  'webhooks-get-notifications-webhooks-event-types': [],
  'webhooks-get-notifications-webhooks-by-webhookprofileid': [],
  'webhooks-patch-notifications-webhooks-by-webhookprofileid': [],
  'webhooks-post-notifications-webhooks-by-webhookprofileid-test': [],
  'beta-get-activity-log': [
    'actions',
    'requestid',
    'connectionids',
    'financialaccountids',
    'eventtype',
    'before',
    'after',
    'limit'
  ],
  'beta-get-activity-log-details': []
}

/** Development-only request defaults. Field names are matched case-insensitively. */
const defaultFieldValuesByEndpointId: Record<string, Record<string, unknown>> = process.env.NODE_ENV === 'development'
  ? {
      'crypto-post-payments-crypto-quote': { customerId: 'WmZXuiLVHUcv1rrgALNia4', sourceAmount: 100 },
      'crypto-post-crypto-session-widget': {
        customerId: 'WmZXuiLVHUcv1rrgALNia4',
        serviceProvider: 'TRANSAK',
        sourceAmount: 100
      },
      'crypto-get-payments-transactions-by-id': {},
      'crypto-get-payments-transactions': {},
      'crypto-get-payments-transactions-sessions-by-sessionid': {},
      'crypto-post-crypto-order-headless-offramp': { bankName: 'GoTyme' },
      'crypto-post-crypto-order-headless-onramp': {},
      'crypto-post-payments-virtual-account-deposit-instructions': {},
      'crypto-get-crypto-onramp-by-serviceprovider-requirements': {},
      'network-partners-get-network-partner-supported-countries': {},
      'network-partners-get-network-partner-supported-currencies': {},
      'network-partners-get-network-partner-supported-fiat-limits': {},
      'network-partners-get-network-partner-supported-kyc-limits': {},
      'network-partners-get-network-partner-supported-partners': {},
      'network-partners-get-network-partner-supported-payment-methods': {},
      'network-partners-get-network-partner-supported-payment-methods-requirements': {},
      'network-partners-get-network-partner-supported-routes-by-category-by-countrycode-by-sourcecurrencycode-by-destinationcurrencycode':
        {},
      'network-partners-get-network-partner-defaults': {},
      'network-partners-get-network-partner-defaults-limits': {},
      'network-partners-get-network-partner-defaults-limits-by-currency': {},
      'network-partners-get-network-partner-defaults-by-country-by-category': {},
      'bank-linking-post-bank-linking-connect-start': {},
      'bank-linking-post-bank-linking-connect-repair': {},
      'bank-linking-get-bank-linking-connections-by-connectionid': {},
      'bank-linking-delete-bank-linking-connections-by-connectionid': {},
      'bank-linking-get-bank-linking-connections': {},
      'bank-linking-post-bank-linking-connections-by-connectionid-update': {},
      'bank-linking-post-bank-linking-connections-by-connectionid-refresh': {},
      'bank-linking-post-bank-linking-connections-import': {},
      'bank-linking-get-bank-linking-accounts-by-financialaccountid': {},
      'bank-linking-get-bank-linking-accounts': {},
      'bank-linking-post-bank-linking-accounts-by-financialaccountid-processors-create-token': {},
      'bank-linking-get-bank-linking-transactions-by-transactionid': {},
      'bank-linking-get-bank-linking-transactions': {},
      'bank-linking-get-bank-linking-investments-holdings-by-investmentholdingid': {},
      'bank-linking-get-bank-linking-investments-holdings': {},
      'bank-linking-get-bank-linking-investments-transactions-by-investmenttransactionid': {},
      'bank-linking-get-bank-linking-investments-transactions': {},
      'bank-linking-get-institutions-by-institutionid': {},
      'bank-linking-get-institutions': {},
      'payments-post-payments-tokens': {},
      'payments-post-payments-transactions': {},
      'payments-get-payments-transactions': {},
      'payments-post-payments-transactions-by-id-capture': {},
      'payments-get-payments-transactions-by-id': {},
      'payments-post-payments-transactions-by-id-refund': {},
      'payments-post-payments-transactions-payout': {},
      'payments-post-payments-external-import': {},
      'payments-post-payments-external-refund': {},
      'payments-post-payments-risk-analysis': {},
      'customer-post-accounts-customers': {},
      'customer-get-accounts-customers': {},
      'customer-patch-accounts-customers-by-customerid': {},
      'customer-delete-accounts-customers-by-customerid': {},
      'customer-post-accounts-customers-by-customerid-addresses': {},
      'customer-post-accounts-customers-by-customerid-kyc-initiate': {},
      'customer-patch-accounts-customers-by-customerid-kyc-initiate': {},
      'customer-post-accounts-customers-by-customerid-verifications': {},
      'customer-get-accounts-customers-by-customerid-verifications': {},
      'customer-post-accounts-customers-by-customerid-verifications-by-verificationid-confirm': {},
      'service-providers-get-service-providers': {},
      'service-providers-get-service-providers-properties-countries': {},
      'service-providers-get-service-providers-properties-crypto-currencies': {},
      'service-providers-get-service-providers-properties-defaults-by-country': {},
      'service-providers-get-service-providers-properties-fiat-currencies': {},
      'service-providers-get-service-providers-properties-payment-methods': {},
      'service-providers-get-service-providers-limits-crypto-currency-sells': {},
      'service-providers-get-service-providers-limits-fiat-currency-purchases': {},
      'service-providers-get-service-providers-limits-kyc-fiat-levels': {},
      'webhooks-post-notifications-webhooks': {},
      'webhooks-get-notifications-webhooks': {},
      'webhooks-get-notifications-webhooks-event-types': {},
      'webhooks-get-notifications-webhooks-by-webhookprofileid': {},
      'webhooks-patch-notifications-webhooks-by-webhookprofileid': {},
      'webhooks-post-notifications-webhooks-by-webhookprofileid-test': {},
      'beta-get-activity-log': {},
      'beta-get-activity-log-details': {}
    }
  : {}

const generatedCategories = catalog.categories as GeneratedCategory[]
export const endpointCategories: EndpointCategory[] = generatedCategories.map((category) => ({
  ...category,
  endpoints: category.endpoints.map((endpoint) => ({
    ...endpoint,
    emptyFields: emptyFieldsByEndpointId[endpoint.id] ?? [],
    defaultFieldValues: defaultFieldValuesByEndpointId[endpoint.id] ?? {}
  }))
}))

export const meldEndpoints: EndpointConfig[] = endpointCategories.flatMap((category) =>
  category.endpoints.map((endpoint) => ({
    ...endpoint,
    categoryId: category.id,
    category: category.name,
    categoryDeprecated: category.deprecated,
    categoryNotice: category.notice
  }))
)

export function getEndpointById(id: string): EndpointConfig | undefined {
  return meldEndpoints.find((endpoint) => endpoint.id === id)
}
