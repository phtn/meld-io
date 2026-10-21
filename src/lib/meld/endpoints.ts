import catalog from "./catalog.generated.json";

export const MELD_API_VERSION = catalog.version;

export type MeldMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type MeldEnvironment = "sandbox" | "production";

export interface OpenApiSchema {
  title?: string;
  type?: string;
  format?: string;
  description?: string;
  example?: unknown;
  examples?: unknown[];
  default?: unknown;
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
  additionalProperties?: boolean | OpenApiSchema;
  oneOf?: OpenApiSchema[];
  anyOf?: OpenApiSchema[];
  allOf?: OpenApiSchema[];
  nullable?: boolean;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
}

export interface EndpointParameter {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required: boolean;
  description?: string;
  schema: OpenApiSchema;
  example?: unknown;
  style?: string;
  explode?: boolean;
}

export interface EndpointRequestBody {
  required: boolean;
  description?: string;
  contentType?: string;
  schema: OpenApiSchema;
  example?: unknown;
}

export interface EndpointConfig {
  id: string;
  operationId?: string;
  name: string;
  description: string;
  method: MeldMethod;
  path: string;
  deprecated: boolean;
  parameters: EndpointParameter[];
  requestBody?: EndpointRequestBody;
  categoryId: string;
  category: string;
  categoryDeprecated: boolean;
  categoryNotice?: string;
}

interface GeneratedEndpoint extends Omit<EndpointConfig, "categoryId" | "category" | "categoryDeprecated" | "categoryNotice"> {}

export interface EndpointCategory {
  id: string;
  name: string;
  deprecated: boolean;
  notice?: string;
  endpoints: GeneratedEndpoint[];
}

const categories = catalog.categories as EndpointCategory[];
export const endpointCategories = categories;

export const meldEndpoints: EndpointConfig[] = categories.flatMap((category) =>
  category.endpoints.map((endpoint) => ({
    ...endpoint,
    categoryId: category.id,
    category: category.name,
    categoryDeprecated: category.deprecated,
    categoryNotice: category.notice,
  })),
);

export function getEndpointById(id: string): EndpointConfig | undefined {
  return meldEndpoints.find((endpoint) => endpoint.id === id);
}
