import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "The life of a request",
  summary:
    "A user opens a page. Before a single byte of it arrives, the request looks up an address, opens a connection, agrees on encryption, passes a load balancer and an app server, and asks the database. Where do the milliseconds go?",
  learn: [
    "What DNS, TCP and TLS each cost before the request is even sent",
    "What a load balancer adds on the way to the app server",
    "Why one missing index can cost more than the whole network",
    "Why distance hurts, and how a reused connection hides it",
  ],
  nodes: {
    client: "Browser",
    resolver: "DNS resolver",
    lb: "Load balancer",
    app: "App server",
    db: "Database",
  },
  metrics: {
    elapsed: "Time so far",
    trips: "Round trips",
    "db-time": "Database time",
  },
  steps: {
    dns: {
      short: "DNS",
      title: "First, find the address",
      body: "The user types `shop.example.com`. The browser cannot connect to a name, only to an IP address, so it asks a DNS resolver.\n\nThe resolver answers with an address and how long the answer may be cached. This first lookup took 38 ms and nothing has been sent to the shop yet.",
      fields: {
        "IN A": "The question: give me the IPv4 address (record type `A`) for this name.",
        "203.0.113.10": "The answer. This is the public address of the shop's load balancer, not of one server.",
        TTL: "300 seconds. The browser and the OS may reuse this answer for five minutes without asking again.",
      },
    },
    tcp: {
      short: "TCP",
      title: "Open a connection",
      body: "With the address known, the browser opens a TCP connection to port 443. That takes a three-way handshake: `SYN`, `SYN-ACK`, `ACK`.\n\nThe handshake costs one full round trip, here 40 ms. Nothing useful has been sent yet: the two sides only agreed to talk.",
      watch: "A round trip is bounded by the speed of light in fibre. No faster server can make it shorter; only being closer can.",
      fields: {
        SYN: "The browser: “I want to talk, here is my starting sequence number.”",
        "SYN-ACK": "The load balancer: “Agreed, here is mine.” The browser's final `ACK` can already carry data.",
        "round trip": "Browser to load balancer and back. Every handshake step costs one of these.",
      },
    },
    tls: {
      short: "TLS",
      title: "Agree on encryption",
      body: "Over the new connection, the browser and the load balancer run a TLS 1.3 handshake. They pick a cipher, the server proves who it is with a certificate, and both derive the keys.\n\nTLS 1.3 needs one more round trip. 118 ms have passed, and the actual request has still not left the browser.",
      fields: {
        sni: "The name the browser wants. One load balancer can serve many sites and picks the certificate by this name.",
        alpn: "Which protocol to speak inside: the server picks `h2`, HTTP/2.",
        key_share: "The browser's half of the key exchange, sent right away so the handshake fits in one round trip.",
        certificate: "Proof that this server is really `shop.example.com`, signed by an authority the browser trusts.",
      },
    },
    http: {
      short: "HTTP",
      title: "The request reaches an app server",
      body: "Now the browser sends `GET /orders`. The load balancer decrypts it, picks a healthy app server and forwards the request over the fast internal network.\n\nOn the way it adds a few headers, so the app still knows who the real client is and the request can be traced through the logs.",
      fields: {
        Cookie: "The user's session. It is a secret, so it is hidden here.",
        "X-Forwarded-For": "The real client address. Without it, the app would only see the load balancer's IP.",
        "X-Request-Id": "One ID for this request in every log: load balancer, app and database.",
      },
    },
    "slow-query": {
      short: "Slow query",
      title: "The database reads every row",
      body: "To list the user's orders, the app asks the database for the last 20. There is no index on `user_id`, so the database reads all 1.8 million rows to find them.\n\nThat single query takes 281 ms: more than DNS, TCP and TLS together.",
      watch: "Most slow pages are not slow because of the network. Measure where the time goes before you guess.",
      check: {
        q: "We add an index on `(user_id, created_at)`. What happens to this page?",
        options: [
          "The query falls to a few ms; the network is the limit again",
          "The query gets a bit faster but still dominates the page",
          "The page slows down: every insert must now update the index",
        ],
        answer: 0,
        why: "The database jumps to the user's orders and reads exactly 20 rows. The query drops from 281 ms to 4 ms, so the network round trips are the main cost again.",
      },
      fields: {
        user_id: "The filter. Without an index on it, the database has to check every row.",
        "Seq Scan": "A sequential scan: the whole table is read from start to end.",
        "Execution Time": "281 ms of database work for 20 rows of result.",
      },
    },
    index: {
      short: "Index",
      title: "An index finds the rows directly",
      body: "An index on `(user_id, created_at)` keeps each user's orders together and already sorted by date. The database jumps to the right place and reads exactly 20 rows.\n\nThe query drops from 281 ms to 4 ms. The page is now back to being limited by the network.",
      fields: {
        "CREATE INDEX": "Built once. After that the database keeps it up to date on every insert.",
        "Index Scan": "The database walks the index instead of the table.",
        "rows scanned": "20 instead of 1.8 million: the index already returns them in the right order.",
      },
    },
    response: {
      short: "Response",
      title: "The answer travels back",
      body: "The rows go back to the app, the app builds JSON, the load balancer compresses and encrypts it and sends it to the browser.\n\nTotal: 176 ms. Of that, 158 ms were network round trips and only 18 ms were the servers doing work.",
      check: {
        q: "A new user opens the same page from abroad: 150 ms per round trip instead of 40. What happens to the total?",
        options: [
          "Barely changes: the servers are just as fast",
          "Roughly triples: each handshake costs a full round trip",
          "Stays near 176 ms, since the connection is reused",
        ],
        answer: 1,
        why: "Server work is still 18 ms, but DNS, TCP, TLS and the request each pay a long round trip. The page now takes 558 ms instead of 176.",
      },
      fields: {
        "server-timing": "The servers report their own time: 2 ms load balancer, 11 ms app, 4 ms database. The browser shows this in its dev tools.",
        "content-encoding": "The JSON is compressed with gzip, so fewer bytes cross the slow last mile.",
        next_page: "The client asks for page 2 with a new request, over the same connection.",
      },
    },
    far: {
      short: "Far away",
      title: "The same page, from far away",
      body: "Another user opens the page from another country over mobile data. The round trip is now 150 ms instead of 40, and her resolver has never seen the name.\n\nThe servers are just as fast, but every handshake costs a full round trip: the page now takes 558 ms.",
      watch: "Latency adds up per round trip. A protocol that needs one more round trip is slower for exactly the users who are already far away.",
      fields: {
        connect: "The TCP handshake: one round trip of 150 ms.",
        tls: "The TLS handshake: another 150 ms.",
        TTFB: "Time to first byte: one more round trip plus 18 ms of server work.",
      },
    },
    reuse: {
      short: "Reuse",
      title: "The second request skips the handshakes",
      body: "When she opens page 2, the browser still has the DNS answer and an open, encrypted HTTP/2 connection. It sends the request straight away.\n\nOne round trip instead of four: 168 ms instead of 558. Keeping connections alive is one of the cheapest speed-ups there is.",
      fields: {
        cached: "The DNS answer is still within its 300-second TTL.",
        reused: "The TCP connection and its TLS keys are still open, so neither handshake runs again.",
        TTFB: "What remains: one round trip and the servers' own work.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "A request pays for DNS, TCP and TLS before it is even sent, and each of those is a round trip.\n\n1) Distance sets the price of every round trip. 2) Reused connections and cached DNS skip most of them. 3) Inside the data centre, one slow query can outweigh the whole network, so measure with `Server-Timing` and an index where it counts.",
    },
  },
};

export default text;
