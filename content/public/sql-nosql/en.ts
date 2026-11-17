import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "SQL and NoSQL",
  summary:
    "One shop, several kinds of data. Orders need joins and transactions, an order page wants one read, page views arrive tens of thousands a second, a cart is fetched by one key. How to choose a store by the way the data is read and written, and what happens when the questions change.",
  learn: [
    "What a relational database gives you: joins, transactions, new questions without redesign",
    "Document stores: the whole object in one read, shaped for one access pattern",
    "Wide-column stores: huge write rates, but one table per question",
    "Key-value stores: the fastest lookup, and nothing else",
  ],
  nodes: {
    client: "Shop app",
    api: "API",
    sql: "Relational DB",
    docs: "Document store",
    events: "Wide-column store",
    kv: "Key-value store",
  },
  metrics: {
    p95: "Query p95",
    scanned: "Rows read per query",
    writes: "Writes accepted",
  },
  steps: {
    tables: {
      short: "Tables",
      title: "Relational: data in tables, joined on read",
      body: "Orders, order lines and products live in separate tables. Each fact is stored once: a product's name lives only in `products`.\n\nTo show order 901, the database **joins** the three tables by their keys. One query, three rows, a few milliseconds.",
      fields: {
        JOIN: "Combine rows of two tables where the keys match.",
        ON: "The rule for matching: an order line belongs to the order with this ID.",
        "3 rows": "One row per order line, already combined with the product name.",
      },
    },
    transaction: {
      short: "Transaction",
      title: "A transaction: all or nothing",
      body: "Placing an order is two writes: create the order and take the lamps off the stock. Both must happen, or neither.\n\nThe database guarantees it: if the stock is too low or the server crashes in the middle, nothing is saved. This is what relational databases are built for.",
      fields: {
        BEGIN: "Everything until `COMMIT` is one unit.",
        "stock >= 2": "The database itself refuses to sell what is not in stock, even with two buyers at the same moment.",
        COMMIT: "Both writes become visible together.",
      },
    },
    document: {
      short: "Document",
      title: "A document: the whole order in one read",
      body: "A document store keeps the order as one JSON object, lines and product names inside it. Reading it is one lookup, with no join.\n\nFor the order page this is ideal: the page needs exactly this object, every time.",
      watch: "The product name is copied into the order. That is fine for an order (it shows what was bought), but every copy must be updated if it is meant to change.",
      check: {
        q: "The business asks which orders contain lamp `p_17`. That field has no index. What does the document store do?",
        options: [
          "One fast lookup, like reading by `_id`",
          "Reads every order document and checks each",
          "Rejects it: documents cannot be searched",
        ],
        answer: 1,
        why: "The documents are shaped around reading one order, not around products. Without an index the store reads all 4.8 million orders, and the query takes about 3.4 seconds.",
      },
      fields: {
        _id: "The document's key. Reading by key is the fast path.",
        items: "The order lines live inside the order, not in another table.",
        name: "A copy of the product name, frozen at the time of purchase.",
      },
    },
    "new-question": {
      short: "New question",
      title: "A new question the model was not built for",
      body: "The business asks: “which orders contain lamp `p_17`?”. The documents were shaped around reading one order, not around products.\n\nWithout an index on that field the store reads all 4.8 million orders to find the matching ones. The query takes seconds and slows down everything else.",
      watch: "A document model is designed around known queries. Every new question means a new index, a new copy of the data, or a full scan.",
      check: {
        q: "The same question goes to the relational DB, where order lines are a table indexed by `product_id`. What does it take?",
        options: [
          "A schema change and a data migration first",
          "A second copy of the orders keyed by product",
          "Just a new query, answered in about 2 ms",
        ],
        answer: 2,
        why: "Order lines already live in their own table with an index on `product_id`. The new question is a plain `GROUP BY` query that reads only product 17's lines; nothing in the schema changes.",
      },
      fields: {
        COLLSCAN: "A collection scan: every document is read and checked.",
        docsExamined: "4.8 million documents read to answer one question.",
      },
    },
    "relational-answer": {
      short: "Ad-hoc query",
      title: "The same question in SQL",
      body: "In the relational database order lines are already a table with an index on `product_id`. The new question is just a new query; nothing about the schema changes.\n\nThis is the main strength of relational storage: questions nobody thought of when designing the tables are still cheap to answer.",
      fields: {
        "GROUP BY": "Sum the quantities per product, inside the database.",
        "Index Scan": "Only the lines for product 17 are read, through the index, not the whole table.",
      },
    },
    "hot-writes": {
      short: "Write flood",
      title: "Page views flood the relational database",
      body: "A new feature records every page view: 40 000 inserts a second. The same database also serves orders and payments.\n\nIt runs out of connections and disk throughput, and orders start to fail along with the page views.",
      fields: {
        page_views: "One small row per view. Never updated, rarely read one by one.",
        ERROR: "The database refuses new connections. Orders fail too, not just the views.",
      },
    },
    "wide-column": {
      short: "Wide-column",
      title: "A wide-column store for the event stream",
      body: "Page views move to a wide-column store. The table is split by `user_id` across many machines, and inside each user the rows are kept sorted by time.\n\nWrites are spread out and only appended, so the cluster takes 40 000 a second easily. The relational database is left with orders and is calm again.",
      check: {
        q: "Someone asks who viewed one order page. The views table is split by `user_id`. What does the store do?",
        options: [
          "Refuses the query: page is not the key",
          "Asks every machine and answers slowly",
          "Answers fast using the time-sorted rows",
        ],
        answer: 0,
        why: "To answer by page the store would have to ask every machine and read everything, so it rejects the query instead. In a wide-column store you can only ask by the key the table was built on.",
      },
      fields: {
        views_by_user: "The table is named after its question: the views of one user, newest first.",
        user_id: "The partition key. It decides which machines store the row.",
        TTL: "Rows delete themselves after 30 days. No cleanup jobs.",
      },
    },
    "wrong-key": {
      short: "Wrong key",
      title: "Asking by a column that is not the key",
      body: "Now someone asks “who viewed this order page?”. The table is split by user, not by page, so the store would have to ask every machine and read everything.\n\nIt refuses instead. In this kind of store you can only ask by the key the table was built on.",
      fields: {
        InvalidRequest: "The store rejects the query rather than run a full cluster scan.",
        "ALLOW FILTERING": "The escape hatch. On a big table it reads everything; do not use it in production.",
      },
    },
    "second-table": {
      short: "Two tables",
      title: "One table per question",
      body: "The fix is to store the same view twice: once split by user, once split by page. Each question reads its own table by its own key.\n\nWrites double and the data is duplicated, which is the normal price in a wide-column store. The relational database would have answered with one index.",
      fields: {
        views_by_page: "The same event, keyed by page this time.",
        "APPLY BATCH": "Both inserts are sent together, so the two tables do not drift apart.",
      },
    },
    "key-value": {
      short: "Key-value",
      title: "A key-value store for the cart",
      body: "The cart is read and written only by the user's ID, many times per visit. A key-value store does exactly that: get by key, set by key, from memory.\n\nIt answers in a millisecond but cannot search, join or sum. That is fine, because the cart never needs it.",
      fields: {
        HGETALL: "Read all fields of one key: product IDs and quantities.",
        "cart:u_42": "The key is the only way in. No other question can be asked.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Choose the store by how the data is used.\n\n1) Relational: joins, transactions, and new questions without redesign; the default for business data. 2) Document: one object in one read, when the access pattern is known. 3) Wide-column: very high write rates, one table per question. 4) Key-value: lookup by key and nothing else. One system often uses several.",
    },
  },
};

export default text;
