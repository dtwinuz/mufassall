import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "API styles",
  summary:
    "One screen of a food-delivery app, \"My orders\", built with REST, then GraphQL, with gRPC between services. Where each style fetches too much or too little, and the habits every API needs: cursor pagination, versioning and idempotency keys.",
  learn: [
    "Over-fetching, under-fetching and the N+1 calls they cause",
    "REST, GraphQL and gRPC: what each is good at, on the same feature",
    "Cursor pagination instead of `OFFSET`, and a new version instead of a breaking change",
    "An `Idempotency-Key` that makes a repeated `POST` safe",
  ],
  nodes: {
    phone: "Phone app",
    api: "REST API",
    db: "Database",
    gql: "GraphQL server",
    pricing: "Pricing service",
  },
  metrics: {
    calls: "Calls per screen",
    screen: "Screen load",
    payload: "Data per screen",
    double: "Double orders",
  },
  steps: {
    rest: {
      short: "REST",
      title: "REST: one resource, one URL",
      body: "The \"My orders\" screen needs, for each of the last 20 orders, its status and the restaurant name. The REST API has a resource for that: `GET /v1/orders`.\n\nIt returns the full order object, about 40 fields: address, items, courier. The screen uses two of them. Downloading fields nobody shows is called **over-fetching**.",
      check: {
        q: "The list has only `restaurant_id`, but the screen needs the name. What does the app end up doing?",
        options: [
          "Shows the IDs instead of restaurant names",
          "Makes one extra call per order: 21 in total",
          "Asks the API once for all 20 restaurants",
        ],
        answer: 1,
        why: "The name is missing, so the app fetches each restaurant separately: one call for the list and twenty more. On a mobile network the screen now takes 2.6 s.",
      },
      fields: {
        GET: "Reading only. Safe to repeat and easy to cache.",
        data: "The list itself. Keeping it under a key leaves room for paging info next to it.",
        restaurant_id: "Only an ID. The screen needs the name, which is not here.",
        items: "Bulky fields the screen never shows, sent on every load anyway.",
      },
    },
    "n-plus-one": {
      short: "N+1",
      title: "Under-fetching: 1 + 20 calls",
      body: "The name is missing, so the app fetches each restaurant separately: one call for the list and twenty more, one per order. This is **under-fetching** and the N+1 pattern.\n\nOn a mobile network every call costs 100+ ms, and the phone can only run a few at once. The screen takes 2.6 s to appear.",
      watch: "Calls in a loop over a list are the classic sign of N+1, on the phone and on the server alike.",
      fields: {
        "21 requests": "One for the list, one per order. The screen waits for the slowest one.",
        r_7: "One restaurant at a time. Often the same restaurant is fetched twice.",
        "17 more": "The cost grows with the list: 50 orders means 51 calls.",
      },
    },
    expand: {
      short: "Expand",
      title: "Let the client choose fields",
      body: "The REST API learns two parameters: `fields` lists what to return and `expand` embeds a related object. One call now returns exactly the list the screen draws.\n\nThe fix works, but each new screen asks for new combinations, and the API team keeps adding them. This pressure is why GraphQL exists.",
      fields: {
        fields: "Only these fields come back. The response shrinks from 40 fields to 2.",
        expand: "Embed the restaurant into each order instead of returning just its ID.",
        restaurant: "The name is inside the order now. No second call.",
      },
    },
    graphql: {
      short: "GraphQL",
      title: "GraphQL: the client writes the query",
      body: "A GraphQL server describes all data as one typed schema. The app sends a query that lists exactly the fields it needs, nested as deep as the screen needs, through one URL.\n\nOne call, no extra fields. The price: every query is different, so a plain HTTP cache does not help, and the server must guard against very heavy queries.",
      watch: "Limit query depth and cost, otherwise one client can ask for the whole database in a single request.",
      check: {
        q: "The phone now sends one GraphQL query. What happens behind it on the server?",
        options: [
          "One join query returns orders with restaurants",
          "The server forwards it to REST: one call in total",
          "21 database queries, one per order's restaurant",
        ],
        answer: 2,
        why: "The server resolves `restaurant` separately for each order, so 21 database queries hide behind one request. Database load jumps to 75% and the screen slows down again.",
      },
      fields: {
        query: "A read. Changes go through a `mutation` instead.",
        orders: "The answer has the same shape as the query.",
        restaurant: "A nested object, resolved on the server, not by a second call from the phone.",
      },
    },
    "resolver-n1": {
      short: "N+1 again",
      title: "The N+1 moved to the server",
      body: "The phone makes one call, but the GraphQL server resolves `restaurant` separately for each order. Twenty-one database queries hide behind one request.\n\nThe database load jumps to 75% and the screen slows down again, now because of the server.",
      fields: {
        LIMIT: "The first query: 20 orders. So far so good.",
        r_7: "Then one query per order for its restaurant.",
        "18 more": "Twenty queries, each a round trip to the database.",
      },
    },
    batch: {
      short: "Batch",
      title: "Collect the IDs, ask once",
      body: "The server now collects all the restaurant IDs a request needs and asks the database once with `IN (...)`. This batching tool is often called a DataLoader.\n\nTwo queries instead of twenty-one. Repeated restaurants are fetched once.",
      fields: {
        IN: "All the IDs in one query.",
        "14 rows": "Twenty orders, but only fourteen different restaurants: repeats are merged.",
      },
    },
    grpc: {
      short: "gRPC",
      title: "gRPC between services",
      body: "The screen also shows a delivery fee and time from the pricing service. Between two backend services the team uses gRPC: a call to a typed method, defined in a `.proto` file, in a compact binary format over HTTP/2.\n\nBoth sides generate code from one contract, so a missing field breaks the build, not production. Browsers cannot call gRPC directly, which is why it lives inside the backend.",
      fields: {
        Quote: "The method name is part of the path: `service/method`, not a resource.",
        "grpc-timeout": "The caller gives the call 150 ms. The deadline travels with it to the next service.",
        QuoteRequest: "Shown decoded. On the wire it is a few dozen bytes of protobuf.",
        "grpc-status": "`0` is OK. Errors come in the trailers, not as an HTTP status.",
      },
    },
    offset: {
      short: "Offset",
      title: "Page 2 repeats page 1",
      body: "Older orders load as you scroll, with `OFFSET 20`. While the user looks at page 1, a new order arrives. Every row moves down by one, and page 2 starts with an order that is already on screen.\n\nAnd on deep pages `OFFSET 5000` still reads 5000 rows only to throw them away.",
      fields: {
        OFFSET: "Skip 20 rows, counted at the moment of this query, not of the first page.",
        ord_962: "The last order of page 1 comes back as the first of page 2.",
        "already shown": "A duplicate on screen. With deletions, rows get skipped instead.",
      },
    },
    cursor: {
      short: "Cursor",
      title: "Cursor pagination in `/v2`",
      body: "The page now says where it ended, not how many rows to skip: \"give me 20 orders after this one\". New orders on top do not move anything, and the database jumps straight to the place by index.\n\nOld app versions still call `/v1` with offsets and will for months. So the change ships as `/v2`, and `/v1` stays until its traffic is gone.",
      watch: "Adding a field is safe. Renaming, removing or changing what a field means needs a new version.",
      fields: {
        v2: "A new version for a new contract. Installed apps keep using `/v1`.",
        after: "Continue after this order. The value is opaque: the client does not parse it.",
        next_cursor: "Where the next page starts. Missing when there is nothing more.",
      },
    },
    "double-post": {
      short: "Double POST",
      title: "The retry places a second order",
      body: "The user taps \"Order\". The request reaches the server and the order is created, but the network drops the response. The app sees an error and repeats the `POST`.\n\nThe server cannot tell a repeat from a new order. The user gets two orders and two charges.",
      watch: "A `POST` is not safe to repeat by default. Mobile networks guarantee repeats.",
      check: {
        q: "How can the server tell a retried order from a new one?",
        options: [
          "The app sends the same random key with each retry",
          "The server rejects a second order for the same `cart_id`",
          "The app waits longer for the response before retrying",
        ],
        answer: 0,
        why: "With an `Idempotency-Key` the server stores the key with its response. A repeat with a known key creates nothing and gets the saved response, so double orders drop to zero.",
      },
      fields: {
        POST: "Creates something new on every call.",
        cart_id: "The same cart both times. The server does not use it to spot repeats.",
        id: "A second order, `ord_991`. The first one, `ord_990`, also exists.",
      },
    },
    "idempotency-key": {
      short: "Idempotency",
      title: "`Idempotency-Key`: the same answer for a repeat",
      body: "Before the first try the app generates a random key and sends it with every repeat of this order. The server stores the key with the response.\n\nIf the key is already known, the server does not create anything: it returns the saved response. The user gets one order, whatever the network does.",
      fields: {
        "Idempotency-Key": "One key per user action, not per attempt. The server keeps it for a day or so.",
        "Idempotent-Replayed": "This is the stored response of the first attempt, not a new order.",
        id: "`ord_990`, the original order.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Five habits for APIs.\n\n1) REST is simple and caches well, but watch for N+1 and fat responses. 2) GraphQL lets the client choose, but batch the resolvers and limit query cost. 3) gRPC fits calls between your own services. 4) Page by cursor and ship breaking changes as a new version. 5) Every `POST` that creates something accepts an `Idempotency-Key`.",
    },
  },
};

export default text;
