import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "API gateway",
  summary:
    "A marketplace app talks to three services on three public hosts, and each one re-implements TLS, token checks and limits. One gateway in front takes over the edge: routing, TLS, auth, quotas, size limits, aggregation for the mobile screen and canary releases. Then the same gateway becomes the one thing that takes everything down, and the place where business logic quietly piles up.",
  learn: [
    "Routing by host and path, TLS ended at the edge, a timeout per route",
    "Auth at the edge: check the token once, pass a verified identity inward, strip what the client sent",
    "Per-key rate limits, monthly quotas and size limits; a BFF that turns five chained calls into one with partial answers",
    "Canary routing by header and user hash; the gateway as a single point of failure and a \"god\" layer; gateway vs load balancer vs service mesh",
  ],
  nodes: {
    app: "Mobile app",
    catalog: "Catalog",
    orders: "Orders",
    profile: "Profile",
    gw: "API gateway",
    partner: "Partner",
    bff: "Home BFF",
    orders2: "Orders v2",
    l4: "Load balancer",
    gw2: "Gateway #2",
    wallet: "Wallet",
  },
  metrics: {
    edge: "Services checking tokens themselves",
    spoof: "Requests with a forged identity",
    p99: "Catalog p99",
    home: "Home screen on 3G",
    exposed: "Users hit by a bad release",
    outage: "Total outage last month",
  },
  steps: {
    setup: {
      short: "Setup",
      title: "Three services, three public hosts",
      body: "A marketplace app calls the catalog, orders and profile services directly, each on its own host. Every service terminates TLS, checks the JWT with its own library, has its own CORS rules and its own idea of limits.\n\nThe home screen needs all three, so the phone opens three TLS connections: 2.1 s on a 3G network. A bad orders release reaches every user at once.",
      fields: {
        Host: "One of three public names. The client knows the inside of the system.",
        Authorization: "Each service parses and checks this token by itself.",
        "three public hosts": "Three certificates, three DNS names, three things to move if a service is split.",
        "TLS certificate": "An expired one takes down that service, and only someone who remembers it can renew it.",
        "JWT check": "Three implementations: one of them will forget to check `aud` or `exp`.",
        CORS: "Browser rules repeated, and different, in every service.",
      },
    },
    gateway: {
      short: "Gateway",
      title: "One front door: route by host and path",
      body: "A gateway takes the only public address. It ends TLS with one certificate and routes by host and path: `/v1/orders/*` to orders, `partners.shop.example` to the partner API. Each route gets its own timeout, so a slow orders call cannot hold a connection for 60 s.\n\nServices are no longer reachable from the internet. The phone keeps one connection to one host, and the home screen drops to 1.5 s.",
      check: {
        q: "TLS now ends at the gateway. What about the hop from the gateway to the services?",
        options: [
          "Plain HTTP is fine: it is inside our network",
          "Encrypt it too (mTLS), and let services accept traffic only from the gateway",
          "Re-encrypt with the same public certificate",
        ],
        answer: 1,
        why: "\"Inside\" is not a security boundary: a compromised pod or a misrouted request reads plain HTTP. mTLS both encrypts and proves that the caller is the gateway, which matters in the next step, when services start trusting headers it sets.",
      },
      fields: {
        tls: "TLS ends here: one certificate, renewed automatically.",
        host: "Different hosts can map to different upstreams: the public API, partners.",
        path: "The path prefix picks the service; clients never learn the internal names.",
        timeout: "Per route: profile answers in 1 s or not at all, orders get 5 s.",
        mTLS: "Encrypted inside too, and services can tell the gateway from anyone else.",
      },
    },
    "edge-auth": {
      short: "Edge auth",
      title: "Check the token once, pass a verified identity inward",
      body: "The gateway validates the JWT: signature with a cached public key, `exp`, `aud`. Then it removes every `X-User-*` header the client sent and sets its own: user id, scopes and a fresh `X-Request-Id` that every service will log.\n\nThe raw token stops at the edge. Services read the verified headers, and three copies of token checking become zero. Authorization does not move: orders still checks that the order belongs to `u_5120`.",
      watch: "A header is only trustworthy if nobody but the gateway can set it. Strip first, then set, on every route.",
      check: {
        q: "The gateway checked the token and passes `X-User-Id`. Can the orders service drop its `WHERE customer_id = ...`?",
        options: [
          "Yes: the gateway already did authentication",
          "No: the gateway knows who is calling, only the service knows which orders are theirs",
          "Yes, if the scope is orders:read",
        ],
        answer: 1,
        why: "The gateway authenticates and can do coarse checks like scopes. Ownership depends on data only the service has. Dropping it gives every logged-in user every order: the IDOR from the authorization lesson.",
      },
      fields: {
        "X-User-Id": "Set by the gateway from the token's subject, never taken from the client.",
        "X-User-Scopes": "What the token allows, for coarse checks inside.",
        "X-Request-Id": "Created at the edge, logged by every service: one id to follow a request.",
        "X-Forwarded-For": "The client's address, as the gateway saw it.",
        removed: "Strip before set: a client-sent identity header must never reach a service.",
        ownership: "Authorization by data stays in the service.",
      },
    },
    flood: {
      short: "Flood",
      title: "One partner key eats the catalog",
      body: "A partner's price scraper loops over search: 3 000 requests a second from one key, while the whole catalog normally serves 400. The catalog's p99 goes from 120 ms to 2.6 s for everyone.\n\nAt the same time `POST /v1/reviews` accepts bodies of any size: eight 48 MB bodies are enough to fill a worker's memory.",
      fields: {
        "X-Api-Key": "Identifies the partner: the right thing to count limits by.",
        "3 000": "More than seven times the normal traffic of all users together.",
        "400/s": "What the catalog was sized for.",
        "48 MB": "An unbounded body is a memory attack, even when nobody means it.",
      },
    },
    limits: {
      short: "Limits",
      title: "Limits per key, quotas per month, sizes per route",
      body: "Every API key has a plan: a rate with a burst for the seconds, a quota for the month. The gateway counts in one shared store, so three instances do not give three times the limit. Over the rate the answer is `429` with `Retry-After`; over the quota, `429` until the 1st.\n\nBodies are capped at 1 MB (uploads stream up to 20 MB), headers at 16 KB, URLs at 8 KB. A too-large body gets `413` before it is read. The scraper slows to its 200 a second, and the catalog p99 is back at 130 ms.",
      check: {
        q: "A partner sends a steady 200 requests a second, exactly its rate. What happens, and when?",
        options: [
          "Nothing: it is within the rate",
          "After about 28 hours it reaches the 20 000 000 monthly quota and gets 429 until the 1st",
          "Its burst runs out after 2 seconds",
        ],
        answer: 1,
        why: "200 × 86 400 = 17 280 000 a day, so 20 000 000 is reached in about 27.8 hours. The rate protects the services second by second; the quota protects the month and the bill. Both are needed.",
      },
      fields: {
        burst: "Short spikes above the rate are allowed, up to this many at once.",
        "req/month": "The quota: a business limit on top of the technical one.",
        "1 MB": "Default body cap; bigger routes are explicit exceptions.",
        "413": "Rejected from the Content-Length header, before a byte of the body is buffered.",
        "Retry-After": "Tells a polite client when to try again.",
      },
    },
    chatty: {
      short: "Chatty",
      title: "Five calls in a chain for one screen",
      body: "Home screen v5 adds banners, recommendations and promos. Each call needs data from the one before: the city from the profile, the last orders for recommendations. On a 3G phone with a 300 ms round trip, five calls in a chain take 2.4 s.\n\nThe responses are general-purpose: 210 KB of fields this screen never shows.",
      watch: "Latency on a phone is mostly round trips. Five quick calls in a chain cost more than one slow one.",
      fields: {
        "RTT 300 ms": "Every call pays this at least once, however fast the server is.",
        "needs the user": "A chain: the next call cannot start before this answer.",
        "needs the orders": "Recommendations wait for orders, which waited for the profile.",
        "5 round trips": "5 × 300 ms of network before any server time.",
        "210 KB": "Over-fetching: generic APIs, a specific screen.",
      },
    },
    bff: {
      short: "BFF",
      title: "A backend for the screen: one call, parallel inside",
      body: "A small Home BFF (backend for frontend) owns `GET /v1/home`. Inside the data center, where a call costs 1 ms, it reads the profile and orders in parallel, then banners and recommendations, and returns exactly the fields the screen draws.\n\nRecommendations have a 150 ms budget. When they miss it, the BFF still answers `200` with the rest and lists what is missing. One round trip: 650 ms instead of 2.4 s.",
      check: {
        q: "The recommendations call times out. What should `/v1/home` return?",
        options: [
          "504 for the whole screen",
          "200 with everything else, recommendations null and listed as partial",
          "Wait until recommendations answer, however long it takes",
        ],
        answer: 1,
        why: "A missing carousel should not cost the customer their orders. Decide per part: profile and orders are critical (if they fail, so does the screen), recommendations and banners are optional and degrade to empty. The app shows what it got.",
      },
      fields: {
        "X-Request-Id": "The same id goes to all four inner calls: one trace for the screen.",
        orders: "Fetched in parallel with the profile, trimmed to what the screen shows.",
        recommendations: "Missed its 150 ms budget: null, not an error.",
        partial: "Tells the app which parts to hide or retry later.",
        took_ms: "Server time for the whole screen, inner calls included.",
      },
    },
    canary: {
      short: "Canary",
      title: "Send 5% of users to the new version",
      body: "Last month an orders release broke checkout for every user for 12 minutes. Now the gateway routes by rule: staff phones with `X-Canary: 1` and 5% of users by a hash of their id go to orders v2, everyone else to v1. Breaking API changes get a new path, `/v2/...`, and both live side by side.\n\nThe gateway logs status and latency per version. v2 shows 4.1% errors against 0.2%, and one config push sets its weight back to 0.",
      check: {
        q: "Why route by a hash of the user id rather than a random 5% of requests?",
        options: [
          "Hashing is faster than a random number",
          "A user would jump between v1 and v2 on every request, with mixed data and errors that cannot be reproduced",
          "Random routing cannot be logged",
        ],
        answer: 1,
        why: "With random routing the same cart is read by v1 and written by v2 in one session. A stable hash keeps each user on one version, so a broken version hurts a fixed 5% who can be found in the logs.",
      },
      fields: {
        "X-Canary": "An explicit opt-in for testers, before any customer sees v2.",
        "hash(user_id)": "Stable: the same user lands in the same bucket every time.",
        "same user": "No flip-flopping between versions inside one session.",
        "per version": "Errors and latency split by version: the canary is judged by numbers.",
        "weight back to 0": "Rollback is a routing change, not a redeploy.",
      },
    },
    spof: {
      short: "SPOF",
      title: "The gateway takes everything down",
      body: "To ship discounts faster, someone put them into a gateway plugin: 1 900 lines owned by nobody. A config with a nil in one city's rule reaches the only gateway instance. Every worker crashes on its first `/v1/home`, restarts and crashes again.\n\nFor 47 minutes every route is down, including the partner API that has nothing to do with discounts. The fix needs the pricing team and the platform team in one room.",
      watch: "Everything passes through the gateway, so everything in it is shared risk. Business logic there turns it into a new monolith in front of the services.",
      fields: {
        "pricing.lua": "Business rules in the edge layer: deployed with routing, failing with routing.",
        "owned by nobody": "The pricing team does not own the gateway; the platform team does not own the rule.",
        "one instance": "No second copy to take the traffic.",
        "every route": "One bad plugin breaks routes that never touch it.",
        "47 minutes": "A full outage for a bug in one feature.",
      },
    },
    thin: {
      short: "Thin & redundant",
      title: "Several instances, staged config, no business logic",
      body: "The gateway runs as three stateless instances in two zones behind a layer-4 load balancer that checks their health every 2 s. Config lives in git, is validated in CI and reaches one instance first, the rest 10 minutes later.\n\nDiscounts go back to the pricing service. The gateway keeps edge concerns only: routing, TLS, auth, keys, limits, request id. A bad config now breaks one instance out of three, and the balancer drops it within 6 s.",
      check: {
        q: "Which of these belongs in the gateway?",
        options: [
          "Rejecting a 30 MB body on a route capped at 1 MB",
          "Refusing an order when the cart total is below 50 000 so'm",
          "Adding the customer's loyalty points to the response",
        ],
        answer: 0,
        why: "The size cap is a property of the HTTP request: the same for every service, cheap to check at the edge. A minimum order and loyalty points are business rules: they change with the business, need its data and belong to the service that owns them.",
      },
      fields: {
        "3 instances": "Stateless copies: limits counters live in a shared store, not in memory.",
        L4: "Spreads TCP connections, checks health, knows nothing about URLs.",
        "in git": "Every route change is reviewed and can be rolled back.",
        "1 instance first": "A bad config hurts a third of traffic for minutes, not all of it.",
        "back to the pricing service": "Business rules return to the team that owns them.",
        "6 s": "Three failed health checks 2 s apart, then the instance is out.",
      },
    },
    compare: {
      short: "Compare",
      title: "Load balancer, gateway, service mesh",
      body: "A load balancer spreads connections over healthy copies of one thing and does not read URLs or tokens. The API gateway handles north-south traffic: from clients into the system, where keys, quotas, public versions and BFFs live.\n\nA service mesh handles east-west traffic: service to service, with mTLS, retries and timeouts in a sidecar next to each service. They are layers, not rivals: many systems run a balancer in front of the gateway and a mesh behind it.",
      check: {
        q: "Orders calls profile 2 000 times a second inside the cluster. Should those calls go through the API gateway?",
        options: [
          "Yes: one place for all traffic is simpler",
          "No: east-west calls go directly or through a mesh; the gateway is for clients",
          "Yes, so the calls get rate limits",
        ],
        answer: 1,
        why: "Hairpinning internal calls through the edge adds a hop, puts internal traffic under client quotas and makes the gateway a dependency for calls that never leave the cluster. Internal identity and retries are the mesh's job.",
      },
      fields: {
        "L4 load balancer": "Connections in, connections out: fast and blind to the request.",
        "north-south": "Traffic that crosses the boundary of the system.",
        "east-west": "Traffic between services inside it.",
        sidecar: "A proxy next to each service, so services need no network code.",
        "all three": "Each solves a different layer of the same journey.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Seven rules for an API gateway.\n\n1) One public entry: route by host and path, end TLS there, give each route its own timeout, keep services off the internet. 2) Check the token once at the edge, strip every identity header the client sent, then set verified ones; services still check ownership. 3) Count limits per key in a shared store: a rate with a burst, a monthly quota, size caps answered with 429 and 413. 4) For a mobile screen, a BFF calls services in parallel and returns a partial answer when an optional part fails. 5) Canary by header and a stable user hash, judge by per-version metrics, roll back by weight. 6) Run several stateless instances behind a balancer and stage config changes. 7) Keep business logic out; balancer, gateway and mesh are three layers, not three choices.",
    },
  },
  scenarios: {
    unstripped: {
      label: "Unstripped header",
      steps: {
        "spoof-route": {
          short: "New route",
          title: "A new route trusts the client's X-User-Id",
          body: "The wallet team adds `/v1/wallet/*` from an old route template. The gateway checks the token, but the template has no strip step: it appends its own `X-User-Id` after the one the client sent.\n\nThe wallet framework reads the first value. Anyone with a valid token of their own can add `X-User-Id: u_0042` and read someone else's balance. In logs, 240 such requests a day.",
          check: {
            q: "The token on this route was checked. Why did the forgery work?",
            options: [
              "The token signature was not checked",
              "The client's header was not removed, and the service trusted whichever value came first",
              "The rate limit was too high",
            ],
            answer: 1,
            why: "A valid token proves who the caller is, but the service never looked at it: it read a header. If the gateway only appends, two values reach the service and the framework picks one. Strip, then set.",
          },
          fields: {
            "X-User-Id": "Two values on one request: the client's first, the gateway's second.",
            appended: "Appending keeps whatever the client already sent.",
            "first value": "Most frameworks return the first header of that name.",
            template: "Edge rules copied per route are rules that one route will miss.",
            user_id: "Someone else's account, served with 200 OK.",
          },
        },
        "strip-all": {
          short: "Strip all",
          title: "Strip identity headers once, before any route",
          body: "Stripping moves out of route templates into the gateway's first step, for every request: every `X-User-*` and `X-Internal-*` header from outside is dropped. Routes with auth then set `X-User-Id` from the token, never append. A route without an auth block fails CI.\n\nA CI test calls every route with a forged header and someone else's token. Forgeries through the gateway stop. Three a day remain: an admin tool on the office network calls the wallet directly, past the gateway.",
          fields: {
            "before any route": "Global, not per route: a new route cannot forget it.",
            "never append": "Set replaces: one value, from the token.",
            "fails the config check": "Missing auth is a build error, not a review comment.",
            "every route": "A test that proves the rule for routes added tomorrow too.",
            directly: "A path that does not go through the gateway gets none of its rules.",
          },
        },
        "verify-inside": {
          short: "Verify inside",
          title: "Services verify a signed identity, not a plain header",
          body: "The gateway now sends the identity as a short signed token: 60 s lifetime, audience `wallet`, the user as subject. The wallet checks the signature and rejects any request without it, from the gateway, the office network or anywhere else.\n\nThen the team searches the logs: 1 912 past requests where the header did not match the token, 37 accounts. Their owners are told. Forged identities drop to zero.",
          fields: {
            "X-Identity": "Signed by the gateway: a header nobody else can produce.",
            "60 s": "Too short to be useful if it leaks into a log.",
            "aud=wallet": "A token for the wallet cannot be replayed at another service.",
            "401": "No valid identity, no answer: the network path no longer matters.",
            "37 accounts": "The damage that already happened, found and reported.",
          },
        },
      },
    },
  },
};

export default text;
