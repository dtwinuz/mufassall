import { defineLesson } from "@mufassall/scene-schema";

/**
 * An installment shop keeps customers' names, phones, passports, card numbers and addresses.
 * The story follows that data into every place it leaks to: logs and the error tracker, a
 * "anonymous" analytics export whose phone hashes fall to brute force, support screens,
 * the staging copy of the database, and finally an erasure request that meets an append-only
 * ledger and old backups. All personal values are obviously fake (+998 90 000 00 00,
 * AA1234567, the 4111 test card); secrets are always masked. Numbers are a model scenario.
 */
export default defineLesson({
  slug: "pii-masking",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "logpii", unit: "/day", better: "down" },
    { id: "copies", unit: "", better: "down" },
    { id: "crack", unit: "%", better: "down" },
    { id: "views", unit: "/day", better: "down" },
    { id: "erase", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "setup",
      kind: "case",
      nodes: {
        app: { kind: "client", at: [0, 3] },
        support: { kind: "client", at: [0, 7] },
        api: { kind: "service", at: [4, 5] },
        db: { kind: "db", at: [4, 10] },
        logs: { kind: "storage", at: [9, 1] },
        staging: { kind: "db", at: [0, 12] },
      },
      edges: {
        send: { from: "app", to: "api", rate: 2, mode: "call" },
        ask: { from: "support", to: "api", rate: 1, mode: "call" },
        save: { from: "api", to: "db", rate: 2 },
        log: { from: "api", to: "logs", rate: 3, mode: "async" },
        copy: { from: "db", to: "staging", rate: 1 },
      },
      metrics: { logpii: 0, copies: 2, crack: 0, views: 9000, erase: 0 },
      focus: ["app", "api", "db"],
      exchange: {
        edge: "send",
        request: {
          format: "json",
          head: "POST /v1/installments HTTP/1.1",
          headers: [
            ["Authorization", "***"],
            ["X-Forwarded-For", "203.0.113.24"],
          ],
          body: `{
  "full_name": "Ali Valiyev",
  "phone": "+998 90 000 00 00",
  "passport": "AA1234567",
  "card_number": "4111 1111 1111 1111",
  "address": "Toshkent, Namuna ko'chasi 1",
  "term_months": 6
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 201 Created",
          body: `{
  "installment_id": "ins_3391",
  "customer_id": "c_5120"
}`,
        },
        marks: ["full_name", "phone", "passport", "card_number", "address", "X-Forwarded-For", "customer_id"],
        masked: ["Authorization"],
      },
    },
    {
      id: "log-leak",
      kind: "problem",
      nodes: { tracker: { kind: "external", at: [10, 5] } },
      edges: {
        log: { flow: "fail" },
        report: { from: "api", to: "tracker", flow: "fail", rate: 1, mode: "async" },
      },
      metrics: { logpii: 18000, copies: 4 },
      focus: ["api", "logs", "tracker"],
      exchange: {
        edge: "log",
        request: {
          format: "json",
          head: "11:42:07.318  ERROR  installment rejected",
          body: `{
  "request_id": "req_7f3a",
  "error": "scoring timeout after 5 s",
  "customer": {
    "full_name": "Ali Valiyev",
    "phone": "+998 90 000 00 00",
    "passport": "AA1234567",
    "address": "Toshkent, Namuna ko'chasi 1"
  }
}`,
        },
        response: {
          format: "text",
          head: "error tracker: event 8f1c attached the request body, kept 90 days",
        },
        marks: ["request_id", "customer", "phone", "passport", "error tracker"],
      },
    },
    {
      id: "redact",
      kind: "fix",
      edges: { log: { flow: "request" }, report: { flow: "request" } },
      metrics: { logpii: 0, copies: 2 },
      focus: ["api", "logs", "tracker"],
      exchange: {
        edge: "log",
        request: {
          format: "text",
          head: 'logger = createLogger({ redact: ["*.full_name", "*.phone", "*.passport", "*.address", "*.card_number"] })',
          body: "tracker.init({ sendRequestBody: false, beforeSend: scrub })",
        },
        response: {
          format: "text",
          head: "11:42:07.318  ERROR  installment rejected  request_id=req_7f3a  customer_id=c_5120",
          body: '  customer.phone="[redacted]"  customer.passport="[redacted]"\n-- an id is enough to find the person; the value stays in the database',
        },
        marks: ["redact", "sendRequestBody", "customer_id", "[redacted]"],
      },
    },
    {
      id: "four-ways",
      kind: "case",
      focus: ["api", "db"],
      exchange: {
        edge: "save",
        request: {
          format: "text",
          head: "one passport number, four treatments: AA1234567",
          body: "mask       AA*****67                      for the eye only, cannot be undone\nencrypt    v1:9xQe...Lw==  (AES-256-GCM)  undone with the key from the key service\ntokenize   tok_pp_7Hd2Qa                  the original lives only in a vault\nhash       sha256 -> 5c1e...a0             one-way, same input, same output\n-- card 4111 1111 1111 1111: the provider tokenizes it, we keep tok_ and last4 1111",
        },
        marks: ["mask", "encrypt", "tokenize", "hash", "last4"],
      },
    },
    {
      id: "hash",
      kind: "problem",
      nodes: { analytics: { kind: "storage", at: [10, 10] } },
      edges: { export: { from: "db", to: "analytics", flow: "fail", rate: 1, mode: "async" } },
      metrics: { crack: 100, copies: 3 },
      focus: ["db", "analytics"],
      exchange: {
        edge: "export",
        request: {
          format: "text",
          head: "nightly export to analytics: customer_ref, phone_sha256, city, orders",
          body: "phone_sha256 = sha256(\"998900000000\") = 3f0a...c2      \"anonymous\", the team thought\nattacker with the file: for n in 998 00 000 00 00 .. 998 99 999 99 99\n1 000 000 000 candidates, 10 000 000 000 sha256 per second on one GPU\n0.1 s later: 410 000 of 410 000 phones recovered",
        },
        marks: ["phone_sha256", "candidates", "one GPU", "410 000"],
      },
    },
    {
      id: "hmac",
      kind: "fix",
      nodes: { keys: { kind: "external", at: [9, 7] } },
      edges: {
        export: { flow: "request" },
        key: { from: "api", to: "keys", rate: 1, mode: "call" },
      },
      metrics: { crack: 0, copies: 2 },
      focus: ["api", "keys", "analytics"],
      exchange: {
        edge: "key",
        request: {
          format: "json",
          head: "GET secret pii/phone-ref-key",
          body: `{
  "name": "pii/phone-ref-key",
  "version": 3,
  "value": "***"
}`,
        },
        response: {
          format: "text",
          head: 'phone_ref = HMAC-SHA256(key_v3, "998900000000") = k3:71bd...e9',
          body: "-- analytics never sees the key: without it, not one candidate can be checked\n-- the same phone gives the same ref, so unique customers can still be counted\n-- each consumer gets its own key: refs from two exports cannot be joined",
        },
        marks: ["version", "value", "HMAC-SHA256", "never sees the key", "same ref", "own key"],
        masked: ["value"],
      },
    },
    {
      id: "reveal",
      kind: "fix",
      metrics: { views: 35 },
      focus: ["support", "api"],
      exchange: {
        edge: "ask",
        request: {
          format: "json",
          head: "POST /v1/customers/c_5120/reveal HTTP/1.1",
          headers: [["Authorization", "***"]],
          body: `{
  "field": "passport",
  "reason": "contract dispute T-2291"
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "passport": "AA1234567",
  "visible_for_s": 60,
  "audit_id": "au_88120"
}`,
        },
        marks: ["field", "reason", "visible_for_s", "audit_id"],
        masked: ["Authorization"],
      },
    },
    {
      id: "staging",
      kind: "fix",
      nodes: { masker: { kind: "worker", at: [3, 12] } },
      edges: {
        copy: null,
        dump: { from: "db", to: "masker", rate: 1 },
        load: { from: "masker", to: "staging", rate: 1 },
      },
      metrics: { copies: 1 },
      focus: ["db", "masker", "staging"],
      exchange: {
        edge: "dump",
        request: {
          format: "text",
          head: "02:00 nightly  prod -> staging, through the masking job",
          body: "customers.full_name  -> a name from a seeded generator     Ali Valiyev -> Bek Sobirov\ncustomers.phone      -> +998 00 + 7 digits from HMAC(customer_id)   same customer, same fake\ncustomers.passport   -> XX + 7 digits: valid format, never a real one\ncards                -> only test tokens\n-- 41 columns have a rule in pii.yaml; a column without a rule stops the job",
        },
        marks: ["seeded", "same fake", "valid format", "pii.yaml", "stops the job"],
      },
    },
    {
      id: "erase",
      kind: "problem",
      metrics: { erase: 4 },
      focus: ["api", "db", "staging"],
      exchange: {
        edge: "save",
        request: {
          format: "sql",
          head: "-- request ER-0412: customer c_5120 asks to be erased",
          body: "DELETE FROM customers WHERE id = 'c_5120';\n-- ERROR: installments_customer_fk: 6 installments reference this row\n-- ledger: payments are kept 5 years by accounting rules, append-only\n-- audit_log: append-only, hash-chained\n-- backups: 35 daily copies, each with the full row",
        },
        marks: ["ERROR", "ledger", "audit_log", "backups"],
      },
    },
    {
      id: "shred",
      kind: "fix",
      metrics: { erase: 0 },
      focus: ["api", "keys", "db"],
      exchange: {
        edge: "key",
        request: {
          format: "text",
          head: "DELETE /keys/customers/c_5120/profile   (key service, outside the DB backups)",
          body: "UPDATE customers SET status = 'erased', erased_at = now() WHERE id = 'c_5120';\n-- name, phone, address were encrypted with that key: noise now, in all 35 backups too\n-- passport: legal hold until 2031-05 for the contracts; its key is deleted then\n-- ledger and audit keep c_5120 and amounts, never a name\n-- logs keep 14 days, the tracker 30: their copies age out on their own",
        },
        marks: ["outside the DB backups", "erased", "all 35 backups", "legal hold", "never a name", "14 days"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "debug-body",
      from: "redact",
      steps: [
        {
          id: "debug-leak",
          kind: "problem",
          edges: { log: { flow: "fail" } },
          metrics: { logpii: 1300, copies: 4 },
          focus: ["app", "api", "logs"],
          exchange: {
            edge: "log",
            request: {
              format: "text",
              head: "DEBUG_HTTP=1 switched on in prod on Monday, to chase a payment bug",
              body: "09:14:02 DEBUG http POST /v1/cards body='{\"card_number\":\"4111 1111 1111 1111\",\"exp\":\"12/29\",\"cvv\":\"123\"}'\n-- the body is one string: redaction matches field names, it never looks inside a string\n-- 3 days x 1 300 card bindings = 3 900 full card numbers, CVV included",
            },
            marks: ["DEBUG_HTTP", "body", "field names", "3 900"],
          },
        },
        {
          id: "debug-stop",
          kind: "fix",
          edges: { log: { flow: "request" } },
          metrics: { logpii: 0 },
          focus: ["api", "logs"],
          exchange: {
            edge: "log",
            request: {
              format: "text",
              head: "http log: method, path, status, size, duration. Never headers, never bodies.",
              body: "09:14:02 INFO http POST /v1/cards 201 412B 88ms request_id=req_91c2\n-- DEBUG_HTTP is refused at startup when ENV=prod\n-- log pipeline: 13-19 digit runs that pass the Luhn check are replaced, and #security is paged",
            },
            marks: ["Never", "refused", "Luhn", "paged"],
          },
        },
        {
          id: "debug-clean",
          kind: "fix",
          metrics: { copies: 2 },
          focus: ["api", "logs", "tracker"],
          exchange: {
            edge: "report",
            request: {
              format: "text",
              head: "incident SEC-117: card numbers in logs since Monday 09:14",
              body: "log store: delete by query in 3 daily indices -> 3 900 lines\nerror tracker: 212 events deleted through the API, vendor asked to purge its copies\nlog archive: 3 objects rewritten, old object versions removed\n-- card data in logs is a PCI DSS incident: the payment provider and the risk team are told",
            },
            marks: ["delete by query", "212 events", "old object versions", "PCI DSS"],
          },
        },
      ],
    },
  ],
});
