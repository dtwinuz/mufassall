import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Connection pooling",
  summary:
    "An orders API on 20 instances serves 2 000 requests a second, each with one 5 ms query, against a PostgreSQL that allows 200 connections. Opening a connection per request costs more than the query itself; a pool per instance fixes that and then multiplies past the database limit. Little's law sizes the pool, an acquire timeout bounds the wait, leaks and long transactions are caught, a pooler goes in front of the database, and idle timeouts are set below the network's.",
  learn: [
    "What a new TCP + TLS + auth connection costs in milliseconds, and why the database pays for it with a process",
    "Why pool size times instances must fit under max_connections, and how to size a pool with Little's law",
    "Acquire timeouts, leaks and long transactions: the ways a pool runs dry with an idle database",
    "A pooler in transaction mode and what it breaks, idle timeouts behind a balancer, and HTTP keep-alive pools",
  ],
  nodes: {
    web: "Shop clients",
    api: "Orders API (20 instances)",
    db: "PostgreSQL",
    pay: "Payment provider",
    pooler: "Pooler",
    nlb: "Internal TCP balancer",
  },
  metrics: {
    p99: "Request p99",
    newconn: "New db connections",
    conns: "Db connections",
    dbmem: "Db memory for connections",
    wait: "Pool wait p99",
    err: "Failed requests",
  },
  steps: {
    setup: {
      short: "Setup",
      title: "Every request opens its own connection",
      body: "The orders API runs on 20 instances and serves 2 000 requests a second. Each request runs one query that takes 5 ms. The code opens a database connection, runs the query and closes it.\n\nThe query is the cheap part. Before it can run, the client and the server make a TCP handshake, a TLS handshake and a password exchange, and PostgreSQL starts a whole new process for the connection: 8.5 ms of setup for 5 ms of work, 2 000 times a second.",
      watch: "Starting a process 2 000 times a second also costs the database CPU it could spend on queries.",
      fields: {
        TCP: "One round trip just to open the socket.",
        "forks a backend process": "PostgreSQL serves each connection with its own operating system process.",
        "TLS 1.3": "Encryption setup: more round trips and key exchange math.",
        "SCRAM-SHA-256": "The password check: several messages and thousands of hash rounds on both sides.",
        SELECT: "The actual work: 5 ms.",
        "2 000 times a second": "Every request pays the setup again, and then throws the connection away.",
      },
    },
    pool: {
      short: "Pool",
      title: "A pool keeps connections open and lends them out",
      body: "Each instance now has a **connection pool**. A request **borrows** an open connection, runs its query and gives it back; the connection stays open for the next request. Setup is paid once per connection, not once per request.\n\nThe p99 falls from 41 ms to 16 ms, new connections drop to almost zero, and the database stops spending CPU on starting processes. The settings were copied from the library's example, and two of them will matter soon.",
      fields: {
        maximum_pool_size: "The most connections this instance may open: 50.",
        minimum_idle: "Connections kept open even when nothing happens.",
        connection_timeout: "How long a request waits for a free connection: 30 s by default.",
        borrow: "Take a connection, use it, return it. Nothing is opened or closed.",
        reused: "One connection serves about 100 requests a second.",
      },
    },
    "too-many": {
      short: "Too many",
      title: "20 pools of 50 do not fit into 200",
      body: "On Monday morning a slow report query holds connections longer, requests pile up, and every pool grows towards its maximum of 50. Twenty instances want **1 000** connections. The database allows 200 and keeps 3 for superusers, so connection 198 is refused.\n\nRaising max_connections to 1 000 is not the answer. Each connection is a process with about 10 MB of its own memory: 10 GB just for connections. And a 16-core machine can run only about 16 queries at the same moment; the other 984 would wait and fight for locks and caches.",
      check: {
        q: "Why not simply set max_connections = 1 000?",
        options: [
          "PostgreSQL does not allow more than 200 connections",
          "Each connection is a process of about 10 MB, and 16 cores run about 16 queries at once: the rest only wait, using memory and adding contention",
          "Because the network cannot carry 1 000 connections",
        ],
        answer: 1,
        why: "More connections do not add CPU. Past a few connections per core, throughput stops growing and latency grows, while the memory cost keeps rising. The fix is fewer connections, used better.",
      },
      fields: {
        "1 000 connections wanted": "Pool maximum times instances: the number the database must be able to take.",
        max_connections: "The database's hard limit.",
        FATAL: "The database refuses the new connection outright.",
        "one OS process": "Memory, scheduling and a slot in shared structures, for every connection.",
        "16-core": "How many queries can really run at the same moment.",
      },
    },
    size: {
      short: "Size",
      title: "Size the pool with Little's law",
      body: "How many connections are busy at once is rate times duration (**Little's law**): 2 000 queries a second times 5 ms is 10 connections, for all instances together. Triple that for bursts and slow queries: 30.\n\nThe budget is what the database allows minus what others need: 200, minus 3 for superusers, minus 17 for cron jobs, admin tools and a replica, is 180. Each instance gets a pool of 5: 20 x 5 = 100 at most, and 80 are left for growth.",
      watch: "A small pool is not a slow pool: 5 connections per instance serve 100 requests a second at 5 ms each with room to spare.",
      check: {
        q: "Queries get slower, from 5 ms to 20 ms, at the same 2 000 requests a second. How many connections are busy now?",
        options: ["10, as before", "40: four times longer means four times as many busy at once", "2 000, one per request"],
        answer: 1,
        why: "Busy connections = rate x duration = 2 000 x 0.02 s = 40. Slow queries need more connections, which is why headroom matters and why a pool that runs out often means slow queries, not a small pool.",
      },
      fields: {
        "rate x time": "Little's law: how many are in progress at once.",
        "= 10": "Busy on average across all 20 instances.",
        headroom: "Room for bursts and for queries slower than average.",
        budget: "What is left for the app after everyone else gets their connections.",
        "per instance": "The budget split across the instances, with growth in mind.",
      },
    },
    queue: {
      short: "Queue",
      title: "When the pool is empty, wait briefly",
      body: "When all 5 connections are busy, the next request waits in the pool's queue. The library default lets it wait **30 s**, far longer than any client waits, so a slow minute turns into thousands of hanging requests.\n\nThe acquire timeout is now 250 ms. A request that cannot get a connection in time gets 503 with Retry-After at once, the client can try again, and threads are not held. The pool exports how many connections are active, idle and pending, so a full pool is seen before it is felt.",
      check: {
        q: "What does a 30 s acquire timeout do on a bad minute?",
        options: [
          "Nothing bad: requests just wait and succeed later",
          "Requests hang for 30 s holding threads and memory, clients give up long before and retry, and the queue keeps growing",
          "The pool opens more connections than its maximum",
        ],
        answer: 1,
        why: "A wait longer than the client's own timeout is pure waste: the answer arrives after nobody is listening. A short acquire timeout turns overload into fast, retryable errors.",
      },
      fields: {
        "Retry-After": "Tells the client when it is worth trying again.",
        active: "Connections lent out right now: all 5.",
        pending: "Requests waiting for a connection.",
        waited_ms: "The 250 ms acquire timeout ran out.",
      },
    },
    held: {
      short: "Held",
      title: "Connections that are held but not working",
      body: "A week later the pool runs dry again while the database is half idle. `pg_stat_activity` shows two kinds of waste.\n\nThe refund endpoint opens a transaction, updates the order and then calls the payment provider, about 0.9 s, before COMMIT. The connection sits **idle in transaction** the whole time and keeps its row locks. And one error path returns before giving the connection back: a **leak**. Every such error takes one connection away for good, until the pool is empty.",
      check: {
        q: "50 refunds a second each hold a connection for 0.9 s. How many connections does that take?",
        options: ["About 1", "About 45", "50"],
        answer: 1,
        why: "Little's law again: 50 x 0.9 s = 45 connections busy at once, more than the whole pool of 100 can spare. The database does nothing during that time: the connection waits for another service.",
      },
      fields: {
        "idle in transaction": "A transaction is open, but no query is running: the connection and its locks wait.",
        in_tx: "How long the transaction has been open.",
        "payment provider": "A slow external call made while the transaction was open.",
        "never returned": "A leak: borrowed on an error path and never given back.",
      },
    },
    "held-fix": {
      short: "Return",
      title: "Borrow late, return early, always return",
      body: "Three changes. Every borrow sits in a block that returns the connection on every path, errors included. The pool logs a stack trace when a connection is held for more than 2 s, so the next leak points at its own line. The database ends any session that stays idle in a transaction for 10 s.\n\nAnd the external call moves out: the payment provider is called first, then a short transaction writes the result in 4 ms. Refunds now hold 0.2 connections instead of 45.",
      watch: "Never wait on the network, a user or a lock in another system while a transaction is open.",
      fields: {
        using: "The connection is returned when the block ends, whatever happens inside.",
        leak_detection_threshold: "Held for more than 2 s: log who took it.",
        idle_in_transaction_session_timeout: "The database closes sessions that forget their open transaction.",
        "then BEGIN": "The transaction starts after the slow call, not before it.",
      },
    },
    pooler: {
      short: "Pooler",
      title: "A pooler in front of the database",
      body: "Pools per instance still multiply: double the instances and the connections double too. A **pooler** in front of the database breaks that link. The instances connect to it, which is cheap because it has no process per client, and it keeps 25 real connections to PostgreSQL.\n\nIn **transaction mode** a client holds a real connection only for one transaction and gives it back at COMMIT. 100 clients today, 400 tomorrow, and still 25 server connections, because only about 10 are busy at any moment.",
      fields: {
        pool_mode: "Transaction mode: a server connection is lent for one transaction.",
        max_client_conn: "How many app connections the pooler accepts. They are cheap.",
        default_pool_size: "Real connections to the database: the number that costs memory.",
        "server connections": "Stays at 25 whatever the number of instances.",
        "until COMMIT": "After the transaction, the same server connection serves another client.",
      },
    },
    "txn-mode": {
      short: "Traps",
      title: "What transaction mode breaks",
      body: "Anything that lives in the session, not in the transaction, now breaks, because the next transaction of the same client may run on a different server connection.\n\n- **Prepared statements** made on one connection do not exist on another: turn off server-side prepared statements in the driver, or use a pooler version that tracks them.\n- **SET** leaks to whoever gets the connection next: use SET LOCAL inside the transaction.\n- **Session advisory locks** are taken on one connection and released on another: use the transaction-level lock.\n- **LISTEN**, temporary tables and long migrations need a real session: give them a direct connection or a session-mode pool.",
      check: {
        q: "A request runs `SET search_path = tenant_42` and then its query, outside a transaction. What can go wrong?",
        options: [
          "Nothing, SET only affects this request",
          "The query may run on another server connection without the setting, and a later client may get tenant_42's search_path",
          "The pooler rejects SET statements",
        ],
        answer: 1,
        why: "In transaction mode the SET and the query are two transactions and can land on two connections. The setting stays on the first one for whoever comes next. SET LOCAL inside one transaction is safe.",
      },
      fields: {
        "prepared statement": "Prepared on one server connection, executed on another that never saw it.",
        "SET search_path": "Session setting: stays on the connection after this client leaves.",
        pg_advisory_lock: "Session lock: held by a connection, not by your request.",
        LISTEN: "Needs one connection to stay with one client.",
        session: "What transaction mode does not keep for you.",
      },
    },
    idle: {
      short: "Idle",
      title: "The network forgets idle connections silently",
      body: "The pooler sits behind an internal TCP balancer that drops a flow after **350 s** of silence, without telling either side. The app's pool keeps idle connections for 600 s. Overnight traffic is low, and many connections stay silent for hours.\n\nAt 06:58 the first query goes out on one of them. Nobody answers, TCP retransmits, and only the 15 s socket timeout ends the wait. Without that timeout the kernel would keep retrying for about 15 minutes.",
      check: {
        q: "Why does the first request of the morning hang instead of failing at once?",
        options: [
          "The pooler is still asleep and takes 15 s to wake up",
          "The balancer forgot the connection without sending a reset, so the app's packets vanish and TCP keeps retransmitting until a timeout",
          "The database restarted overnight",
        ],
        answer: 1,
        why: "A dropped flow gives no error, just silence. The client cannot tell a slow server from a dead path, so it waits for its socket timeout or for the kernel's retransmission limit.",
      },
      fields: {
        "idle_timeout 350 s": "After 350 s of silence the balancer forgets the connection.",
        "600 s": "The pool keeps idle connections longer than the network does.",
        retransmits: "TCP resends the packet, again and again, into nothing.",
        "socket timeout": "The app's own limit: 15 s, then an error and a new connection.",
        "15 minutes": "How long the kernel retries by default when nothing sets a timeout.",
      },
    },
    keepalive: {
      short: "Keep-alive",
      title: "Every pool closes its idle connections first",
      body: "The rule: whoever holds the connection must close it before anything in between forgets it. The database pool now closes idle connections after 300 s, below the balancer's 350 s, retires every connection after 30 minutes with some jitter, and sends TCP keepalives every 60 s.\n\nThe same applies to HTTP. The API keeps a **keep-alive** pool to the payment provider: a new connection there costs 31 ms of TCP and TLS, a reused one nothing. The provider closes idle connections after 60 s, so the client closes its own after 50 s, and does not send a request on a socket the server is closing.",
      watch: "A request that fails with a reset on a reused connection may already have been processed. Retry it automatically only if it is idempotent.",
      fields: {
        max_lifetime: "Old connections are replaced on a schedule, with jitter so they do not all reconnect at once.",
        tcp_keepalive: "Small probes on a silent connection: a dead path is found in about a minute.",
        "keep-alive": "The HTTP connection stays open for the next request.",
        "new connection": "What every request would pay without the pool.",
        reused: "Most requests skip the handshakes entirely.",
        "Keep-Alive": "The server says how long it keeps an idle connection: 60 s.",
        max_per_host: "The same sizing rule as for the database: a limit per destination.",
        idempotent: "Only a request that is safe to repeat is retried after a reset.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Seven rules for connection pools.\n\n1) A new connection costs TCP, TLS, auth and, in PostgreSQL, a process: reuse connections instead of opening one per request. 2) Pool size times the number of instances, plus everyone else, must fit under max_connections; more connections than a few per core make the database slower, not faster. 3) Size with Little's law: rate x query time, plus headroom. 4) Keep the acquire timeout short and answer 503 rather than queue for 30 s. 5) Return connections on every path, detect leaks, and never keep a transaction open across a network call. 6) A pooler in transaction mode decouples app instances from database connections; avoid session state (prepared statements, SET, advisory locks, LISTEN) or give those uses a direct connection. 7) Close idle connections before the network does, and treat HTTP keep-alive pools the same way.",
    },
  },
  scenarios: {
    autoscale: {
      label: "Autoscaling doubles it",
      steps: {
        "scale-out": {
          short: "Scale out",
          title: "The autoscaler doubles the API, the database says no",
          body: "A sale starts, API CPU reaches 80%, and the autoscaler goes from 20 to 40 instances. Each new instance opens its pool of 5. 40 x 5 plus 17 other connections is 217, and the database allows 200.\n\nNew instances cannot connect, fail their readiness check and restart, again and again. And the extra instances could not have helped anyway: the database was the slow part, and more callers only add more waiting.",
          check: {
            q: "What should have stopped this before the sale?",
            options: [
              "A bigger database, sized for the sale",
              "Treating instances x pool size as one budget: the autoscaler's maximum and the pool size are set together so that the maximum still fits",
              "A longer acquire timeout on the new instances",
            ],
            answer: 1,
            why: "The pool size was chosen for 20 instances, the autoscaler's limit for CPU. Nobody multiplied them. Both numbers have to be decided together, against the database's connection budget.",
          },
          fields: {
            "20 -> 40": "The autoscaler reacts to CPU, not to database connections.",
            "217 > 200": "Pool size times instances plus everyone else, over the limit.",
            "remaining connection slots": "The last slots are kept for superusers; the app is refused.",
            readiness: "Without a database connection the new instance never becomes ready.",
            bottleneck: "When the database is the limit, more app instances do not add capacity.",
          },
        },
        "scale-fix": {
          short: "Budget",
          title: "One budget for pool size and autoscaler",
          body: "The pool size is now derived from the autoscaler's maximum: 180 connections for the app divided by at most 40 instances is 4 per instance. Both numbers live in the same config file, so changing one shows the other.\n\nAt 40 instances the database sees 160 connections, inside its budget. An alert fires when connections pass 80% of max_connections. Going beyond 40 instances needs the pooler first, not a bigger pool.",
          fields: {
            budget: "Connections the app may use in total.",
            max_replicas: "The autoscaler's ceiling, written next to the pool size.",
            "floor(180 / 40)": "The budget divided by the most instances there can ever be.",
            alert: "Warns before the database starts refusing.",
            pooler: "The way to scale instances without scaling database connections.",
          },
        },
      },
    },
  },
};

export default text;
