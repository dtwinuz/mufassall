import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Project: operobot2",
  summary:
    "operobot2 is a multi-tenant AI sales and call-center service for small and mid-size businesses in Uzbekistan. Messages from Telegram, WhatsApp, Instagram, SMS and a website widget land in one inbox; an AI agent answers around the clock, picks out a phone number or a meeting time and hands the chat to a person when asked; every conversation becomes a lead on a 6-stage board; outbound call campaigns run only inside the legal 09:00-18:00 window. The lesson follows the user journeys, then the technical side: one PostgreSQL database with row level security per organisation, sealed channel tokens, live updates over SSE, the bridge to a telephony dialer, payments and an MCP endpoint, and finally CI, deploy and the two demos.",
  learn: [
    "The user side: the demo sandbox, the shared inbox, the AI agent with handoff, the CRM board and outbound campaigns with consent and a block list",
    "How one database serves many companies safely: org_id on every tenant table, FORCE ROW LEVEL SECURITY and a non-superuser app role",
    "Why channel tokens are sealed with AES-256-GCM inside the API with the org id as authenticated data, and not with pgcrypto",
    "How the campaign runner talks to the dialer: one line per campaign, retry semantics by status code, duplicate results ignored",
    "The pipeline as it is: CI = typecheck and build by an explicit rule, deploy.sh with Docker Compose behind the shared edge proxy, a live and a static demo",
  ],
  nodes: {
    customer: "Customer",
    channels: "5 channels",
    api: "API (Fastify)",
    web: "Panel (React)",
    operator: "Operator",
    ai: "AI agent",
    db: "PostgreSQL",
    dialer: "operobot dialer",
    pay: "Payme / Click",
    claude: "Claude (MCP)",
    code: "main branch",
    ci: "GitHub Actions",
    proxy: "Edge + Caddy",
    demo: "Static demo",
  },
  metrics: {
    foreign: "Other orgs' rows a query can see",
    plain: "Channel tokens stored in plain text",
    shared: "Demo limit shared by all visitors",
    lines: "Parallel calls per campaign",
    smoke: "Demo smoke tests",
    expired: "Paid plans running past their end date",
  },
  steps: {
    intro: {
      short: "What it is",
      title: "An AI sales desk for businesses in Uzbekistan",
      body: "A small business answers customers in five places at once: a Telegram bot, WhatsApp, Instagram, SMS and a chat on its website. operobot2 puts all of them into one panel with an AI agent, a CRM board, outbound calls, plans and payments. It is the multi-tenant successor of the team's older single-company product `operobot`, whose telephony dialer it reuses over HTTP; the code was not copied (ADR-0001).\n\nThe fastest way in is the demo button on operobot2.dtwin.uz. It calls `POST /api/auth/demo`, which creates a separate sandbox organisation for this visitor, \"Namuna Servis\" on the Pro plan, with sample channels, operators, agents, conversations, leads and a campaign. Other visitors never see it, and it is deleted after 24 hours.",
      fields: {
        "Set-Cookie": "The session cookie `ob2_sid`: httpOnly, SameSite=Lax, Secure over HTTPS, 30 days. Masked here.",
        org: "Every request works inside the current organisation; the database enforces it too.",
        plan: "Pro in the demo, so every feature is visible.",
        demo: "Demo orgs get simulated calls and payments; nothing reaches a phone network or a payment provider.",
        role: "owner, admin or operator. Owners and admins manage the team, plans and keys.",
      },
    },
    inbox: {
      short: "Inbox",
      title: "A customer writes: the message lands in the inbox",
      body: "When a customer writes to the company's Telegram bot, Telegram calls the webhook. The URL contains a random 24-character secret per channel, so only someone who knows it can post messages. The API finds or creates the contact, opens a conversation, creates a lead in the \"Yangi\" (new) stage, stores the message and pushes it to every open panel at once.\n\nOperators filter the list (all, unread, mine, AI), search, assign a conversation to someone and see the contact and lead cards next to the chat. A repeated webhook with the same message id is ignored, so Telegram's retries never create duplicates.",
      fields: {
        message_id: "Used to drop repeated webhooks: the same id is stored once.",
        from: "Becomes the contact: name and username, found again by the channel's own id.",
        chat: "Where the reply goes; the adapter sends it with sendMessage.",
        text: "Stored as an inbound message and passed to the AI agent.",
        ok: "Telegram only needs a 2xx; the work after that does not keep it waiting.",
      },
    },
    ai: {
      short: "AI agent",
      title: "The AI agent answers, extracts data and knows when to hand off",
      body: "The agent gets the last 20 messages, the company's instructions, a greeting and a list of handoff words. It returns one shape: `{reply, action, extracted}`. The action is reply, handoff (the conversation switches to human mode and an operator takes it) or close. Extracted data updates the lead: name, phone, interest, a meeting time, the stage and a one-line summary.\n\nWith `LLM_URL` set, the API calls any OpenAI-compatible chat endpoint and asks for JSON. Without it, or when the model fails, a rule-based Uzbek responder with the same output shape takes over, so the product works offline and in the demo. Here it reads \"ertaga soat 11\" (tomorrow at 11) as a Tashkent time and books it. Each AI reply counts against the plan; when the limit runs out, the chat goes to an operator with a system note.",
      check: {
        q: "The LLM provider is down for an hour. What do customers get?",
        options: [
          "No answers until it is back",
          "Answers from the rule-based responder, which returns the same shape: reply, action, extracted",
          "Every conversation goes to an operator at once",
        ],
        answer: 1,
        why: "`decide` falls back to `ruleDecide` when there is no LLM_URL or the call fails. Because the shape is the same, the lead and handoff logic downstream does not change.",
      },
      fields: {
        text: "The test chat on the Agents page sends one customer line to the same brain.",
        reply: "The text sent back through the customer's channel.",
        action: "reply, handoff or close; handoff flips the conversation to human mode.",
        meeting: "Tashkent 11:00 stored as UTC 06:00.",
        stage: "Moves the lead on the board, here to Uchrashuv (meeting).",
      },
    },
    board: {
      short: "CRM board",
      title: "Every conversation becomes a lead on a 6-stage board",
      body: "The board has six stages: Yangi (new), Qiziqdi (interested), Uchrashuv (meeting), Qayta bog'lanish (call back), Yutildi (won) and Yutqazildi (lost). Leads arrive from conversations and calls on their own; the AI sets the stage, interest and next step, and operators drag cards or edit them. A lead keeps its source channel and a link to its conversation, so one click shows the whole history.\n\nThe contact card gathers every lead, conversation and call of one person. All demo phone numbers use `+998 00`, a range no real subscriber has, by a project rule: the demo must look real without pretending to be real.",
      fields: {
        stageId: "One of the six stages of this organisation.",
        interest: "yuqori, o'rta or past (high, medium, low); set by the AI or by hand.",
        nextAction: "What the operator promised to do next, shown on the card.",
        source: "telegram, whatsapp, instagram, sms, widget, manual or call.",
        conversationId: "Opens the chat this lead came from.",
      },
    },
    calls: {
      short: "Campaigns",
      title: "Outbound campaigns: the law is in the code",
      body: "A campaign is a list of phone numbers plus an optional voice agent. The numbers are normalised to `+998 XX XXX XX XX` and de-duplicated. A real (non-demo) campaign cannot be created without confirming that the people on the list gave consent; who confirmed and when is stored. During the call the customer presses \"1\" to reach an operator or \"2\" to refuse, which puts the number on the organisation's block list.\n\nAdvertising calls in Uzbekistan are allowed only from 09:00 to 18:00 (from 2026-11-01). `callWindowOpen` enforces it: the hour must be inside both that window and the organisation's working hours, Tashkent time, never on Sundays, fixed public holidays or the dates in `HOLIDAYS`. A real organisation cannot switch it off; only demo orgs skip it, because their calls are simulated.",
      check: {
        q: "An organisation sets its working hours to 07:00-21:00. When can a real campaign dial?",
        options: [
          "07:00-21:00, the organisation decides",
          "09:00-18:00 Tashkent time on working days: the code takes the narrower of the two windows",
          "Any time, if consent was confirmed",
        ],
        answer: 1,
        why: "The window is max(9, work_from) to min(18, work_to). Organisation settings can narrow the legal window but never widen it.",
      },
      fields: {
        agentId: "The voice agent whose script the dialer plays.",
        phones: "Normalised and de-duplicated; numbers on the block list are not added.",
        consent: "Required for real organisations; saved as consent_by and consent_at.",
        status: "draft until started; then running, paused or done.",
      },
    },
    arch: {
      short: "Architecture",
      title: "Architecture: one API, one database, live updates over SSE",
      body: "Three parts. `web` is a React 19 + Vite single-page app with its own hash router, no UI library, in Uzbek, Russian and English. `api` is Fastify 5 with plain SQL through `pg` and zod for input: no ORM, so the queries that RLS and the reports depend on stay visible (ADR-0003). PostgreSQL 17 holds everything.\n\nLive updates use Server-Sent Events: `GET /api/events` keeps one stream per open panel, and the API pushes message, conversation, lead, call, campaign and usage events. SSE is simpler than WebSockets and passes through Caddy without extra setup. The subscriber list lives in memory, so v0.1 runs a single API instance; the documented next step for more instances is Postgres `LISTEN/NOTIFY`, and a `select ... for update skip locked` queue for campaigns.",
      fields: {
        "text/event-stream": "A plain HTTP response that never ends; Caddy must not buffer or compress it.",
        message: "A new inbound or outbound message for a conversation.",
        lead: "A lead created or moved, so the board updates without a reload.",
        usage: "The plan counters, shown live on the billing page.",
        "LISTEN/NOTIFY": "How events would cross between several API instances.",
      },
    },
    rls: {
      short: "Tenancy",
      title: "Tenancy: one database, org_id, and row level security",
      body: "The choice in ADR-0002: one database and one schema, with `org_id` on every tenant table, instead of a database or a schema per customer. Small customers are many, and a database each is expensive. But relying on `WHERE org_id = ...` alone is dangerous: one forgotten filter shows one company's customers to another.\n\nSo PostgreSQL enforces it. Every tenant table has RLS enabled and forced, with a policy that compares `org_id` with the transaction setting `app.org_id`. The app connects and switches to the role `ob2_app`, which is not a superuser and cannot bypass RLS. Every query runs inside `tx(orgId, fn)`, which sets the value for that transaction only. System work (auth, webhooks, cleanup) must pass `SYSTEM` explicitly, which is visible in code review. Local proof: as `ob2_app` with no org set, `select count(*) from leads` returns 0.",
      check: {
        q: "A developer forgets the org filter in a new report query. What does a customer see?",
        options: [
          "Rows of every organisation",
          "Only their own rows: the policy filters by app.org_id whatever the query says",
          "An SQL error",
        ],
        answer: 1,
        why: "FORCE ROW LEVEL SECURITY applies the policy even to the table owner, and the app role can't bypass it. The bug costs nothing but a slower query plan.",
      },
      fields: {
        ob2_app: "The role every pooled connection switches to; RLS applies to it.",
        "app.org_id": "Set with set_config(..., true): local to the transaction, gone at COMMIT.",
        "no WHERE": "The query may forget the filter; the policy does not.",
        FORCE: "Without FORCE, the table owner would bypass the policy.",
        tenant: "One policy per table, for reads (USING) and writes (WITH CHECK).",
      },
    },
    secrets: {
      short: "Tokens",
      title: "Channel tokens are sealed before they reach the database",
      body: "Bot and API tokens of Telegram, WhatsApp, Instagram and the SMS gateway used to sit in the database in plain text: a leaked backup would leak every customer's channels. PR #20 seals `channels.config` with AES-256-GCM inside the API process. The key is `CHANNEL_KEY` in the server's `.env`, kept apart from database backups.\n\nWhy not `pgcrypto`: there the key travels as an SQL parameter into the database, where logs or `pg_stat_activity` can catch it. The org id is the authenticated data, so a sealed blob copied into another organisation's row does not open. At startup the API seals old plain rows and proves every sealed row opens; with a wrong key it refuses to start. The PR states the limits too: no key rotation yet, and a fully compromised server exposes the key as well.",
      check: {
        q: "Someone copies a sealed config blob from organisation A's channel row into organisation B's row. What happens?",
        options: [
          "B can now use A's bot",
          "Decryption fails: the org id is the GCM authenticated data, and the API refuses to start",
          "Nothing, the API ignores the row",
        ],
        answer: 1,
        why: "GCM checks the authentication tag over the ciphertext and the AAD. A different org id means a failed tag; the startup check turns that into one clear error.",
      },
      fields: {
        enc: "Format version: 1 = sealed. Rows without it are old plain rows, sealed at startup.",
        iv: "A random 12-byte nonce per seal. Masked here.",
        tag: "The GCM authentication tag. Masked here.",
        data: "The ciphertext of the JSON config. Masked here.",
        AAD: "Authenticated, not encrypted: binds the blob to its organisation.",
        "409": "Without a key the API will not store a token at all.",
      },
    },
    bridge: {
      short: "Dialer",
      title: "The HTTP bridge to the telephony dialer",
      body: "operobot2 does not dial itself. For real organisations it calls the dialer of the older `operobot` (Asterisk ARI) with `POST /originate`, passing a `callId`, the phone and a callback URL that carries a per-organisation random secret. The dialer later posts the result: connected, operator_busy (pressed 1 but no operator was free, the hottest lead, so it opens in \"call back\" with high interest), answered, declined, no_answer, busy or failed.\n\nThe status code decides what happens to the number: 2xx means wait; only 400 and 422 refuse the number; anything else (no answer, 5xx, 401, 404, 409, 429) puts it back in the queue and retries in 15 seconds with the same `callId`, so the dialer must recognise repeats. The bridge was tested against the real dialer code and a fake Asterisk: a 12-number campaign ran to done.",
      check: {
        q: "The dialer answers 401 because the token was rotated. What happens to the queued numbers?",
        options: [
          "All are marked failed",
          "They stay queued and are retried every 15 s: a 401 says nothing about the numbers",
          "The campaign is deleted",
        ],
        answer: 1,
        why: "Before PR #21 one bad setting burned the whole list. Now only 400 and 422, which are about the number itself, mark it failed.",
      },
      fields: {
        callId: "Idempotency key across retries and results.",
        callback: "Contains `<org>.<hook secret>`: unguessable and tied to one organisation.",
        operator_busy: "Added in PR #22: the customer wanted a person; the lead goes to call back.",
        "422": "With 400, the only answers that refuse a number.",
        "15 s": "Retry delay for any temporary failure.",
        "30 min": "A call with no result after this is closed as failed.",
      },
    },
    billing: {
      short: "Billing",
      title: "Plans, limits and payments",
      body: "Four plans live in `billing/plans.ts`: Start (free), Biznes, Pro and Korporativ, with monthly limits on operators, channels, messages, AI replies and call minutes. The prices are marked as samples until the owners decide. A limit that runs out returns HTTP 402; the AI hands chats to operators and campaigns pause.\n\nCheckout creates a pending invoice and a payment link. Payme then calls the Merchant API over JSON-RPC (CheckPerformTransaction, CreateTransaction, PerformTransaction, Cancel...), authenticated with Basic auth compared in constant time. Click uses its SHOP API with an md5 signature. An hourly check returns expired organisations to Start, and a Payme refund restores the previous plan and date. Both providers were tested locally, not yet in their official test environments; STATUS.md says so.",
      fields: {
        Authorization: "Basic auth with the merchant key, compared with timingSafeEqual. Masked here.",
        method: "One of Payme's Merchant API methods; PerformTransaction marks the invoice paid.",
        state: "2 = performed: the plan and its end date are switched on.",
      },
    },
    mcp: {
      short: "MCP",
      title: "AI assistants can read the board and act",
      body: "`POST /api/mcp` is a Model Context Protocol endpoint (JSON-RPC). An owner creates an API key in Settings; it is shown once and only its sha256 is stored. Claude Desktop or Claude Code adds it as a custom connector.\n\nSix tools, named in Uzbek: list leads, update a lead, list conversations, read a conversation, send a message through the customer's channel, and today's statistics. The key belongs to one organisation, so the same RLS rules apply to everything an assistant does.",
      fields: {
        Authorization: "Bearer with the org API key. Masked here.",
        method: "tools/call: the MCP method that runs one tool.",
        name: "The tool; arguments follow its input schema (here a stage filter).",
        sha256: "Only the hash is kept, so a database leak does not leak keys.",
      },
    },
    ci: {
      short: "CI",
      title: "CI: typecheck and build, by an explicit rule",
      body: "The workflow has two jobs, `api` and `web`, each `npm ci` and `npm run build` (TypeScript check plus build). There are no tests in the repo, and that is a written rule (docs/00, rule 4), shared with the older operobot: tests come when the project grows. Instead, every PR lists what was checked and how, with throwaway scripts against a real API and a temporary PostgreSQL 17, and what was NOT checked.\n\nThe usual org hardening applies: actions pinned to a commit SHA, `persist-credentials: false`, read-only permissions, Dependabot monthly and grouped for both npm folders and the actions. The static demo adds a Playwright smoke suite, see the demo step.",
      check: {
        q: "What protects the API from a regression in the RLS setup, given there are no tests?",
        options: [
          "Nothing at all",
          "The database itself: RLS is enforced by PostgreSQL, and PRs record manual checks such as the count-as-ob2_app proof",
          "The TypeScript compiler",
        ],
        answer: 1,
        why: "Moving the rule into the database means a missed filter can't leak data even without a test. The PR descriptions document how isolation was verified.",
      },
      fields: {
        "job api": "Fastify API: tsc and build.",
        "job web": "React panel: tsc and Vite build; mock code is not included.",
        SHA: "A moved tag cannot change what the workflow runs.",
        Dependabot: "Monthly, grouped: one PR per folder.",
        "rule 4": "\"No tests for now\": stated in the docs, not an accident.",
      },
    },
    deploy: {
      short: "Deploy",
      title: "Deploy: one script, three containers, behind the edge proxy",
      body: "`deploy/deploy.sh` builds the panel locally, writes the commit hash to `dist/REVISION`, ships the API sources, SQL migrations, compose file and Caddyfile over SSH, swaps in the new `dist` with `rsync --delete`, and runs `docker compose up -d --build`. Migrations are plain `NNN_*.sql` files applied once each when the API starts. The stack is three containers with memory limits: PostgreSQL 17, the API on Node 24 and a Caddy that serves the panel and proxies `/api/*` with buffering off for SSE.\n\nTLS ends at the shared edge proxy of dtwin.uz, which routes operobot2.dtwin.uz to the web container over a Docker network; the container has no public port. A rollback is a deploy from the previous commit; the stack keeps the database volume. The live demo has run there since 2026-11-05; production waits for a server in Uzbekistan, because personal data of Uzbek citizens must stay in the country (law ZRU-547).",
      fields: {
        REVISION: "The deployed commit, readable on the server: which code is live.",
        rsync: "The new files land beside the old ones, then replace them in one pass.",
        "--remove-orphans": "Containers removed from the compose file do not linger.",
        "operobot2-web": "Caddy: static panel plus /api proxy with flush_interval -1.",
        "no public port": "Only the edge reaches it, so the client IP comes from the edge's header.",
      },
    },
    demo: {
      short: "Demos",
      title: "Two demos: a live sandbox and a static build",
      body: "The live demo is the real product: each visitor gets a sandbox organisation (10 per IP per hour, deleted after 24 hours), and while the panel is open a simulator writes as a new customer about every 25 seconds, the AI answers and leads move, all live over SSE. The website widget works for real even there.\n\nThe static demo follows the team's demo standard: the same panel built with `--mode demo`, where `/api` and SSE are answered in the browser from `web/src/mock` (48 contacts, 30+ conversations, 34 leads, 120+ calls), times relative to now, changes reset on reload, a demo badge in the corner. The mock is a dynamic import used only in demo mode, so the production bundle has none of it. A Playwright suite of 17 smoke tests opens it, and a script takes the 17 README screenshots.",
      fields: {
        live: "The real API with a throwaway organisation per visitor.",
        "24 h": "The sandbox and everything in it are deleted by cascade.",
        static: "No backend at all: it can live on any static host.",
        "web/src/mock": "The in-browser API, a few kilobytes of realistic data.",
        "--mode demo": "The only build that includes the mock.",
        "17 smoke tests": "npm run test:demo; screenshots are regenerated, never taken by hand.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "What operobot2 shows.\n\n1) One inbox for five channels with webhook URLs that carry a secret, and duplicates dropped by message id. 2) An AI agent with one output shape and a rule-based fallback, so the product works without a model. 3) Multi-tenancy in the database: org_id, FORCE ROW LEVEL SECURITY and a non-superuser role, so a forgotten WHERE can't leak. 4) Secrets sealed in the application with the tenant id as authenticated data. 5) Laws as code: a call window the organisation can only narrow, consent stored with who and when, a block list. 6) External calls with clear retry rules by status code and an idempotent callId. 7) A deliberately small pipeline: typecheck and build, honest PR notes about what was and was not tested, one deploy script behind a shared edge proxy. 8) Two demos, a live sandbox and a static build, both from the same code.",
    },
  },
  scenarios: {
    "shared-ip": {
      label: "Shared IP",
      steps: {
        "ip-lost": {
          short: "One IP",
          title: "Behind two proxies, every visitor looks the same",
          body: "On the server, the API saw every visitor with one IP: the edge container's. The edge sets `X-Forwarded-For` correctly, but the inner Caddy did not trust it, so it replaced the header with the address it saw. The API's rate limits are per IP, and the demo allows 10 sandboxes per IP per hour; in effect that became 10 per hour for the whole world, and the 11th visitor got 429.",
          check: {
            q: "Where is the real fix?",
            options: [
              "Raise the demo limit to 1000",
              "Make the inner Caddy trust the private network the edge is on, so it keeps X-Forwarded-For",
              "Expose the API port directly to the internet",
            ],
            answer: 1,
            why: "The header was right at the edge and lost one hop later. Trusting private ranges restores it without trusting anything from the internet.",
          },
          fields: {
            "X-Forwarded-For": "Set by the edge with the visitor's real address.",
            "not a trusted proxy": "Caddy ignores forwarding headers from proxies it does not trust.",
            "req.ip": "The address every limit is keyed by.",
            "10 per hour": "A per-IP limit applied to one shared IP.",
            "429": "Too Many Requests, for the 11th visitor of the hour.",
          },
        },
        "ip-fix": {
          short: "Trust LAN",
          title: "Trust the private network, keep LF endings",
          body: "PR #18 added four lines to the global options of the inner Caddyfile: `trusted_proxies static private_ranges`. The edge reaches the web container over a private Docker network, so its header is now kept, and each visitor has their own limit again. The same PR added `.gitattributes` with LF line endings: a checkout on Windows had turned `deploy.sh` into CRLF and broken it on the server.",
          fields: {
            trusted_proxies: "Which upstream proxies may set the client address.",
            private_ranges: "Caddy's shortcut for the private IPv4 and IPv6 ranges.",
            LF: "Shell scripts must keep Unix line endings to run on Linux.",
          },
        },
      },
    },
    "campaign-safety": {
      label: "Campaign bugs",
      steps: {
        "camp-bugs": {
          short: "Too many calls",
          title: "Reading the code before real dialing finds serious bugs",
          body: "Before connecting a real dialer, a review of the campaign runner found that v0.1 would misbehave. The line was freed as soon as the dialer accepted a call, and the runner ticks every 3 seconds, so a campaign meant to have one line would start a new call every 3 seconds. A repeated result added the minutes again. A campaign with a lost result stayed running forever. A dialer error or a wrong token marked every number failed. And the block list and the consent check did not exist at all, although a document claimed a warning in the panel.",
          check: {
            q: "Which of these bugs could cost real money first?",
            options: [
              "The extra calls and the double-counted minutes",
              "The missing dark theme",
              "The campaign list sort order",
            ],
            answer: 0,
            why: "Parallel calls hit the SIP trunk and the customer's patience; double-counted minutes burn the plan's limit. Both would show up on the first real campaign.",
          },
          fields: {
            "every 3 s": "The runner's tick: with the line freed early, each tick started a call.",
            "3 calls in 7 s": "At 0, 3 and 6 seconds, where one was intended.",
            "repeated result": "A retried webhook counted twice.",
            "list burns": "One configuration error turned the whole list into failed.",
            consent: "Required by law and by the docs, but missing in the code.",
          },
        },
        "camp-fix": {
          short: "One line",
          title: "One line, idempotent results, consent and a block list",
          body: "PR #21: `claimNext` starts a call only if no call of that campaign is dialing; a result changes only an open call; a call with no result in 30 minutes is failed. Only 400 and 422 refuse a number; anything else re-queues it and retries in 15 seconds with the same `callId`. Pressing \"2\" adds the number to the organisation's block list, and queued calls to it become blocked. A real campaign needs a consent confirmation, stored with who and when. Sundays, fixed holidays and `HOLIDAYS` are skipped. The PR lists its checks: one call over 7 seconds, repeats not counted, 503/401/404/409 re-queued, 422 failed, and what was not tested yet.",
          fields: {
            dialing: "At most one call per campaign in this state.",
            "30 min": "A stuck call is closed so the campaign can continue.",
            "15 s": "Retry delay after a temporary dialer failure.",
            "block list": "Per organisation, by number; also editable from the contact card.",
            consent_at: "With consent_by: the record of who confirmed consent for the list.",
          },
        },
      },
    },
    "plan-forever": {
      label: "Plans that never end",
      steps: {
        "plan-stuck": {
          short: "Never ends",
          title: "A paid plan never ended, and a refund kept it on",
          body: "Before PR #23, billing had three holes. The end date `plan_until` was written on payment but read nowhere, so a paid plan stayed on forever. When an organisation switched plans, the time left on the old plan moved to the new one, so a cheap year could become an expensive year. And when Payme refunded a payment, the transaction was cancelled but the plan stayed on. Click had a payment link but no path that confirmed the payment.",
          check: {
            q: "Which piece of data must the invoice keep so a refund can be undone correctly?",
            options: [
              "The customer's phone number",
              "The plan and end date the organisation had before this payment",
              "The Payme transaction amount only",
            ],
            answer: 1,
            why: "Undoing a payment means going back to the state before it. Without the previous plan and date, a refund can only guess, or leave the paid plan on.",
          },
          fields: {
            Authorization: "Payme's Basic auth. Masked here.",
            method: "CancelTransaction on a performed payment means a refund.",
            refund: "Money back, but in v0.1 the plan stayed.",
            plan_until: "The end date: stored, never checked.",
            "plan change": "Remaining time carried over to a different plan.",
          },
        },
        "plan-fix": {
          short: "Hourly check",
          title: "An hourly expiry check, and a refund that restores the previous plan",
          body: "PR #23: an hourly job returns every expired non-demo organisation to Start. Paying for the same plan extends it from its end date; another plan starts today, and the old plan's remaining time is lost (written in the PR as an owner decision). Each invoice remembers the previous plan and end date, so a Payme refund restores them; if a later payment exists, only this payment's months are taken off. Click gets Prepare and Complete with an md5 signature. Checked locally with scripts; Payme and Click sandboxes still pending.",
          fields: {
            "every hour": "The expiry job; demo orgs are left alone.",
            "NOT demo": "Demo sandboxes keep Pro until they are deleted.",
            prev_plan: "Saved on the invoice at payment time, with prev_plan_until.",
            refund: "Goes back to the saved state, or trims only this payment's months.",
            md5: "Click's SHOP API signature, from Click's official integration code.",
          },
        },
      },
    },
  },
};

export default text;
