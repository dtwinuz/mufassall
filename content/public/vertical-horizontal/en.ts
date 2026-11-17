import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Scaling up vs scaling out",
  summary:
    "A feed API outgrows its server. First it moves to a bigger box, until there is no bigger box and the one box falls over. Then it spreads over several smaller ones, and learns why that needs a load balancer and an app that remembers nothing.",
  learn: [
    "Vertical scaling: why it is easy, and where it stops",
    "Why one server is a single point of failure, however big",
    "What horizontal scaling needs: a load balancer and stateless app servers",
    "Why you keep one server's worth of spare capacity (N+1)",
  ],
  nodes: {
    users: "Users",
    app: "App server 1",
    app2: "App server 2",
    app3: "App server 3",
    db: "Database",
    lb: "Load balancer",
    sessions: "Session store",
  },
  metrics: {
    rps: "Served",
    p95: "Latency p95",
    errors: "Errors",
    cost: "Cost per month",
  },
  steps: {
    "one-box": {
      short: "One box",
      title: "One server does everything",
      body: "A small feed API runs on one 4-vCPU server. 300 requests a second, 45% busy, answers in 80 ms.\n\nThis is the right start. One machine is simple to deploy, debug and pay for.",
      fields: {
        "X-Served-By": "Which server answered. Right now there is only one.",
        "Server-Timing": "38 ms of app work. The rest is network.",
      },
    },
    growth: {
      short: "Growth",
      title: "Traffic doubles, the box is full",
      body: "After a marketing push, users want 700 requests a second. The server can finish about 600; it sits at 97% and requests queue up.\n\np95 jumps to 1.4 s and 4% of requests are turned away.",
      fields: {
        "503": "The server's queue is full, so it refuses the request.",
        "Server-Timing": "1.2 s waiting in line, 41 ms of work. The work is fine; there is just not enough server.",
      },
    },
    "scale-up": {
      short: "Scale up",
      title: "Vertical scaling: a bigger box",
      body: "The easiest fix: move to a 16-vCPU server. No code changes, one restart. Load drops to 42%, p95 back to 85 ms.\n\nThe price grows with the size: four times the CPU, four times the bill.",
      watch: "Scaling up usually means a restart. With one server, that restart is downtime.",
    },
    ceiling: {
      short: "Ceiling",
      title: "There is no bigger box",
      body: "A year later: 2 400 requests a second. The app now runs on the largest machine the provider sells, 64 vCPU, at 88%. One process uses 64 cores far less efficiently than 4: locks and shared memory eat much of the gain. Next year's growth has nowhere to go.\n\nThe largest sizes are also the most expensive per CPU: this box costs 2 900 a month.",
      watch: "Vertical scaling hits a hard ceiling, and the last steps below it are the most expensive ones.",
    },
    crash: {
      short: "Crash",
      title: "One box, one failure",
      body: "A failed disk takes the server down. Every user gets an error at once: there is nothing else to answer.\n\nHowever big, one machine is a **single point of failure**. Every kernel update, deploy or hardware fault becomes an outage.",
      fields: {
        "Failed to connect": "The address still points at the one dead server.",
        "Connection refused": "Nothing is listening. 100% of requests fail until the box is back.",
      },
    },
    "scale-out": {
      short: "Scale out",
      title: "Horizontal scaling: more boxes",
      body: "Instead of one 64-vCPU giant, three 8-vCPU servers. A **load balancer** gets the public address and spreads requests across them; each runs at 62%.\n\nThree medium servers plus the balancer cost about 1 000 a month instead of 2 900. Growth now means adding a fourth.",
      check: {
        q: "Sessions still live in the memory of the server where the user logged in. What do users see now?",
        options: [
          "Nothing new: the cookie carries the whole session",
          "They keep getting sent back to the login page",
          "Only the first request is slower than usual",
        ],
        answer: 1,
        why: "The balancer sends each request to any server, and the others have never heard of that session. Two requests out of three land on a wrong server: the user is sent to login and the cart looks empty.",
      },
      fields: {
        "X-Forwarded-For": "The real user address, added by the balancer. The app sees the balancer's IP otherwise.",
        "X-Request-Id": "One ID to find this request in the logs of whichever server handled it.",
        "X-Served-By": "This time `app-2` answered. The next request may land anywhere.",
      },
    },
    "logged-out": {
      short: "Logged out",
      title: "Users keep getting logged out",
      body: "Sessions were stored in the memory of the server where the user logged in. The next request lands on another server, which has never heard of that session.\n\nTwo requests out of three go to a “wrong” server: the user is sent back to the login page, the cart looks empty.",
      watch: "Anything a server keeps in its own memory between requests stops working once there is more than one server.",
      fields: {
        Cookie: "The session ID, valid only on `app-1`. A secret, so it is hidden here.",
        Location: "`app-2` does not know the session and redirects to login.",
      },
    },
    stateless: {
      short: "Stateless",
      title: "Make the app servers stateless",
      body: "Sessions move to a shared, fast session store. Every app server reads the session from there on each request and keeps nothing between requests.\n\nNow any server can answer any request. Servers can be added, removed or restarted without users noticing.",
      check: {
        q: "`app-2` crashes. What happens to the users it was serving?",
        options: [
          "Few notice: it leaves the pool, the others take over",
          "They are logged out: their sessions died with it",
          "Every request fails until `app-2` is back",
        ],
        answer: 0,
        why: "The health check stops getting answers and `app-2` leaves rotation within seconds. Sessions live in the shared store, so the other two serve its users; only requests in those seconds fail, but the two now run at 92%.",
      },
      fields: {
        session: "The key is a hash of the cookie, never the cookie itself.",
        user_id: "Who the user is. Any server can read it.",
        cart_items: "State that used to live in one server's memory. Now it survives any server going away.",
      },
    },
    "lose-one": {
      short: "Lose one",
      title: "One server dies, users barely notice",
      body: "`app-2` crashes. The balancer's health check stops getting answers and takes it out of rotation within a few seconds. Its traffic moves to the other two.\n\nOnly the requests in those few seconds fail. But the remaining two now run at 92%: one more failure and they are full.",
      watch: "Keep **N+1**: enough servers that losing one still leaves the rest below about 70%. Here that means a fourth server.",
      fields: {
        healthz: "A tiny endpoint the balancer calls every couple of seconds to ask “are you alive?”.",
        "no response": "Three missed checks in a row and the server is considered dead.",
        removed: "No new requests go to `app-2` until it answers health checks again.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Scale up first: it is simple. Scale out when the box gets too expensive, too big, or too risky to be the only one.\n\n1) One server, however big, is a single point of failure. 2) Many servers need a load balancer in front. 3) App servers must be stateless: sessions and files go to shared stores. 4) Keep N+1. 5) The database is still one box: it is the next thing to scale.",
    },
  },
};

export default text;
