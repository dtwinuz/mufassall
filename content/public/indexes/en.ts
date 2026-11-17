import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Database indexes",
  summary:
    "An order history page gets slow as the table grows to 40 million rows. We read the query plan, add the right B-tree indexes, and see what every index costs on writes.",
  learn: [
    "Read `EXPLAIN`: a `Seq Scan` versus an `Index Scan`",
    "Why the column order of a composite index decides which queries it serves",
    "How a covering index answers a query without touching the table",
    "Why every extra index slows down every `INSERT`",
  ],
  nodes: {
    app: "Shop app",
    api: "Orders API",
    db: "Orders DB",
    report: "Daily report",
    import: "Bulk import",
  },
  metrics: {
    p95: "Page p95",
    scanned: "Rows read per query",
    insert: "Insert per row",
    indexes: "Indexes on orders",
  },
  steps: {
    slow: {
      short: "Slow page",
      title: "The order history page takes 2.4 seconds",
      body: "A customer opens \"My orders\". The API asks the database for the 20 newest orders of customer `42`.\n\nThe `orders` table now has 40 million rows, and the page takes over two seconds. The database is at 95% load, and it only answered one page.",
      fields: {
        customer_id: "The filter. Nothing tells the database where the rows of customer 42 are.",
        LIMIT: "We want only 20 rows. The database still has to find all candidates first.",
        Time: "2.4 seconds for 20 rows. That is the time to read the whole table.",
      },
    },
    "seq-scan": {
      short: "Seq Scan",
      title: "EXPLAIN shows a full table scan",
      body: "`EXPLAIN ANALYZE` runs the query and prints the plan the database chose. Read it from the inside out: the innermost line runs first.\n\nThe plan reads every row of `orders`, throws away all but 1 800, sorts them and keeps 20. Under real traffic the API waits, and the app starts timing out.",
      watch: "A full scan is fine on 1 000 rows. On 40 million it is an outage that grows with the table.",
      fields: {
        EXPLAIN: "Shows the plan. With `ANALYZE` it also runs the query and reports real row counts and time.",
        "Seq Scan": "Sequential scan: read the table from start to end. No index was usable.",
        "Rows Removed by Filter": "Almost 40 million rows read for nothing. This line is the problem in one number.",
        "Execution Time": "Time inside the database, without the network.",
      },
    },
    btree: {
      short: "B-tree",
      title: "A B-tree index on customer_id",
      body: "An index is a separate sorted structure: a B-tree of `customer_id` values, each pointing to its rows in the table. To find customer 42 the database walks 3–4 levels of the tree instead of 40 million rows.\n\n`CONCURRENTLY` builds it without locking writes. The page drops to 35 ms: it now reads only this customer's 1 800 rows.",
      check: {
        q: "Customer 7 has 250 000 orders. How fast is their page with the `customer_id` index?",
        options: [
          "Fast: the tree walk is the same for any customer",
          "Slow: the database skips the index for big customers",
          "Slow again: all 250 000 rows are fetched and sorted",
        ],
        answer: 2,
        why: "The index finds the customer's rows, but not in date order. The database reads all 250 000 and sorts them to keep 20, so page p95 is back at 900 ms.",
      },
      fields: {
        CONCURRENTLY: "Builds the index while the table keeps taking writes. Slower to build, but no lock on a live table.",
        customer_id: "The indexed column. Lookups by it become a tree walk.",
        Time: "Three minutes to build on 40 million rows. Run it outside peak hours.",
      },
    },
    "big-customer": {
      short: "Big customer",
      title: "A wholesale customer with 250 000 orders",
      body: "Customer `7` is a reseller with 250 000 orders. The index finds their rows fast, but they are not in date order.\n\nSo the database fetches all 250 000 rows from the table and sorts them just to keep the newest 20. The page takes 900 ms again, only for big customers.",
      fields: {
        "Index Cond": "The index is used, but only to find the customer.",
        "Sort Method": "A sort after the index: the rows came out in the wrong order.",
        "Execution Time": "Grows with the size of the customer, not with the page size.",
      },
    },
    composite: {
      short: "Composite",
      title: "One index on two columns",
      body: "A composite index `(customer_id, created_at DESC)` is sorted by customer first, then by date inside each customer. The database jumps to customer 7 and reads the first 20 entries: they are already the newest.\n\nNo sort, 20 rows read, under 1 ms. The old single-column index is now a prefix of this one and does nothing useful.",
      check: {
        q: "A daily report filters only on `created_at`. Does the `(customer_id, created_at)` index help it?",
        options: [
          "No: without `customer_id` the plan is a full scan",
          "Yes: `created_at` is in the index, so it is used",
          "Partly: only the date part of the index is scanned",
        ],
        answer: 0,
        why: "A composite index serves its leading columns, from left to right. A filter on the second column alone gets a `Seq Scan` over 40 million rows, and it loads the database so much that page p95 rises to 420 ms.",
      },
      fields: {
        idx_orders_cust_created: "Sorted by `customer_id`, then by `created_at` from newest to oldest.",
        "Index Cond": "Same filter, but the rows come out in the right order.",
        "Execution Time": "From 884 ms to 0.9 ms, no matter how big the customer is.",
      },
    },
    "column-order": {
      short: "Column order",
      title: "The new index does not help yesterday's report",
      body: "A daily report sums all orders since yesterday, for every customer. It filters on `created_at` only, and the plan is a full scan again.\n\nThe composite index is like a phone book sorted by surname, then first name. It cannot find everyone named Anvar: the first column must be in the query. The scan loads the database, and the order page slows down too.",
      watch: "A composite index serves queries on its leading columns, from left to right. A filter on the second column alone gets nothing.",
      fields: {
        created_at: "The report filters only on the second column of the composite index.",
        "Seq Scan": "Back to reading all 40 million rows, once per report run.",
      },
    },
    "report-index": {
      short: "Second index",
      title: "An index for the report's query",
      body: "We add an index on `created_at` alone. The report now reads one day of orders: about 95 000 rows instead of 40 million.\n\nThe order page is fast again. But the table now has four indexes, and the insert time is creeping up.",
      fields: {
        idx_orders_created: "Sorted by date only. A date range is now a short slice of the tree.",
        "Index Cond": "The date filter is answered by the index.",
      },
    },
    covering: {
      short: "Covering",
      title: "A covering index never touches the table",
      body: "Even with the composite index, each of the 20 rows is a jump into the table to read `status` and `total`. That is 20 random page reads.\n\nWe rebuild it as `(customer_id, created_at DESC) INCLUDE (status, total)`. The index now holds every column the page needs, and the table is not read at all.",
      fields: {
        "Index Only Scan": "The answer comes from the index alone.",
        idx_orders_cust_cover: "The composite index plus the two extra columns carried in its leaves.",
        "Heap Fetches": "Zero reads from the table itself. If this number is high, the visibility map is stale and a `VACUUM` is due.",
      },
    },
    "write-cost": {
      short: "Write cost",
      title: "Seven indexes, and imports crawl",
      body: "Over a year, three more indexes were added \"just in case\": on `status`, `total` and the order note. A nightly import loads orders in batches of 500.\n\nEvery new row is written to the table and to all seven indexes. Each index is another tree to update and more WAL to write: insert time grew from 0.3 to 2.4 ms per row.",
      watch: "An index speeds up reads that use it and slows down every write, used or not.",
      check: {
        q: "Imports crawl with seven indexes on `orders`. What speeds up inserts without hurting reads?",
        options: [
          "Rebuild all seven indexes `CONCURRENTLY`",
          "Drop the indexes that show zero scans",
          "Load larger batches of 5 000 rows",
        ],
        answer: 1,
        why: "The index stats show four indexes with zero scans, including `idx_orders_customer` that the composite replaced. Dropping them leaves three, and inserts fall from 2.4 to 0.5 ms per row.",
      },
      fields: {
        "INSERT 0 500": "500 rows inserted. Each one also went into seven B-trees.",
        Time: "1.2 seconds for 500 rows. The same batch took 150 ms with one index.",
      },
    },
    trim: {
      short: "Drop unused",
      title: "Drop the indexes nobody reads",
      body: "The database counts how many times each index was used. Four of them show zero since the last stats reset.\n\nWe drop those four, including the old `idx_orders_customer` that the composite replaced. Three indexes remain, every one earns its keep, and inserts are back to 0.5 ms.",
      fields: {
        idx_scan: "How many scans used this index. Zero over weeks means it only costs.",
        idx_orders_customer: "Fully covered by the composite index, whose first column is the same.",
        idx_orders_status: "Added for a query that was never written. Pure write cost.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Start with the plan: `EXPLAIN ANALYZE` and the line `Rows Removed by Filter` tell you what the database is really doing.\n\n1) A B-tree index turns a full scan into a tree walk. 2) In a composite index the column order matters: filters first, sort column next. 3) `INCLUDE` makes it covering, so the table is not read. 4) Every index costs on every write: check `idx_scan` and drop what nobody uses.",
    },
  },
};

export default text;
