/**
 * The small JSON Schema subset the tool inputs use, and a checker for it: the server has no
 * dependencies, so arguments are checked here before a tool runs.
 */
export type JsonType = "object" | "string" | "number" | "integer" | "boolean" | "array";

export interface Schema {
  type?: JsonType | JsonType[];
  description?: string;
  enum?: readonly string[];
  properties?: Record<string, Schema>;
  required?: readonly string[];
  additionalProperties?: boolean | Schema;
  items?: Schema;
  minLength?: number;
  maxLength?: number;
}

const typeOf = (v: unknown): JsonType | "null" => {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "number") return Number.isInteger(v) ? "integer" : "number";
  return typeof v as JsonType;
};

const fits = (v: unknown, t: JsonType) => {
  const actual = typeOf(v);
  return actual === t || (t === "number" && actual === "integer");
};

/** Problems with `value` against `schema`, each as "path: message"; empty when it fits. */
export function checkSchema(value: unknown, schema: Schema, path = "arguments"): string[] {
  const out: string[] = [];
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => fits(value, t))) {
      out.push(`${path}: expected ${types.join(" or ")}, got ${typeOf(value)}`);
      return out;
    }
  }
  if (schema.enum && !(typeof value === "string" && schema.enum.includes(value))) {
    out.push(`${path}: must be one of ${schema.enum.join(", ")}`);
  }
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) out.push(`${path}: shorter than ${schema.minLength}`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) out.push(`${path}: longer than ${schema.maxLength}`);
  }
  if (Array.isArray(value) && schema.items) value.forEach((v, i) => out.push(...checkSchema(v, schema.items!, `${path}[${i}]`)));
  if (typeOf(value) === "object" && (schema.properties || schema.required || schema.additionalProperties !== undefined)) {
    const obj = value as Record<string, unknown>;
    for (const key of schema.required ?? []) if (!Object.hasOwn(obj, key)) out.push(`${path}.${key}: required`);
    for (const [key, v] of Object.entries(obj)) {
      const prop = schema.properties?.[key];
      if (prop) out.push(...checkSchema(v, prop, `${path}.${key}`));
      else if (schema.additionalProperties === false) out.push(`${path}.${key}: unknown property`);
      else if (typeof schema.additionalProperties === "object") out.push(...checkSchema(v, schema.additionalProperties, `${path}.${key}`));
    }
  }
  return out;
}
