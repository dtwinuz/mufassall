/**
 * MCP over JSON-RPC 2.0, by hand: one message per line in, at most one message per line out.
 * Transport-free, so tests drive it directly; `bin/server.mjs` connects it to stdio.
 */
import { type Schema, checkSchema } from "./schema";

export const PROTOCOL_VERSION = "2025-06-18";
/** Newest first; a client asking for another version gets the newest (spec: version negotiation). */
export const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"] as const;

export const ERR = {
  parse: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internal: -32603,
  /** MCP: resource not found */
  resourceNotFound: -32002,
} as const;

export class RpcError extends Error {
  readonly code: number;
  readonly data?: unknown;
  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.code = code;
    this.data = data;
  }
}

export interface ToolResult {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export interface Tool {
  name: string;
  title: string;
  description: string;
  inputSchema: Schema & { type: "object" };
  annotations?: Record<string, boolean | string>;
  run: (args: Record<string, unknown>) => ToolResult;
}

export interface Resource {
  uri: string;
  name: string;
  title?: string;
  description?: string;
  mimeType?: string;
}

export interface ResourceProvider {
  list: () => Resource[];
  templates?: () => { uriTemplate: string; name: string; title?: string; description?: string; mimeType?: string }[];
  /** null when the URI names nothing */
  read: (uri: string) => { uri: string; mimeType: string; text: string }[] | null;
}

export interface ServerOptions {
  name: string;
  title?: string;
  version: string;
  instructions?: string;
  tools: Tool[];
  resources?: ResourceProvider;
  /** diagnostics; must never write to stdout */
  log?: (line: string) => void;
}

type Id = string | number;
type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);

