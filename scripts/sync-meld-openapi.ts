import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const apiVersion = "2026-02-03";
const specs = [
  { id: "crypto", name: "Crypto", file: "crypto", deprecated: false },
  { id: "network-partners", name: "Network Partners", file: "networkpartner", deprecated: false },
  { id: "bank-linking", name: "Bank Linking", file: "banklinking", deprecated: false },
  { id: "payments", name: "Payments", file: "payments", deprecated: false },
  { id: "customer", name: "Customer", file: "customer", deprecated: false },
  { id: "service-providers", name: "Service Providers", file: "serviceproviders", deprecated: true },
  { id: "webhooks", name: "Webhooks", file: "webhooks", deprecated: false },
  { id: "beta", name: "Beta", file: "beta", deprecated: false },
] as const;

const schemaKeys = [
  "title", "type", "format", "description", "example", "examples", "default", "enum", "required",
  "properties", "items", "additionalProperties", "oneOf", "anyOf", "allOf", "nullable", "minimum",
  "maximum", "exclusiveMinimum", "exclusiveMaximum", "minLength", "maxLength", "pattern", "minItems",
  "maxItems", "uniqueItems", "readOnly", "writeOnly",
];

function resolveReference<T>(value: T, spec: Record<string, any>): T | Record<string, any> {
  if (!value || typeof value !== "object" || !("$ref" in value)) return value;
  const reference = (value as { $ref: string }).$ref;
  if (!reference.startsWith("#/")) return value;
  const resolved = reference.slice(2).split("/").reduce((current, part) => {
    const key = part.replaceAll("~1", "/").replaceAll("~0", "~");
    return current?.[key];
  }, spec as any);
  if (!resolved || typeof resolved !== "object") return value;
  const overrides = Object.fromEntries(Object.entries(value).filter(([key]) => key !== "$ref"));
  return { ...resolved, ...overrides };
}

function normalizeSchema(
  value: unknown,
  spec: Record<string, any>,
  references = new Set<string>(),
  depth = 0,
): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((entry) => normalizeSchema(entry, spec, references, depth + 1));
  const record = value as Record<string, any>;
  if (typeof record.$ref === "string") {
    if (references.has(record.$ref) || depth > 10) {
      return { type: "object", description: record.description || "Recursive schema reference" };
    }
    const ref = record.$ref;
    const resolved = resolveReference(record, spec) as Record<string, any>;
    return normalizeSchema(resolved, spec, new Set([...references, ref]), depth + 1);
  }
  const normalized = Object.fromEntries(
    schemaKeys
      .filter((key) => key !== "properties")
      .filter((key) => key in record)
      .map((key) => [key, normalizeSchema(record[key], spec, references, depth + 1)]),
  );
  if (record.properties && typeof record.properties === "object") {
    normalized.properties = Object.fromEntries(
      Object.entries(record.properties).map(([name, property]) => [name, normalizeSchema(property, spec, references, depth + 1)]),
    );
  }
  return normalized;
}

function firstExample(examples: Record<string, any> | undefined): unknown {
  if (!examples) return undefined;
  return Object.values(examples).map((entry) => entry?.value).find((value) => value !== undefined);
}

function makeOperationId(categoryId: string, method: string, path: string): string {
  const route = path
    .replace(/\{([^}]+)\}/g, "by-$1")
    .split("/")
    .filter(Boolean)
    .join("-");
  return `${categoryId}-${method.toLowerCase()}-${route}`.toLowerCase();
}

const categories = [];
let operationCount = 0;

for (const category of specs) {
  const response = await fetch(`https://docs.meld.io/openapi/${category.file}-20260203.json`);
  if (!response.ok) throw new Error(`Unable to fetch ${category.name} OpenAPI spec: ${response.status}`);
  const spec = await response.json() as Record<string, any>;
  const endpoints = [];

  for (const [path, pathItem] of Object.entries(spec.paths || {}) as Array<[string, Record<string, any>]>) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;

      const parameters = [...(pathItem.parameters || []), ...(operation.parameters || [])].map((rawParameter) => {
        const parameter = resolveReference(rawParameter, spec) as Record<string, any>;
        const schema = normalizeSchema(parameter.schema || Object.values(parameter.content || {})[0]?.schema, spec);
        const example = parameter.example ?? firstExample(parameter.examples) ?? (schema as any)?.example ?? (schema as any)?.default;
        return {
          name: parameter.name,
          in: parameter.in,
          required: Boolean(parameter.required),
          description: parameter.description,
          schema: schema || {},
          example,
          style: parameter.style,
          explode: parameter.explode,
        };
      });

      let requestBody;
      if (operation.requestBody) {
        const body = resolveReference(operation.requestBody, spec) as Record<string, any>;
        const [contentType, mediaType] = Object.entries(body.content || {})[0] || [];
        const media = mediaType as Record<string, any> | undefined;
        if (media) {
          const example = media.example ?? firstExample(media.examples);
          requestBody = {
            required: Boolean(body.required),
            description: body.description,
            contentType,
            schema: normalizeSchema(media.schema, spec),
            example,
          };
        }
      }

      endpoints.push({
        id: makeOperationId(category.id, method, path),
        operationId: operation.operationId,
        name: operation.summary || operation.operationId || path,
        description: operation.description || operation.summary || "",
        method: method.toUpperCase(),
        path,
        deprecated: Boolean(operation.deprecated),
        parameters,
        requestBody,
      });
      operationCount++;
    }
  }

  categories.push({
    id: category.id,
    name: category.name,
    deprecated: category.deprecated,
    notice: category.deprecated
      ? "Deprecated API; Meld says these endpoints were removed on July 31, 2026. Use the Network Partners API for supported-route and provider data."
      : undefined,
    endpoints,
  });
}

const outputPath = resolve(dirname(fileURLToPath(import.meta.url)), "../src/lib/meld/catalog.generated.json");
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify({ version: apiVersion, source: "https://docs.meld.io/api-reference", categories }, null, 2)}\n`);
console.log(`Updated ${operationCount} operations in ${outputPath}`);
