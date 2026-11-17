import { type WireMessage, defineLesson } from "@mufassall/scene-schema";

/**
 * Logging users in: password storage, sessions, JWT access + refresh tokens, OIDC, MFA.
 * Every secret in a wire message is the public placeholder `***`.
 * Numbers are a model scenario for the story, not measurements.
 */
const loginRequest: WireMessage = {
  format: "json",
  head: "POST /login HTTP/1.1",
  headers: [["Host", "api.example.com"]],
  body: `{
  "email": "ali@example.com",
  "password": "***"
}`,
};

export default defineLesson({
  slug: "authentication",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "cracked", unit: "%", better: "down" },
    { id: "login-ms", unit: "ms", better: "down" },
    { id: "takeovers", unit: "/day", better: "down" },
  ],
  steps: [
    {
      id: "leak",
      kind: "problem",
      nodes: {
        user: { kind: "actor", at: [0, 1] },
        web: { kind: "client", at: [3, 1] },
        api: { kind: "service", at: [6, 3] },
        users: { kind: "db", at: [10, 3] },
        attacker: { kind: "actor", at: [12, 11] },
      },
      edges: {
        type: { from: "user", to: "web", rate: 2 },
        login: { from: "web", to: "api", rate: 3 },
        check: { from: "api", to: "users", rate: 3 },
        dump: { from: "attacker", to: "users", flow: "fail", rate: 2 },
      },
      metrics: { cracked: 62, "login-ms": 40, takeovers: 35 },
      focus: ["users", "attacker"],
      exchange: {
        edge: "dump",
        request: {
          format: "sql",
          head: "SELECT id, email, password_sha256 FROM users;",
        },
        response: {
          format: "json",
          head: "120000 rows, first one:",
          body: `{
  "id": "u_42",
  "email": "ali@example.com",
  "password_sha256": "***",
  "salt": null
}`,
        },
        marks: ["password_sha256", "salt"],
        masked: ["password_sha256"],
      },
    },
    {
      id: "slow-hash",
      kind: "fix",
      nodes: { api: { load: 40 } },
      edges: { dump: { rate: 1 } },
      metrics: { cracked: 0.5, "login-ms": 290, takeovers: 4 },
      focus: ["api", "users"],
      exchange: {
        edge: "check",
        request: {
          format: "sql",
          head: "SELECT id, password_hash FROM users",
          body: "WHERE email = 'ali@example.com';",
        },
        response: {
          format: "json",
          head: "1 row",
          body: `{
  "id": "u_42",
  "password_hash": "***",
  "algo": "argon2id",
  "cost": "m=64MB t=3 p=1"
}`,
        },
        marks: ["password_hash", "algo", "cost"],
        masked: ["password_hash"],
      },
    },
    {
      id: "session",
      kind: "case",
      nodes: {
        attacker: null,
        sessions: { kind: "cache", at: [6, 7], load: 20 },
      },
      edges: { store: { from: "api", to: "sessions", rate: 3 } },
      focus: ["web", "api", "sessions"],
      exchange: {
        edge: "login",
        request: loginRequest,
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [
            ["Set-Cookie", "***"],
            ["Cache-Control", "no-store"],
          ],
        },
        marks: ["password", "Set-Cookie"],
        masked: ["password", "Set-Cookie"],
      },
    },
    {
      id: "shared-store",
      kind: "problem",
      nodes: {
        orders: { kind: "service", at: [2, 8] },
        sessions: { load: 92, state: "slow" },
      },
      edges: {
        call: { from: "web", to: "orders", rate: 5 },
        lookup: { from: "orders", to: "sessions", rate: 5 },
        store: { rate: 6 },
      },
      focus: ["orders", "sessions"],
      exchange: {
        edge: "lookup",
        request: { format: "text", head: "GET sess:***" },
        response: {
          format: "text",
          head: "\"u_42\"",
          body: "one of 41000 GET/s on a single Redis",
        },
        marks: ["GET", "sess"],
      },
    },
    {
      id: "jwt",
      kind: "fix",
      nodes: { sessions: { load: 25, state: "ok" } },
      edges: { lookup: null, store: { rate: 3 } },
      focus: ["web", "orders"],
      exchange: {
        edge: "call",
        request: {
          format: "text",
          head: "GET /orders HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Authorization", "***"],
          ],
          body: "token, decoded by orders:\nheader    {\"alg\": \"RS256\", \"kid\": \"k_11\"}\npayload   {\"sub\": \"u_42\", \"exp\": 1795393743}\nsignature ***",
        },
        response: { format: "http", head: "HTTP/1.1 200 OK" },
        marks: ["Authorization", "kid", "sub", "exp", "signature"],
        masked: ["Authorization"],
      },
    },
    {
      id: "stolen",
      kind: "problem",
      nodes: { attacker: { kind: "actor", at: [12, 11] } },
      edges: { replay: { from: "attacker", to: "orders", flow: "dup", rate: 3 } },
      metrics: { takeovers: 9 },
      focus: ["attacker", "orders"],
      exchange: {
        edge: "replay",
        request: {
          format: "text",
          head: "GET /orders HTTP/1.1",
          headers: [["Authorization", "***"]],
          body: "stolen token, decoded:\n\"sub\": \"u_42\"\n\"iat\": 1795392843\n\"exp\": 1797984843   (iat + 30 days)",
        },
        response: { format: "http", head: "HTTP/1.1 200 OK" },
        marks: ["iat", "exp"],
        masked: ["Authorization"],
      },
    },
    {
      id: "refresh",
      kind: "fix",
      edges: { replay: { flow: "fail" } },
      metrics: { takeovers: 2 },
      focus: ["web", "api", "sessions"],
      exchange: {
        edge: "login",
        request: {
          format: "http",
          head: "POST /token HTTP/1.1",
          headers: [["Cookie", "***"]],
          body: "grant_type=refresh_token",
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "access_token": "***",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "***"
}`,
        },
        marks: ["grant_type", "refresh_token", "access_token", "expires_in"],
        masked: ["Cookie", "access_token", "refresh_token"],
      },
    },
    {
      id: "revoke",
      kind: "fix",
      edges: { replay: { cut: true } },
      metrics: { takeovers: 1 },
      focus: ["api", "sessions"],
      exchange: {
        edge: "store",
        request: {
          format: "text",
          head: "DEL rt:u_42:fam_19",
          body: "SET deny:jti_8c1 1 EX 900",
        },
        response: { format: "text", head: "(integer) 1", body: "OK" },
        marks: ["DEL", "jti_8c1", "EX"],
      },
    },
    {
      id: "oidc",
      kind: "fix",
      nodes: { idp: { kind: "external", at: [0, 4] } },
      edges: {
        redirect: { from: "web", to: "idp", rate: 2 },
        swap: { from: "api", to: "idp", rate: 2 },
      },
      focus: ["web", "api", "idp"],
      exchange: {
        edge: "swap",
        request: {
          format: "http",
          head: "POST /oauth2/token HTTP/1.1",
          headers: [
            ["Host", "id.example.com"],
            ["Authorization", "***"],
          ],
          body: "grant_type=authorization_code\n&code=***\n&redirect_uri=https://app.example.com/cb\n&code_verifier=***",
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "id_token": "***",
  "access_token": "***",
  "expires_in": 3600
}`,
        },
        marks: ["Authorization", "code", "redirect_uri", "code_verifier", "id_token"],
        masked: ["Authorization", "id_token", "access_token"],
      },
    },
    {
      id: "mfa",
      kind: "fix",
      nodes: { api: { load: 55 } },
      edges: {
        replay: null,
        stuff: { from: "attacker", to: "api", flow: "fail", rate: 8 },
      },
      metrics: { takeovers: 0 },
      focus: ["attacker", "api"],
      exchange: {
        edge: "stuff",
        request: loginRequest,
        response: {
          format: "json",
          head: "HTTP/1.1 401 Unauthorized",
          body: `{
  "mfa_required": true,
  "methods": ["totp", "passkey"],
  "mfa_token": "***"
}`,
        },
        marks: ["password", "mfa_required", "methods", "mfa_token"],
        masked: ["password", "mfa_token"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
