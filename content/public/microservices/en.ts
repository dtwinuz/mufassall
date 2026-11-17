import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Microservices",
  summary:
    "An online bookshop starts as one app and one database. When does splitting it into services help, what does each split cost, and where does an API gateway fit.",
  learn: [
    "Why to start with a monolith, and the signals that it is time to split",
    "What a split buys: independent deploys, teams and scaling",
    "What it costs: network calls, partial failure, data ownership, distributed debugging",
    "What an API gateway does at the edge",
  ],
  nodes: {
    client: "Customer",
    app: "Shop app",
    db: "Shop DB",
    gw: "API gateway",
    search: "Search service",
    pay: "Payments service",
    paydb: "Payments DB",
    queue: "Event log",
  },
  metrics: {
    deploys: "Deploys",
    p95: "Request p95",
    hops: "Services per order",
    failed: "Failed requests",
  },
  steps: {
    monolith: {
      short: "Monolith",
      title: "One app, one database",
      body: "The shop is one app with one database. Placing an order is a single transaction: take a book from stock, create the order, record the payment. Either all three happen or none.\n\nFive developers, one deploy a week, 140 ms per request. This is the right design for now: simple to run, simple to debug.",
      fields: {
        BEGIN: "Start of one local transaction. The database guarantees all-or-nothing for free.",
        payments: "Payments are just another table in the same database. Remember this; it will not stay that way.",
        COMMIT: "Stock, order and payment become visible together, at one moment.",
      },
    },
    crowded: {
      short: "Crowded",
      title: "One team's problem is everyone's problem",
      body: "Two years later: 40 developers in five teams, one codebase. A sale brings a flood of searches; search eats the CPU and checkout slows down with it, because both run in the same process.\n\nA failing search test blocks the release of everyone else. Deploys drop to one every ten days. These are the real reasons to split: team independence and one part with a very different load.",
      watch: "Splitting because \"microservices are modern\" buys all the costs and none of the benefits. Split when you can name the pain.",
      fields: {
        "X-Response-Time": "1.8 s for a page that used to take 140 ms.",
        "search 71%": "One feature uses most of the CPU. You cannot scale search alone; you can only copy the whole app.",
        blocked: "Unrelated teams wait for the search team to fix their tests.",
      },
    },
    "split-search": {
      short: "Search out",
      title: "Split out the part that hurts",
      body: "Search becomes its own service with its own index, owned by one team. It is read-heavy and easy to cut out. A gateway in front sends `/search` to it and everything else to the app.\n\nSearch now scales on its own and deploys when its team wants. The app is calm again: p95 back to 220 ms.",
      fields: {
        Host: "An internal address. Customers never see it; they only talk to the gateway.",
        hits: "Search answers from its own index, which it builds from book data published by the app.",
        took_ms: "12 ms inside search. The rest of the time is now network.",
      },
    },
    gateway: {
      short: "Gateway",
      title: "The API gateway: one front door",
      body: "Customers see one host. The gateway checks the token, applies rate limits, adds a request id and routes by path. Services behind it do not repeat this work.\n\nIt also hides the inside: you can split or merge services later without changing a single client.",
      watch: "Keep business logic out of the gateway. If it starts knowing about orders, it becomes a new monolith in front of the old one.",
      fields: {
        Host: "The only public address. All services live behind it.",
        Authorization: "The gateway checks the token once. Services receive the verified user, not the raw token.",
        "X-RateLimit-Remaining": "Limits are counted at the edge, before a request costs any service anything.",
        "X-Request-Id": "Created here and passed to every service, so one request can be followed across them.",
      },
    },
    "split-pay": {
      short: "Payments out",
      title: "Payments get their own service and database",
      body: "The payments team wants to deploy daily and keep card data away from everything else. Payments becomes a service with its own database. The app calls it over HTTP.\n\nDeploys go up to six per day. But the single transaction from step one is gone: the order is in one database, the payment in another.",
      fields: {
        order_id: "The order lives in the shop DB. Payments only knows its number.",
        payment_id: "Created in the payments DB. Two databases, two separate commits.",
        status: "`pending`: payment is a process now, not a row inside the order transaction.",
      },
    },
    partial: {
      short: "Partial",
      title: "Partial failure",
      body: "Payments goes down. The app is up, the shop DB is up, and orders still arrive. The call times out after 2 seconds: the order is saved, but nobody knows if it was paid.\n\nIn the monolith this could not happen: the whole thing worked or the whole thing failed. Now every network call needs a timeout and a plan for \"the other side is down\".",
      fields: {
        timeout: "No answer in 2 s. Payments may be dead, or slow, or may have done the work.",
        "payment unknown": "The worst state: not failed, not done. Someone has to resolve it later.",
      },
    },
    "shared-db": {
      short: "Shared DB",
      title: "Reading another service's tables",
      body: "To show the order total, the payments team reads the shop DB directly. It works until the shop team renames a column in a normal release.\n\nPayments breaks with no change on its side. A shared database couples two teams as tightly as one codebase did.",
      watch: "Each service owns its data. Others ask through its API or listen to its events; nobody reads its tables.",
      fields: {
        ERROR: "The column the payments code depends on no longer exists.",
        HINT: "A routine rename by another team. Their tests passed; yours broke.",
      },
    },
    events: {
      short: "Events",
      title: "Own your data, publish events",
      body: "The shared read and the direct call are gone. When an order is placed, the app writes an `OrderPlaced` event to an event log. Payments reads it and keeps its own copy of what it needs.\n\nIf payments is down, events wait in the log and are processed when it returns. Nothing is lost and orders keep coming in.",
      fields: {
        key: "Events with the same key go to the same partition, so one order's events stay in order.",
        type: "A named fact, not a request. Payments decides what to do with it.",
        amount: "Payments gets the total from the event, so it never needs to read the shop DB.",
      },
    },
    debugging: {
      short: "Debugging",
      title: "The bill: debugging across services",
      body: "One order now touches the gateway, the app, the event log and payments. A bug report means four sets of logs, a queue in the middle, and no single stack trace.\n\nWithout a trace id carried in every call and every event, nobody can follow one order end to end. Tracing, central logs and per-service dashboards are part of the price of splitting.",
      fields: {
        offset: "Where this event sits in the log. Lets you replay it or see how far behind payments is.",
        traceparent: "The trace id travels inside the event too, so the async hop shows up in the same trace.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Start with a monolith with clean modules. Split only for a reason you can name.\n\n1) Good reasons: teams blocking each other, one part with very different load, a part needing its own release pace or isolation. 2) Each split turns function calls into network calls: timeouts, partial failure, no shared transaction. 3) Each service owns its data; others use its API or events. 4) Put a gateway at the edge for auth, limits and routing. 5) Budget for tracing and central logs before you split, not after.",
    },
  },
};

export default text;