export function createServer(opts: ServerOptions) {
  const log = opts.log ?? (() => {});
  const tools = new Map(opts.tools.map((t) => [t.name, t]));
  let initialized = false;
  let protocolVersion: string = PROTOCOL_VERSION;

  const methods: Record<string, (params: Json) => unknown> = {
    initialize(params) {
      const asked = params.protocolVersion;
      if (typeof asked !== "string") throw new RpcError(ERR.invalidParams, "initialize: protocolVersion (string) is required");
      protocolVersion = (SUPPORTED_VERSIONS as readonly string[]).includes(asked) ? asked : PROTOCOL_VERSION;
      initialized = true;
      const client = isObject(params.clientInfo) ? `${String(params.clientInfo.name)} ${String(params.clientInfo.version ?? "")}` : "unknown client";
      log(`initialize: ${client.trim()} asked ${asked}, using ${protocolVersion}`);
      return {
        protocolVersion,
        capabilities: {
          tools: { listChanged: false },
          ...(opts.resources ? { resources: { subscribe: false, listChanged: false } } : {}),
        },
        serverInfo: { name: opts.name, ...(opts.title ? { title: opts.title } : {}), version: opts.version },
        ...(opts.instructions ? { instructions: opts.instructions } : {}),
      };
    },
    ping: () => ({}),
    "tools/list": () => ({
      tools: opts.tools.map(({ name, title, description, inputSchema, annotations }) => ({
        name,
        ...(protocolVersion >= "2025-06-18" ? { title } : {}),
        description,
        inputSchema,
        ...(annotations ? { annotations } : {}),
      })),
    }),
    "tools/call"(params) {
      const name = params.name;
      if (typeof name !== "string") throw new RpcError(ERR.invalidParams, "tools/call: name (string) is required");
      const tool = tools.get(name);
      if (!tool) throw new RpcError(ERR.invalidParams, `Unknown tool: ${name}`);
      const args = params.arguments ?? {};
      if (!isObject(args)) throw new RpcError(ERR.invalidParams, "tools/call: arguments must be an object");
      const problems = checkSchema(args, tool.inputSchema);
      if (problems.length) throw new RpcError(ERR.invalidParams, `Invalid arguments for ${name}: ${problems.join("; ")}`, { problems });
      try {
        const result = tool.run(args);
        // structuredContent arrived in 2025-06-18; older clients read the text block only
        if (protocolVersion < "2025-06-18" && result.structuredContent) {
          const { structuredContent: _, ...rest } = result;
          return rest;
        }
        return result;
      } catch (e) {
        log(`tool ${name} failed: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
        return { content: [{ type: "text", text: `${name} failed: ${e instanceof Error ? e.message : String(e)}` }], isError: true };
      }
    },
  };
  if (opts.resources) {
    const res = opts.resources;
    methods["resources/list"] = () => ({ resources: res.list() });
    methods["resources/templates/list"] = () => ({ resourceTemplates: res.templates?.() ?? [] });
    methods["resources/read"] = (params) => {
      const uri = params.uri;
      if (typeof uri !== "string") throw new RpcError(ERR.invalidParams, "resources/read: uri (string) is required");
      const contents = res.read(uri);
      if (!contents) throw new RpcError(ERR.resourceNotFound, "Resource not found", { uri });
      return { contents };
    };
  }

  const reply = (id: Id, result: unknown) => ({ jsonrpc: "2.0", id, result });
  const error = (id: Id | null, code: number, message: string, data?: unknown) => ({
    jsonrpc: "2.0",
    id,
    error: { code, message, ...(data === undefined ? {} : { data }) },
  });

  /** One parsed message → the response object, or null when none is due (notifications, responses). */
  function handle(msg: unknown): Json | null {
    if (Array.isArray(msg)) return error(null, ERR.invalidRequest, "Batch requests are not supported (removed in MCP 2025-06-18)");
    if (!isObject(msg) || msg.jsonrpc !== "2.0") return error(null, ERR.invalidRequest, 'Invalid Request: expected a JSON-RPC 2.0 object with "jsonrpc": "2.0"');
    const hasId = Object.hasOwn(msg, "id");
    const id = msg.id;
    if (hasId && typeof id !== "string" && (typeof id !== "number" || !Number.isFinite(id))) {
      return error(null, ERR.invalidRequest, "Invalid Request: id must be a string or a number");
    }
    if (typeof msg.method !== "string") {
      // a response to a request we never sent (we send none): nothing to answer
      if (hasId && (Object.hasOwn(msg, "result") || Object.hasOwn(msg, "error"))) return null;
      return error(hasId ? (id as Id) : null, ERR.invalidRequest, "Invalid Request: method must be a string");
    }
    const method = msg.method;
    if (!hasId) {
      if (method === "notifications/initialized") log("client initialized");
      else if (method === "notifications/cancelled") log("cancel ignored: tools answer synchronously");
      else log(`notification ignored: ${method}`);
      return null;
    }
    const params = msg.params ?? {};
    if (!isObject(params)) return error(id as Id, ERR.invalidParams, "params must be an object");
    const fn = Object.hasOwn(methods, method) ? methods[method] : undefined;
    if (!fn) return error(id as Id, ERR.methodNotFound, `Method not found: ${method}`);
    if (!initialized && method !== "initialize" && method !== "ping") {
      return error(id as Id, ERR.invalidRequest, "Server not initialized: send initialize first");
    }
    try {
      return reply(id as Id, fn(params));
    } catch (e) {
      if (e instanceof RpcError) return error(id as Id, e.code, e.message, e.data);
      log(`${method} failed: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
      return error(id as Id, ERR.internal, "Internal error");
    }
  }

  /** One line of input → one line of output (without the newline), or null. */
  function handleLine(line: string): string | null {
    if (!line.trim()) return null;
    let msg: unknown;
    try {
      msg = JSON.parse(line);
    } catch {
      return JSON.stringify(error(null, ERR.parse, "Parse error: each line must be one JSON-RPC message"));
    }
    const out = handle(msg);
    return out ? JSON.stringify(out) : null;
  }

  return { handle, handleLine, get protocolVersion() { return protocolVersion; } };
}
