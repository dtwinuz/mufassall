import { defineLesson } from "@mufassall/scene-schema";

/**
 * A small notes app: phone app → API → database, plus backups. The data is readable in four
 * places at the start (wire, disk, backups, the config file) and the lesson closes them one by one.
 * Numbers are a model scenario, not measurements.
 */
export default defineLesson({
  slug: "encryption",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "open-spots", unit: "", better: "down" },
    { id: "p95", unit: "ms", better: "down" },
    { id: "errors", unit: "%", better: "down" },
  ],
  steps: [
    {
      id: "plain",
      kind: "problem",
      nodes: {
        app: { kind: "client", at: [0, 4] },
        api: { kind: "service", at: [4, 4] },
        db: { kind: "db", at: [8, 2] },
        attacker: { kind: "actor", at: [4, 9] },
      },
      edges: {
        call: { from: "app", to: "api", rate: 3 },
        store: { from: "api", to: "db", rate: 2 },
        sniff: { from: "app", to: "attacker", flow: "dup", rate: 3 },
      },
      metrics: { "open-spots": 4, p95: 120, errors: 0 },
      focus: ["app", "attacker"],
      exchange: {
        edge: "call",
        request: {
          format: "json",
          head: "POST /notes HTTP/1.1",
          headers: [
            ["Host", "api.example.com"],
            ["Authorization", "***"],
          ],
          body: `{
  "title": "Spare key",
  "text": "Door code 4417, key under the mat"
}`,
        },
        response: { format: "http", head: "HTTP/1.1 201 Created" },
        marks: ["Host", "Authorization", "text"],
        masked: ["Authorization"],
      },
    },
    {
      id: "tls",
      kind: "fix",
      edges: { sniff: { cut: true } },
      metrics: { "open-spots": 3, p95: 135 },
      focus: ["app", "api"],
      exchange: {
        edge: "call",
        request: {
          format: "text",
          head: "ClientHello",
          body: "version TLS 1.3\nSNI api.example.com\ncipher TLS_AES_128_GCM_SHA256\nkey_share x25519 (public half)",
        },
        response: {
          format: "text",
          head: "ServerHello + Certificate",
          body: "key_share x25519 (public half)\nsubject CN=api.example.com\nissuer Example Public CA\nvalid until 2026-11-17\nFinished: everything after this is encrypted",
        },
        marks: ["SNI", "key_share", "subject", "issuer", "valid until", "Finished"],
      },
    },
    {
      id: "expired",
      kind: "problem",
      edges: { call: { flow: "fail" } },
      metrics: { errors: 100 },
      focus: ["app", "api"],
      exchange: {
        edge: "call",
        request: {
          format: "text",
          head: "ClientHello",
          body: "version TLS 1.3\nSNI api.example.com",
        },
        response: {
          format: "text",
          head: "ServerHello + Certificate",
          body: "subject CN=api.example.com\nvalid until 2026-11-17T00:00:00Z\nclient clock 2026-11-18T08:02:11Z\nclient: certificate has expired, closing",
        },
        marks: ["valid until", "client clock", "expired"],
      },
    },
    {
      id: "renew",
      kind: "fix",
      nodes: { ca: { kind: "external", at: [0, 0] } },
      edges: {
        call: { flow: "request" },
        renew: { from: "api", to: "ca", rate: 1 },
      },
      metrics: { errors: 0 },
      focus: ["api", "ca"],
      exchange: {
        edge: "renew",
        request: {
          format: "json",
          head: "POST /acme/new-order HTTP/1.1",
          body: `{
  "identifiers": [
    { "type": "dns", "value": "api.example.com" }
  ]
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 201 Created",
          body: `{
  "status": "pending",
  "expires": "2026-11-25T08:00:00Z",
  "finalize": "/acme/order/o_93/finalize"
}`,
        },
        marks: ["identifiers", "status", "finalize"],
      },
    },
    {
      id: "backup",
      kind: "problem",
      nodes: {
        ca: null,
        backup: { kind: "storage", at: [12, 2] },
      },
      edges: {
        sniff: null,
        copy: { from: "db", to: "backup", rate: 1 },
        leak: { from: "backup", to: "attacker", flow: "dup", rate: 2 },
      },
      focus: ["db", "backup", "attacker"],
      exchange: {
        edge: "leak",
        request: {
          format: "text",
          head: "$ strings notes-2026-11-01.bak | grep -i door",
          body: "n_301  u_42  Spare key  Door code 4417, key under the mat\nn_877  u_95  Gate       door 2 opens with 0912#",
        },
        marks: ["strings", "u_42"],
      },
    },
    {
      id: "at-rest",
      kind: "fix",
      edges: { leak: { cut: true } },
      metrics: { "open-spots": 1, p95: 142 },
      focus: ["api", "db", "backup"],
      exchange: {
        edge: "store",
        request: {
          format: "sql",
          head: "INSERT INTO notes (id, owner, text_enc, nonce)",
          body: "VALUES ('n_301', 'u_42',\n        '\\x8c1f...e07a', '\\x51a0c3...');",
        },
        response: { format: "text", head: "INSERT 0 1" },
        marks: ["text_enc", "nonce"],
      },
    },
    {
      id: "key-leak",
      kind: "problem",
      edges: {
        leak: { cut: false },
        clone: { from: "api", to: "attacker", flow: "dup", rate: 2 },
      },
      metrics: { "open-spots": 3 },
      focus: ["api", "attacker"],
      exchange: {
        edge: "clone",
        request: {
          format: "json",
          head: "config/prod.json (from a leaked image)",
          body: `{
  "db_url": "postgres://notes_app@db:5432/notes",
  "db_password": "***",
  "notes_key": "***",
  "notes_key_created": "2024-03-02"
}`,
        },
        marks: ["db_password", "notes_key", "notes_key_created"],
        masked: ["db_password", "notes_key"],
      },
    },
    {
      id: "envelope",
      kind: "fix",
      nodes: { kms: { kind: "external", at: [8, 8] } },
      edges: {
        wrap: { from: "api", to: "kms", rate: 1 },
        leak: { cut: true },
        clone: { cut: true },
      },
      metrics: { "open-spots": 1, p95: 158 },
      focus: ["api", "kms"],
      exchange: {
        edge: "wrap",
        request: {
          format: "json",
          head: "POST /v1/keys/notes-master:generateDataKey HTTP/1.1",
          headers: [["Authorization", "***"]],
          body: `{ "key_spec": "AES_256" }`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "plaintext": "***",
  "ciphertext_blob": "AQIDAHh4c3...",
  "key_version": 3
}`,
        },
        marks: ["key_spec", "plaintext", "ciphertext_blob", "key_version"],
        masked: ["Authorization", "plaintext"],
      },
    },
    {
      id: "secrets",
      kind: "fix",
      nodes: { secrets: { kind: "external", at: [4, 0] } },
      edges: { secret: { from: "api", to: "secrets", rate: 1 } },
      metrics: { "open-spots": 0 },
      focus: ["api", "secrets"],
      exchange: {
        edge: "secret",
        request: {
          format: "http",
          head: "GET /v1/secret/notes-db HTTP/1.1",
          headers: [["X-Auth-Token", "***"]],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "username": "notes_app_7f2",
  "password": "***",
  "lease_duration": 3600,
  "renewable": true
}`,
        },
        marks: ["X-Auth-Token", "username", "password", "lease_duration"],
        masked: ["X-Auth-Token", "password"],
      },
    },
    {
      id: "rotate",
      kind: "case",
      nodes: { kms: { load: 35 } },
      edges: { wrap: { rate: 5 }, secret: { flow: "retry" } },
      focus: ["kms", "secrets"],
      exchange: {
        edge: "wrap",
        request: {
          format: "json",
          head: "POST /v1/keys/notes-master:reEncrypt HTTP/1.1",
          headers: [["Authorization", "***"]],
          body: `{ "ciphertext_blob": "AQIDAHh4c3..." }`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "ciphertext_blob": "AQIDAHj9Qe...",
  "key_version": 4,
  "source_key_version": 3
}`,
        },
        marks: ["source_key_version", "key_version"],
        masked: ["Authorization"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
