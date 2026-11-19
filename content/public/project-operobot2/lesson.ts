import { defineLesson } from "@mufassall/scene-schema";

/**
 * Project lesson: dtwinuz/operobot2, a public multi-tenant AI sales and call-center SaaS for
 * businesses in Uzbekistan. User side: one inbox for Telegram, WhatsApp, Instagram, SMS and a site
 * widget; an AI agent that answers, extracts a phone or a meeting time and hands off to a person;
 * a 6-stage CRM board; outbound call campaigns with a legal 09:00-18:00 window, consent and a block
 * list. Technical side: Fastify + PostgreSQL with row level security per organisation, channel
 * tokens sealed with AES-256-GCM bound to the org id, SSE for live updates, the HTTP bridge to the
 * older operobot dialer, Payme and Click, an MCP endpoint. Pipelines: CI = typecheck + build only
 * (a stated project rule), deploy.sh with Docker Compose behind the shared edge proxy, two demos.
 * Scenarios: the edge proxy hid client IPs so the demo limit became global (#18), and campaign
 * bugs found by reading the code before real dialing (#21). Sources: README, docs/00-10, ADR
 * 0001-0003, api/src, deploy/, PRs #1, #18, #20-#25.
 */
export default defineLesson({
  slug: "project-operobot2",
  level: "intermediate",
  minutes: 18,
  tier: "public",
  metrics: [
    { id: "foreign", unit: "", better: "down" },
    { id: "plain", unit: "%", better: "down" },
    { id: "shared", unit: "%", better: "down" },
    { id: "lines", unit: "", better: "down" },
    { id: "smoke", unit: "", better: "up" },
    { id: "expired", unit: "%", better: "down" },
  ],
  steps: [
    {
      id: "intro",
      kind: "case",
      nodes: {
        customer: { kind: "actor", at: [0, 1] },
        channels: { kind: "external", at: [4, 0] },
        api: { kind: "service", at: [7, 4] },
        web: { kind: "client", at: [3, 8] },
        operator: { kind: "actor", at: [0, 11] },
      },
      edges: {
        write: { from: "customer", to: "channels", rate: 2 },
        hook: { from: "channels", to: "api", rate: 2, mode: "async" },
        panel: { from: "web", to: "api", rate: 2, mode: "call" },
        use: { from: "operator", to: "web", rate: 1 },
      },
      focus: ["customer", "channels", "api", "web", "operator"],
      exchange: {
        edge: "panel",
        request: {
          format: "http",
          head: "POST /api/auth/demo HTTP/1.1",
          headers: [["Host", "operobot2.dtwin.uz"]],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          headers: [["Set-Cookie", "***"]],
          body: `{
  "user": { "id": "u_7c1e", "name": "Demo foydalanuvchi", "email": "demo-k3x9qa@demo.operobot2" },
  "org": { "id": "o_41b2", "name": "Namuna Servis", "plan": "pro", "demo": true },
  "role": "owner",
  "orgs": [{ "id": "o_41b2", "name": "Namuna Servis", "role": "owner" }]
}`,
        },
        marks: ["Set-Cookie", "org", "plan", "demo", "role"],
        masked: ["Set-Cookie"],
      },
    },
    {
      id: "inbox",
      kind: "case",
      focus: ["customer", "channels", "api", "web"],
      exchange: {
        edge: "hook",
        request: {
          format: "json",
          head: "POST /api/hooks/telegram/<channel secret> HTTP/1.1",
          body: `{
  "update_id": 90211,
  "message": {
    "message_id": 512,
    "from": { "id": 7001, "first_name": "Dilnoza", "username": "dilnoza_00" },
    "chat": { "id": 7001 },
    "text": "Assalomu alaykum, narxi qancha?"
  }
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{ "ok": true }`,
        },
        marks: ["message_id", "from", "chat", "text", "ok"],
      },
    },
    {
      id: "ai",
      kind: "case",
      nodes: { ai: { kind: "service", at: [11, 0] } },
      edges: { brain: { from: "api", to: "ai", rate: 2, mode: "call" } },
      focus: ["api", "ai", "web"],
      exchange: {
        edge: "brain",
        request: {
          format: "json",
          head: "POST /api/agents/ag_zarina/test HTTP/1.1",
          body: `{ "text": "Ertaga soat 11 da kelsam bo'ladimi?" }`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "reply": "Ajoyib! 20.11 soat 11:00 ga yozib qo'ydim. Bir kun oldin eslatma yuboramiz.",
  "action": "reply",
  "extracted": {
    "meeting": "2026-11-20T06:00:00.000Z",
    "interest": "yuqori",
    "stage": "uchrashuv"
  }
}`,
        },
        marks: ["text", "reply", "action", "meeting", "stage"],
      },
    },
    {
      id: "board",
      kind: "case",
      nodes: { db: { kind: "db", at: [11, 8] } },
      edges: { sql: { from: "api", to: "db", rate: 2, mode: "call" } },
      focus: ["web", "api", "db"],
      exchange: {
        edge: "panel",
        request: {
          format: "json",
          head: "PATCH /api/leads/ld_3f20 HTTP/1.1",
          headers: [["Cookie", "***"]],
          body: `{
  "stageId": "st_uchrashuv",
  "interest": "yuqori",
  "nextAction": "Namuna olib kelish",
  "dueAt": "2026-11-20T06:00:00.000Z"
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "id": "ld_3f20",
  "title": "Dilnoza: narx",
  "source": "telegram",
  "conversationId": "cv_88a1",
  "contact": { "id": "ct_19", "name": "Dilnoza", "phone": "+998 00 123 45 67" }
}`,
        },
        marks: ["stageId", "interest", "nextAction", "source", "conversationId"],
        masked: ["Cookie"],
      },
    },
    {
      id: "calls",
      kind: "case",
      nodes: { dialer: { kind: "external", at: [12, 4] } },
      edges: { originate: { from: "api", to: "dialer", rate: 1, mode: "call" } },
      focus: ["web", "api", "dialer"],
      exchange: {
        edge: "panel",
        request: {
          format: "json",
          head: "POST /api/campaigns HTTP/1.1",
          headers: [["Cookie", "***"]],
          body: `{
  "name": "Kuzgi aksiya",
  "agentId": "ag_sardor",
  "phones": ["+998 00 111 22 33", "+998 00 444 55 66"],
  "consent": true
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{ "id": "cp_5", "name": "Kuzgi aksiya", "status": "draft", "total": 2, "called": 0 }`,
        },
        marks: ["agentId", "phones", "consent", "status"],
        masked: ["Cookie"],
      },
    },
    {
      id: "arch",
      kind: "case",
      edges: { events: { from: "api", to: "web", rate: 1, mode: "async" } },
      focus: ["api", "web", "db", "ai"],
      exchange: {
        edge: "events",
        request: {
          format: "text",
          head: "GET /api/events   Accept: text/event-stream   (one stream per open panel)",
          body: "data: {\"type\":\"message\",\"data\":{\"conversationId\":\"cv_88a1\",\"message\":{\"author\":\"ai\"}}}\ndata: {\"type\":\"lead\",\"data\":{\"id\":\"ld_3f20\",\"stageId\":\"st_uchrashuv\"}}\ndata: {\"type\":\"usage\",\"data\":{\"aiReplies\":1}}\n-- types: message, conversation, lead, call, campaign, usage\n-- bus.ts keeps subscribers in memory: one API instance; more need LISTEN/NOTIFY",
        },
        marks: ["text/event-stream", "message", "lead", "usage", "LISTEN/NOTIFY"],
      },
    },
    {
      id: "rls",
      kind: "fix",
      metrics: { foreign: 0 },
      focus: ["api", "db"],
      exchange: {
        edge: "sql",
        request: {
          format: "sql",
          head: "-- every request runs inside tx(orgId, fn), as the role ob2_app",
          body: "BEGIN;\nSELECT set_config('app.org_id', '<org uuid>', true), set_config('app.bypass', 'off', true);\nSELECT * FROM leads;            -- no WHERE org_id: the policy adds it\nCOMMIT;                         -- the setting dies with the transaction\n-- 001_init.sql, for each of the 12 tenant tables:\nALTER TABLE leads ENABLE ROW LEVEL SECURITY;  ALTER TABLE leads FORCE ROW LEVEL SECURITY;\nCREATE POLICY tenant ON leads\n  USING (org_id = nullif(current_setting('app.org_id', true), '')::uuid\n         OR current_setting('app.bypass', true) = 'on');   -- WITH CHECK: the same\n-- local proof: SET ROLE ob2_app; SELECT count(*) FROM leads;  -> 0",
        },
        marks: ["ob2_app", "app.org_id", "no WHERE", "FORCE", "tenant"],
      },
    },
    {
      id: "secrets",
      kind: "fix",
      metrics: { plain: 0 },
      focus: ["api", "db", "channels"],
      exchange: {
        edge: "sql",
        request: {
          format: "json",
          head: "UPDATE channels SET config = $2 WHERE id = $1   -- channels.config after #20",
          body: `{
  "enc": 1,
  "iv": "***",
  "tag": "***",
  "data": "***"
}`,
        },
        response: {
          format: "text",
          head: "how it is sealed (api/src/channels/secrets.ts)",
          body: "AES-256-GCM in the API process, key = CHANNEL_KEY from .env (openssl rand -hex 32)\nAAD = org_id: a blob copied into another tenant's row does not open\nstartup: plain rows get sealed, every sealed row must open, or the API refuses to start\nno CHANNEL_KEY: adding a channel with a token answers 409, demo channels keep working",
        },
        marks: ["enc", "iv", "tag", "data", "AAD", "409"],
        masked: ["iv", "tag", "data"],
      },
    },
    {
      id: "bridge",
      kind: "case",
      focus: ["api", "dialer", "db"],
      exchange: {
        edge: "originate",
        request: {
          format: "json",
          head: "POST <dialer-url>/originate HTTP/1.1",
          headers: [["Authorization", "***"]],
          body: `{
  "callId": "cl_9012",
  "phone": "+998 00 111 22 33",
  "callback": "https://operobot2.dtwin.uz/api/hooks/dialer/<org>.<hook secret>"
}`,
        },
        response: {
          format: "text",
          head: "later: POST /api/hooks/dialer/<org>.<hook secret>",
          body: "{\"callId\":\"cl_9012\",\"status\":\"connected\",\"durationSec\":74,\"summary\":\"...\"}\nstatus   connected | operator_busy | answered | declined | no_answer | busy | failed\n2xx      wait for the result          400 / 422  the number is refused: failed\nanything else (no answer, 5xx, 401, 404, 409, 429): back to the queue, retry in 15 s, same callId\n-- a repeated result is not counted twice; no result in 30 min: failed",
        },
        marks: ["callId", "callback", "operator_busy", "422", "15 s", "30 min"],
        masked: ["Authorization"],
      },
    },
    {
      id: "billing",
      kind: "case",
      nodes: { pay: { kind: "external", at: [12, 11] } },
      edges: { merchant: { from: "pay", to: "api", rate: 1, mode: "call" } },
      focus: ["pay", "api", "db"],
      exchange: {
        edge: "merchant",
        request: {
          format: "json",
          head: "POST /api/pay/payme HTTP/1.1",
          headers: [["Authorization", "***"]],
          body: `{
  "id": 3,
  "method": "PerformTransaction",
  "params": { "id": "64f1c0a2e1" }
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "result": { "transaction": "64f1c0a2e1", "perform_time": 1763625600000, "state": 2 }
}`,
        },
        marks: ["Authorization", "method", "state"],
        masked: ["Authorization"],
      },
    },
    {
      id: "mcp",
      kind: "case",
      nodes: { claude: { kind: "client", at: [7, 12] } },
      edges: { tools: { from: "claude", to: "api", rate: 1, mode: "call" } },
      focus: ["claude", "api"],
      exchange: {
        edge: "tools",
        request: {
          format: "json",
          head: "POST /api/mcp HTTP/1.1",
          headers: [["Authorization", "***"]],
          body: `{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": { "name": "lidlar", "arguments": { "bosqich": "Uchrashuv" } }
}`,
        },
        response: {
          format: "text",
          head: "6 tools, one org API key (ob2_<prefix>_<secret>, only its sha256 is stored)",
          body: "lidlar          leads on the board: stage, interest, next step\nlid_yangilash   move a lead or change it\nsuhbatlar       open conversations (channel, AI or human mode)\nsuhbat_tarixi   messages of one conversation\nxabar_yuborish  send a message to the customer through the conversation's channel\nstatistika      today's numbers, the funnel and the monthly limits",
        },
        marks: ["Authorization", "method", "name", "sha256"],
        masked: ["Authorization"],
      },
    },
    {
      id: "ci",
      kind: "case",
      nodes: {
        customer: null,
        operator: null,
        code: { kind: "storage", at: [0, 4] },
        ci: { kind: "worker", at: [0, 0] },
      },
      edges: { check: { from: "code", to: "ci", rate: 1, mode: "call" } },
      focus: ["code", "ci"],
      exchange: {
        edge: "check",
        request: {
          format: "text",
          head: ".github/workflows/ci.yml   on: push to main, pull_request",
          body: "job api   npm ci, npm run build   (tsc typecheck + build)\njob web   npm ci, npm run build   (tsc + vite; demo code is not in this bundle)\nactions pinned to a commit SHA, persist-credentials: false, permissions: contents: read\nDependabot: npm /api, npm /web, github-actions, monthly, grouped\n-- docs/00 rule 4: no tests in the repo for now; PRs list the checks run with throwaway scripts",
        },
        marks: ["job api", "job web", "SHA", "Dependabot", "rule 4"],
      },
    },
    {
      id: "deploy",
      kind: "case",
      nodes: { proxy: { kind: "lb", at: [4, 4] } },
      edges: {
        panel: null,
        viaedge: { from: "web", to: "proxy", rate: 2, mode: "call" },
        toapi: { from: "proxy", to: "api", rate: 2, mode: "call" },
        ship: { from: "code", to: "proxy", rate: 1 },
      },
      focus: ["code", "proxy", "api", "db"],
      exchange: {
        edge: "ship",
        request: {
          format: "text",
          head: "bash deploy/deploy.sh <ssh-host> /opt/operobot2",
          body: "REVISION=$(git rev-parse --short HEAD)   (+ -dirty if the tree has changes)\n(cd web && npm ci && npm run build)      echo $REVISION > web/dist/REVISION\ntar api/src api/sql Dockerfile compose Caddyfile | ssh host 'tar -x'\ntar web/dist | ssh host 'dist.new -> rsync --delete -> dist'\nssh host 'docker compose up -d --build --remove-orphans'\n-- operobot2-db (postgres:17-alpine, 300m) | operobot2-api (Node 24, 256m) | operobot2-web (caddy:2-alpine, 64m)\n-- TLS ends at the shared edge proxy of dtwin.uz; operobot2-web joins the edge network, no public port",
        },
        marks: ["REVISION", "rsync", "--remove-orphans", "operobot2-web", "no public port"],
      },
    },
    {
      id: "demo",
      kind: "case",
      nodes: { demo: { kind: "storage", at: [0, 8] } },
      edges: { pages: { from: "code", to: "demo", rate: 1 } },
      metrics: { smoke: 17 },
      focus: ["code", "demo", "web"],
      exchange: {
        edge: "pages",
        request: {
          format: "text",
          head: "two demos: a live sandbox per visitor, and a static build with no backend",
          body: "live     POST /api/auth/demo: own org \"Namuna Servis\" (Pro), 10 per IP per hour, deleted after 24 h\n         simulator: a new customer message about every 25 s while the panel is open\nstatic   npm run build:demo -> dist-demo/, base /demo/operobot2/, the same panel\n         /api and SSE answered from web/src/mock: 48 contacts, 34 leads, 120+ calls\n         mock code loads only in --mode demo (dynamic import); npm run build has none of it\nchecks   npm run test:demo: Playwright, 17 smoke tests | npm run site:screenshots: 17 JPEGs",
        },
        marks: ["live", "24 h", "static", "web/src/mock", "--mode demo", "17 smoke tests"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "shared-ip",
      from: "deploy",
      steps: [
        {
          id: "ip-lost",
          kind: "problem",
          edges: { toapi: { flow: "fail" } },
          metrics: { shared: 100 },
          focus: ["web", "proxy", "api"],
          exchange: {
            edge: "toapi",
            request: {
              format: "text",
              head: "visitor 203.0.113.5 -> edge Caddy -> operobot2-web Caddy -> API (trustProxy)",
              body: "edge Caddy          X-Forwarded-For: 203.0.113.5\noperobot2-web Caddy the edge is not a trusted proxy: the header is replaced\nAPI                 req.ip = the edge container's address, for every visitor\nrate limit          demo: 10 per IP per hour -> 10 per hour for the whole world\n-- the 11th visitor of the hour gets 429",
            },
            marks: ["X-Forwarded-For", "not a trusted proxy", "req.ip", "10 per hour", "429"],
          },
        },
        {
          id: "ip-fix",
          kind: "fix",
          edges: { toapi: { flow: "request" } },
          metrics: { shared: 0 },
          focus: ["proxy", "api"],
          exchange: {
            edge: "toapi",
            request: {
              format: "text",
              head: "PR #18  deploy/Caddyfile, global options",
              body: "{\n\tadmin off\n\tauto_https off\n\tservers {\n\t\ttrusted_proxies static private_ranges\n\t}\n}\n-- the edge sits on the private Docker network, so its X-Forwarded-For is kept\n-- same PR: .gitattributes forces LF, a Windows checkout had broken deploy.sh with CRLF",
            },
            marks: ["trusted_proxies", "private_ranges", "LF"],
          },
        },
      ],
    },
    {
      id: "campaign-safety",
      from: "calls",
      steps: [
        {
          id: "camp-bugs",
          kind: "problem",
          edges: { originate: { flow: "dup", rate: 3 } },
          metrics: { lines: 3 },
          focus: ["api", "dialer"],
          exchange: {
            edge: "originate",
            request: {
              format: "text",
              head: "v0.1 campaign runner, read before any real dialing (PR #21)",
              body: "the line was freed as soon as the dialer accepted, and the runner ticks every 3 s\n  -> a new call every 3 s: 3 calls in 7 s on a campaign meant to have 1 line\na repeated result added the minutes again\nno result ever: the campaign stayed running forever\na dialer error or a wrong token marked every number failed: the list burns\nno block list, no consent check, Sundays and holidays not checked",
            },
            marks: ["every 3 s", "3 calls in 7 s", "repeated result", "list burns", "consent"],
          },
        },
        {
          id: "camp-fix",
          kind: "fix",
          edges: { originate: { flow: "request", rate: 1 } },
          metrics: { lines: 1 },
          focus: ["api", "dialer", "db"],
          exchange: {
            edge: "originate",
            request: {
              format: "sql",
              head: "-- claimNext(): one line per campaign",
              body: "SELECT 1 FROM calls WHERE campaign_id = $1 AND status = 'dialing' LIMIT 1;  -- busy: wait\n-- a result changes only an open call; no result in 30 min: failed\n-- only 400 and 422 refuse a number; anything else: queued again, retry in 15 s, same callId\n-- \"2\" pressed -> the number joins the org's block list; queued ones become blocked\n-- a real campaign needs consent: consent_by, consent_at saved; Sundays and HOLIDAYS skipped",
            },
            marks: ["dialing", "30 min", "15 s", "block list", "consent_at"],
          },
        },
      ],
    },
    {
      id: "plan-forever",
      from: "billing",
      steps: [
        {
          id: "plan-stuck",
          kind: "problem",
          metrics: { expired: 100 },
          focus: ["pay", "api", "db"],
          exchange: {
            edge: "merchant",
            request: {
              format: "json",
              head: "POST /api/pay/payme HTTP/1.1   (Payme refunds a performed payment)",
              headers: [["Authorization", "***"]],
              body: `{
  "id": 7,
  "method": "CancelTransaction",
  "params": { "id": "64f1c0a2e1", "reason": 5 }
}`,
            },
            response: {
              format: "text",
              head: "v0.1 billing, before PR #23",
              body: "refund        the transaction was cancelled, the org stayed on the paid plan\nplan_until    written on payment, read nowhere: a paid plan never ended\nplan change   the time left on a cheap yearly plan moved to the expensive one\nClick         a payment link existed, but nothing confirmed the payment",
            },
            marks: ["Authorization", "method", "refund", "plan_until", "plan change"],
            masked: ["Authorization"],
          },
        },
        {
          id: "plan-fix",
          kind: "fix",
          metrics: { expired: 0 },
          focus: ["api", "db", "pay"],
          exchange: {
            edge: "merchant",
            request: {
              format: "sql",
              head: "-- PR #23, billing/pay.ts",
              body: "-- every hour, as SYSTEM:\nUPDATE orgs SET plan = 'start', plan_until = NULL WHERE plan_until < now() AND NOT demo;\n-- payment: the same plan extends from its end date, another plan starts today\n-- the invoice keeps prev_plan and prev_plan_until for a refund\n-- refund: UPDATE orgs SET plan = prev_plan, plan_until = prev_plan_until  (if no later payment)\n--         a later payment exists: only this payment's months are taken off\n-- POST /api/pay/click: Prepare and Complete with an md5 signature",
            },
            marks: ["every hour", "NOT demo", "prev_plan", "refund", "md5"],
          },
        },
      ],
    },
  ],
});
