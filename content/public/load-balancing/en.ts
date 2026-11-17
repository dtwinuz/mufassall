import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Load balancing",
  summary:
    "One balancer, three app servers. How the balancer chooses where each request goes, why the wrong choice leaves one server burning while the others idle, how it notices a dead server, and what sticky sessions really cost.",
  learn: [
    "L4 vs L7: balancing connections vs balancing requests",
    "Round robin, least connections and weights, and when each one fails",
    "Health checks: how a dead server leaves the pool",
    "Why sticky sessions unbalance the load, and the stateless alternative",
  ],
  nodes: {
    clients: "Clients",
    lb: "Load balancer",
    a: "Server A",
    b: "Server B",
    c: "Server C",
    db: "Database",
    sessions: "Session store",
  },
  metrics: {
    rps: "Requests",
    p99: "Latency p99",
    errors: "Errors",
    hot: "Busiest server",
  },
  steps: {
    l4: {
      short: "L4",
      title: "An L4 balancer moves connections",
      body: "The balancer works at the transport layer (L4). It sees IP addresses and ports, picks a server when a TCP connection opens, and then just copies bytes both ways.\n\nIt is fast and simple, and it never decrypts anything. But it does not know what an HTTP request is.",
      fields: {
        TCP: "The balancer's whole view: who connects to which port.",
        TLS: "The traffic is encrypted end to end. The balancer cannot see paths or headers.",
        "per connection": "One decision per connection. Every request on that connection goes to the same server.",
      },
    },
    "one-pipe": {
      short: "One pipe",
      title: "One busy connection, one burning server",
      body: "A partner integration opens a single keep-alive connection and sends 400 requests a second through it. The L4 balancer placed that connection on server A once.\n\nA is at 96% and slow; B and C are almost idle. The balancer thinks it is balanced: each server has a similar number of connections.",
      watch: "L4 balances connections, not work. Long-lived connections (HTTP/2, gRPC, WebSockets) make this much worse.",
      fields: {
        "conn 7": "One connection carrying most of the traffic. It stays on A for as long as it lives.",
        "keep-alive": "The client reuses the connection instead of opening new ones, so the balancer never gets to choose again.",
      },
    },
    l7: {
      short: "L7",
      title: "An L7 balancer moves requests",
      body: "The balancer now terminates TLS and speaks HTTP (L7). It reads each request and picks a server per request, even if they all arrive on one connection.\n\nThe partner's 400 requests a second spread over all three servers. Each is at 52%, p99 back to 150 ms.",
      watch: "L7 costs more CPU on the balancer (decryption, parsing), and it now holds the TLS certificate and key.",
      fields: {
        "X-Forwarded-For": "The client's address. Behind an L7 balancer, the app only sees the balancer's IP.",
        "X-Forwarded-Proto": "The client used HTTPS. The hop to the app may be plain HTTP inside the network.",
        "X-Request-Id": "Added by the balancer, so one request can be traced across its log and the app's.",
      },
    },
    "round-robin": {
      short: "Round robin",
      title: "Round robin: take turns",
      body: "The simplest algorithm: A, B, C, A, B, C… Each server gets the same number of requests. Traffic grows to 1 300 a second and it still works.\n\nRound robin assumes every request costs about the same, and every server is about the same size.",
      fields: {
        upstream: "Which server got the request. Strict rotation: a, b, c, a.",
      },
    },
    heavy: {
      short: "Heavy",
      title: "Same count, very different work",
      body: "A new report export takes 4 seconds per request; a normal request takes 13 ms. By bad luck, several exports land on C in a row, and round robin keeps sending C its fair share of everything else.\n\nC is at 98% with a long queue; A and B have room. p99 jumps to 2.6 s.",
      fields: {
        export: "One of these is as much work as about 300 normal requests.",
        "Server-Timing": "4.1 s of work. Round robin counts it as one request, like any other.",
      },
    },
    "least-conn": {
      short: "Least conn",
      title: "Least connections: ask who is free",
      body: "The balancer now tracks how many requests each server is working on right now and sends the next one to the server with the fewest.\n\nC, busy with exports, gets fewer new requests until it catches up. The busiest server drops to 72%, p99 to 380 ms.",
      fields: {
        active: "Requests in progress on each server. Slow requests keep this number high.",
        "fewest active": "B wins this time. A slow server automatically gets less traffic.",
      },
    },
    weighted: {
      short: "Weights",
      title: "Weights for unequal servers",
      body: "C is replaced by a machine twice as large. With equal shares it would sit half idle, so it gets weight 2 and the others weight 1.\n\nC now receives twice as many requests and all three run at about 50%. Weights also let you send 5% of traffic to a new version to test it.",
      watch: "Weights are set by hand. If the machines change and the weights do not, the balance quietly goes wrong.",
    },
    dead: {
      short: "Dead server",
      title: "B dies, the balancer keeps sending",
      body: "Server B runs out of memory and crashes. The balancer does not know: it keeps sending B its quarter of the traffic.\n\nEvery request routed to B fails. 25% of all requests return an error while A and C are healthy.",
      fields: {
        "Connection refused": "Nothing is listening on B any more.",
        "502": "The balancer could not get an answer from the server it chose, so the client gets a “bad gateway”.",
      },
    },
    health: {
      short: "Health check",
      title: "Health checks remove a dead server",
      body: "Every 2 seconds the balancer calls `/healthz` on each server. After 3 failures in a row, B is taken out of the pool and its traffic moves to A and C.\n\nErrors drop from 25% to almost zero: only requests in the few seconds before detection fail. When B answers again, it is added back.",
      watch: "Keep `/healthz` cheap and honest. If it checks the database, a database blip can mark every server dead at once.",
      fields: {
        healthz: "A tiny endpoint: “I am up and can serve requests.”",
        "3 of 3": "Several failures in a row, so one slow answer does not throw a server out.",
        removed: "No new requests go to B. The balancer keeps probing it in the background.",
      },
    },
    sticky: {
      short: "Sticky",
      title: "Sticky sessions pin users to a server",
      body: "The cart lives in each server's memory, so the team turns on sticky sessions: the balancer sets a cookie and keeps sending each user to the same server.\n\nB is back, but almost nobody is pinned to it: it sits at 15%. A holds the most active users and runs at 85%. And if A dies, every cart on it is gone.",
      watch: "Stickiness overrides the algorithm. The balancer can no longer move load where there is room.",
      fields: {
        "Set-Cookie": "`lb_route=a`: from now on this user always goes to A, busy or not.",
      },
    },
    "shared-state": {
      short: "Shared state",
      title: "Shared session store, no stickiness",
      body: "Carts and sessions move to a shared store that every server reads. Stickiness is turned off, and the balancer is free to choose again.\n\nAll three servers are back to about 55%, and losing any one of them no longer loses anyone's cart.",
      fields: {
        HGETALL: "Reads the whole session in one call, about half a millisecond inside the data centre.",
        user_id: "Who the user is. Any server can read it, so any server can answer.",
        ttl: "The session expires after 30 minutes of inactivity, on its own.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "A balancer is only as good as its choices.\n\n1) L4 balances connections, L7 balances requests: long-lived connections need L7. 2) Round robin for equal work, least connections for uneven work, weights for unequal servers. 3) Health checks take dead servers out in seconds. 4) Sticky sessions trade balance and resilience for convenience; shared state is the better fix.",
    },
  },
};

export default text;
