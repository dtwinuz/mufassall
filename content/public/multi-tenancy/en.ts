import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Multi-tenancy",
  summary:
    "A B2B invoicing service keeps 1 200 customer companies in one database. One forgotten `WHERE tenant_id` leaks invoices, one big customer's export slows everyone, and one migration can break them all at once. The fixes: isolation enforced by the database, a tenant taken only from the token, per-tenant quotas, a silo for the big tenant behind a routing catalog, per-tenant keys and migrations in waves.",
  learn: [
    "Why a `tenant_id` filter in application code leaks, and how row-level security with a per-transaction tenant context stops it",
    "Where the tenant must come from: the signed token, never a header or URL the client controls",
    "Noisy neighbours: per-tenant quotas, 429 with limit headers, heavy work in a queue",
    "Pool, silo and bridge, tenant routing, per-tenant keys and migrations rolled out in waves",
  ],
  nodes: {
    ta: "Small tenant",
    tb: "Large tenant",
    api: "Invoicing API",
    db: "Shared DB",
    exporter: "Export worker",
    catalog: "Tenant catalog",
    db900: "Silo DB",
    kms: "Key service",
    migrator: "Migration runner",
  },
  metrics: {
    leaked: "Rows leaked",
    p99: "API p99",
    blast: "Hit by one change",
  },
  steps: {
    shared: {
      short: "Pool",
      title: "1 200 companies, one database",
      body: "An invoicing SaaS sells to companies. Each customer company is a **tenant**. All of them live in one database: every table has a `tenant_id` column and every query filters by it.\n\nThis is the **pool** model: cheap, one schema to migrate, one place to back up. Isolation exists only as long as every query remembers its filter.",
      fields: {
        tenant_id: "Which company owns the row. Every query must filter by it.",
        "one table": "Invoices of all tenants sit side by side in the same table.",
        "3 rows": "Correct: t_17 sees only its own three open invoices.",
      },
    },
    leak: {
      short: "Leak",
      title: "One forgotten filter, 37 companies in one CSV",
      body: "A developer adds an \"overdue invoices\" report for t_900. The query filters by date and status and forgets the tenant. The CSV that t_900 downloads holds 1 840 invoices of 37 companies.\n\nCode review missed it because the query looks right: nothing in it is wrong, something is missing. With hundreds of queries, one of them will forget sooner or later.",
      watch: "A cross-tenant leak is a security incident with a notification duty, not a bug ticket.",
      check: {
        q: "What makes the next forgotten filter harmless?",
        options: [
          "A lint rule that looks for `tenant_id` in every SQL string",
          "The database itself hides other tenants' rows, using a tenant set for each request",
          "Give every tenant its own copy of the application",
        ],
        answer: 1,
        why: "A lint rule only checks text and misses joins, views and ORM queries. Row-level security applies to every query on the table, written or generated. A copy of the app per tenant isolates too, but costs 1 200 deployments.",
      },
      fields: {
        tenant_id: "Selected, but not filtered on.",
        forgot: "The missing condition. Nothing fails, rows of every tenant match.",
        "1840 rows": "The query returns invoices of the whole database that match the date.",
        "37 tenants": "Thirty-six other companies whose data just left the building.",
      },
    },
    rls: {
      short: "RLS",
      title: "Row-level security: the database filters",
      body: "A policy on the table adds `tenant_id = current tenant` to every query, even one that forgets it. The API opens a transaction, sets `app.tenant_id` and runs its queries as before.\n\n`SET LOCAL` lives only until the end of the transaction. A plain `SET` would stay on the pooled connection and the next request, from another tenant, would inherit it.",
      watch: "The app must connect as a role without `BYPASSRLS` and not as the table owner, or the policy is skipped.",
      fields: {
        "ROW LEVEL SECURITY": "Turns policies on for this table.",
        FORCE: "The policy also applies to the table owner, the usual app role in small setups.",
        "CREATE POLICY": "One rule for the whole table, written once in a migration.",
        USING: "The condition added to every read: a row is visible only for the current tenant.",
        "SET LOCAL": "The tenant for this transaction only. Gone at `COMMIT`, safe with a connection pool.",
        "312 rows": "The same report query, now only t_900's own invoices.",
      },
    },
    spoof: {
      short: "Spoof",
      title: "The tenant came from a header the user controls",
      body: "The API took the tenant from an `X-Tenant-Id` header sent by the web app. A user of t_900 changes it to `t_17` in the browser's dev tools. RLS works perfectly and shows exactly t_17's 214 invoices.\n\nThe database enforced the tenant it was given. The bug is who gave it.",
      check: {
        q: "Where should the API take the tenant from?",
        options: [
          "From the header, but only after checking the value looks like a tenant id",
          "From the signed access token issued at login, and nowhere else",
          "From the subdomain, like `t17.app.example.com`",
        ],
        answer: 1,
        why: "Anything the client sends unsigned can be edited. The login service puts the tenant into the token and signs it, so the API can trust it. A subdomain is a fine hint for the login page, but it is still client input.",
      },
      fields: {
        "X-Tenant-Id": "Client input. Anyone can type any value here.",
        tenant: "Another company's id, served without question.",
        count: "214 invoices of t_17 seen by a user of t_900.",
      },
    },
    token: {
      short: "Token",
      title: "Tenant from the signed token only",
      body: "At login the identity service writes the tenant into the access token and signs it. The API verifies the signature, reads `tenant` and sets the tenant context from it. A header that disagrees is rejected and written to the audit log.\n\nThe context is set in one place, middleware that runs before any handler. Handlers never choose a tenant.",
      watch: "A user of several companies switches tenant by getting a new token, not by sending a parameter.",
      fields: {
        sub: "The user.",
        tenant: "The company this session acts for. Signed, so it cannot be edited.",
        exp: "Expiry. A user removed from the tenant loses access within minutes.",
        sig: "The signature. Shown as `***`: never log a full token.",
        "403": "A header that disagrees with the token is an attack or a bug. Either way: refuse and record.",
      },
    },
    noisy: {
      short: "Noisy",
      title: "One tenant's export slows everyone",
      body: "t_900, the biggest customer, starts an export of seven years of invoices, and then starts it again because it seemed slow. The shared database spends 71% of its time on one tenant. Everyone else's p99 goes from 120 ms to 2.4 s.\n\nThis is the **noisy neighbour**: in a pool, tenants share CPU, disk and connections, and nothing stops one of them from taking all of it.",
      check: {
        q: "What protects the other tenants without blocking t_900 completely?",
        options: [
          "Buy a database twice as big",
          "A quota per tenant: a request rate limit, at most 2 exports at once, exports run by a worker from a queue",
          "Forbid exports larger than one year",
        ],
        answer: 1,
        why: "A bigger database moves the limit, and the next export fills it again. Quotas cap how much one tenant can take at a time, and a queue turns a burst into a steady background load. t_900 still gets its export, only not all at once.",
      },
      fields: {
        t_900: "One tenant out of 1 200.",
        "71%": "Its share of database time: more than everyone else together.",
        p99: "The slowest 1% of requests, for all tenants. Small customers feel it first.",
      },
    },
    quota: {
      short: "Quota",
      title: "Per-tenant quotas and an export queue",
      body: "The API counts requests and running exports per tenant. Interactive calls are limited per minute; exports go to a queue and an export worker runs at most two per tenant, with a statement timeout. A third export gets `429` with headers that say when to retry.\n\nThe database falls back to 55% and p99 to 180 ms. Limits come from the tenant's plan, so a large customer pays for a larger quota.",
      watch: "Quotas per tenant, not per user: one tenant with 500 users must not get 500 times the share.",
      fields: {
        "RateLimit-Limit": "This tenant may run 2 exports at the same time.",
        "RateLimit-Remaining": "None left right now.",
        "Retry-After": "Seconds until a slot is likely free. Good clients wait instead of hammering.",
        running_exports: "What the tenant already has in the queue, so the UI can show it.",
      },
    },
    silo: {
      short: "Silo",
      title: "The biggest tenant gets its own database",
      body: "t_900 is 30% of all data and pays for an isolated setup. It moves to its own database: the **silo** model. Everyone else stays in the pool. Same code, same API, only the data lives elsewhere; that mix is called **bridge**.\n\nNow the API must know where each tenant lives. A small **tenant catalog** maps tenant to cell and database host; the API caches it for 30 seconds and routes every query.",
      watch: "Moving a tenant is a migration: copy, catch up, freeze writes for seconds, flip the route.",
      fields: {
        tenant_routes: "The routing table: one row per tenant.",
        cell: "A group of tenants that share one database and fail together.",
        db_host: "Where this tenant's queries go.",
        state: "`active`, or `moving` while a tenant is copied to another cell.",
        "pool-1": "Small tenants stay in shared cells.",
      },
    },
    keys: {
      short: "Keys",
      title: "One encryption key per tenant",
      body: "Every tenant gets its own data key, wrapped by a master key in the key service. The API asks the key service to unwrap t_900's key and encrypts sensitive columns with it. A leaked backup of another tenant's cell is useless for t_900's data.\n\nWhen a tenant leaves, its key is destroyed: all its rows and backups become unreadable at once. A big customer can even bring its own master key.",
      fields: {
        key_id: "Per tenant, with a version: keys rotate without rewriting old data at once.",
        wrapped_key: "The data key encrypted by the master key. Safe to store next to the data.",
        tenant: "Bound into the request: t_900's key cannot be unwrapped for another tenant.",
        plaintext_key: "Lives only in API memory. Never written to disk or logs.",
      },
    },
    migrate: {
      short: "Waves",
      title: "Migrations in waves, not all at once",
      body: "Last quarter one `ALTER TABLE` locked the shared table for 40 minutes, for all tenants. Now a migration runner applies each schema change cell by cell: a canary of internal and test tenants, then pools, then silos. A failed wave stops the rollout.\n\nThe catalog stores each tenant's schema version, and the app code works with the old and new schema until the last wave is done. One bad change now hits 1% of tenants, not all.",
      watch: "Set `lock_timeout` on every migration: better a paused wave than a locked table.",
      fields: {
        canary: "12 internal and test tenants go first.",
        wave: "A group of cells migrated together. The next starts only if the last one is healthy.",
        lock_timeout: "The silo had a long-running query; the migration gave up instead of blocking writes.",
        schema_version: "Per tenant. Tells the app and the runner where each tenant stands.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Six rules for many customers in one system.\n\n1) Do not trust every query to remember `tenant_id`: enforce it in the database with row-level security and `SET LOCAL` per transaction. 2) The tenant comes only from the signed token; any other source is input to verify, not to trust. 3) Quotas and queues per tenant keep one customer from taking everything. 4) Pool by default, silo for those who need or pay for it, a catalog that routes each tenant. 5) One key per tenant: a leak stays small, leaving is a key deletion. 6) Migrate in waves, with a canary and a version per tenant.",
    },
  },
};

export default text;
