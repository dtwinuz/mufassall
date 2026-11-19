import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Cursor pagination",
  summary:
    "A payments app lists a merchant's transactions, newest first, 50 per page, with OFFSET. For a merchant with two million rows, deep pages read and throw away millions of rows, new payments shift every page, and an exact total is counted on every first page. Keyset pagination with the matching index, an opaque signed cursor, previous pages, \"has more\" instead of a total, and a cursor tied to its filters fix it one step at a time.",
  learn: [
    "Why `OFFSET` gets slower with every page and why it repeats or skips rows while the data changes",
    "Keyset pagination on `(created_at, id)`: the query, the composite index it needs, and why the unique `id` must be in the sort",
    "An opaque cursor: what goes inside, why it is signed or at least validated, and how next and previous pages work",
    "What an exact total costs, the alternatives (\"has more\", an estimate), and what to do when filters change between pages",
  ],
  nodes: {
    app: "Merchant app",
    api: "Payments API",
    db: "Transactions DB",
    export: "Nightly export",
    cache: "Counter cache",
  },
  metrics: {
    query: "Page query time",
    scanned: "Rows read per page",
    dup: "Rows shown twice",
    lost: "Rows never shown",
    count: "Count per first page",
    dbcpu: "DB CPU",
  },
  steps: {
    setup: {
      short: "Setup",
      title: "Transactions, newest first, 50 per page",
      body: "Merchants open their transaction list in the app, newest first, 50 per page. The API translates `page=N` into `OFFSET (N-1) x 50` and also returns the total, so the app can show \"page 1 of 40 827\".\n\nThe biggest merchant has 2 041 337 transactions. The first page is fast: 4 ms, 50 rows read. But computing the total takes 1.3 s every time.",
      fields: {
        page: "A page number: the client asks to skip a number of rows.",
        limit: "Rows per page.",
        total: "An exact count of all the merchant's rows, computed for this answer.",
        items: "50 transactions, newest first.",
      },
    },
    "deep-offset": {
      short: "Deep page",
      title: "OFFSET reads every row it skips",
      body: "Every night an export job walks all pages of the merchant. The database cannot jump to row 100 001: it walks the index from the top, counts 100 000 rows, throws them away and returns the next 50.\n\nPage 2 001 takes 212 ms. Page 40 000 reads two million rows for 50 and takes 4.1 s. The deeper the page, the slower, and the export never finishes before morning.",
      check: {
        q: "The export reads all 40 827 pages with OFFSET. Roughly how many rows does the database read in total?",
        options: [
          "2 million: every row once",
          "About 40 billion: page N reads N x 50 rows, so the total grows with the square of the page count",
          "4 million: every row twice, once for the skip and once for the page",
        ],
        answer: 1,
        why: "The pages read 50, 100, 150 ... 2 million rows. That is 50 x (1 + 2 + ... + 40 827) ≈ 50 x 40 827² / 2 ≈ 4 x 10^10. Reading the same rows over and over is where the night goes.",
      },
      fields: {
        OFFSET: "\"Skip 100 000 rows\": the database still has to find each of them.",
        "actual rows=50": "What the client gets.",
        "actual rows=100050": "What the database read to get there: 2 000 times more.",
        "Execution Time": "212 ms here, and it grows linearly with the page number.",
        "page 40 000": "Two million rows read and dropped to return 50.",
      },
    },
    shifting: {
      short: "Shifting",
      title: "Pages move while you read them",
      body: "OFFSET counts positions at the moment of each query, not of the first page. Three new payments arrive while the merchant looks at page 1, every row moves down by three, and page 2 starts with three rows that are already on screen.\n\nThe opposite happens when a row leaves the list: a payment on page 1 is voided and hidden, every row moves up by one, and the row that slid onto page 1 is never shown. For a person it is confusing; for the nightly export it means missing and doubled rows in an accounting file.",
      fields: {
        "page=1": "Rows 1 to 50 as they were at 10:00:00.",
        "3 new payments": "Inserted at the top: every position shifts down by three.",
        "already shown": "Duplicates on screen and in the export.",
        voided: "A row leaves the list: every position after it shifts up by one.",
        "never shown": "88073 was position 51, became position 50, and page 2 starts at 51.",
      },
    },
    keyset: {
      short: "Keyset",
      title: "Continue after the last row, not after N rows",
      body: "**Keyset pagination** asks \"the 50 rows that come after the last one I saw\". The last row of page 1 was `(09:02:51.004, 88074)`, so page 2 is every row whose `(created_at, id)` is smaller, in the same order.\n\nThe database seeks straight to that place in the index and reads 51 rows, whether it is page 2 or page 40 000: 0.4 ms. New rows on top and hidden rows above do not move the position, so nothing repeats and nothing is skipped.",
      watch: "The row comparison `(a, b) < (x, y)` means `a < x OR (a = x AND b < y)`. Databases without row values need it written out like that, and should still use the index.",
      check: {
        q: "With keyset pagination, how many rows does the database read for page 40 000?",
        options: [
          "51: it seeks to the cursor position in the index and reads one page plus one row",
          "2 million, like OFFSET, but faster",
          "It depends on how many new rows were inserted since page 1",
        ],
        answer: 0,
        why: "The cursor is a position in the index, not a count of rows to skip. Seeking in a B-tree costs a few page reads at any depth, so every page costs the same.",
      },
      fields: {
        "(created_at, id)": "The position of the last row seen: its time and, to break ties, its unique id.",
        "ORDER BY": "Exactly the same columns and directions as the comparison, or pages overlap.",
        "LIMIT 51": "One row more than the page: if it comes back, there is a next page.",
        "actual rows=51": "Rows read equals rows needed, at any depth.",
      },
    },
    index: {
      short: "Index",
      title: "The index must match the filter and the sort",
      body: "Keyset is only fast if an index has the rows in exactly the order the query wants. The rule: equality filters first (`merchant_id`), then the sort columns in the `ORDER BY` order and direction (`created_at DESC, id DESC`).\n\nWith columns missing or in the wrong order the query still returns the right rows, just slowly. `CONCURRENTLY` builds the index without blocking writes to a busy table.",
      check: {
        q: "The index is `(created_at, id)` without `merchant_id`. Merchant 7 owns 5% of all rows. What does page 2 cost?",
        options: [
          "The same 51 rows: the index still has the right order",
          "The database walks all merchants' rows by date and drops the other merchants' rows: about 1 000 rows read for 50",
          "The query fails because the index does not cover the filter",
        ],
        answer: 1,
        why: "The order is right but the rows are mixed with everyone else's. To find 51 rows of a merchant that owns 1 in 20 rows, the database reads about 1 020 and throws away about 970. For a small merchant it is much worse.",
      },
      fields: {
        CONCURRENTLY: "Builds the index without locking the table against writes; slower, safe in production.",
        merchant_id: "Equality first: all of merchant 7's rows sit together in the index.",
        "equality column first": "Then the sort columns, in the same order and direction as ORDER BY.",
        "Rows Removed by Filter": "The cost of a missing leading column: rows read and thrown away.",
        "Incremental Sort": "Without id in the index, rows with the same created_at have to be sorted after reading.",
      },
    },
    cursor: {
      short: "Cursor",
      title: "An opaque, signed cursor",
      body: "The client does not send the key itself. The API packs it into a **cursor**: base64url of `{\"v\":1, \"t\":\"2026-11-18T09:02:51.004Z\", \"id\":88074, \"f\":\"9c1e\"}` plus a short signature. The client only passes it back.\n\nOpaque means the API can change what is inside (add a column, change the sort) without breaking apps. The signature (an HMAC with a server key) means a hand-made cursor is refused with 400 instead of reaching the SQL; without a signature, at least decode and type-check every field. The merchant filter always comes from the login, never from the cursor.",
      check: {
        q: "Why not just send `?after_id=88074&after_time=...` in plain text?",
        options: [
          "It would work, but clients start building and parsing those values, so the API can never change its sort keys again; and any value reaches the query unchecked",
          "Plain parameters are slower to parse",
          "Base64 encrypts the values, so nobody can read them",
        ],
        answer: 0,
        why: "Whatever the client can see, someone will depend on. An opaque token keeps the format private to the server. Base64 is not encryption: anyone can decode it. That is why the signature or strict validation matters.",
      },
      fields: {
        cursor: "The position to continue from, as received in the previous answer.",
        Hk3f9Qx2: "The signature over the content. A changed cursor no longer matches it.",
        next_cursor: "The last row of this page, packed. Missing when there is nothing more.",
        has_more: "Was the 51st row there? The app shows \"load more\" without any count.",
      },
    },
    prev: {
      short: "Prev",
      title: "Previous page: flip the comparison and the order",
      body: "Going back means the 50 rows just before the first row on screen. Flip the comparison to `>` and the order to `ASC`, take 51 rows, and reverse them before answering, so the page is newest first again.\n\nThe same index serves both directions: the database reads it backwards. The answer carries a `prev_cursor` (the first row) and a `next_cursor` (the last row). What keyset cannot do is jump to page 17 000; for a list that people scroll and an export that walks it, nobody needs to.",
      fields: {
        "prev page": "Built from the first row on screen, not the last.",
        "> (": "Rows after this position in ascending order: the ones just above on screen.",
        ASC: "The nearest rows first; otherwise LIMIT would take the newest rows of the whole table.",
        reverses: "The app always gets newest first, whichever way it scrolls.",
      },
    },
    count: {
      short: "Count",
      title: "The exact total costs more than the page",
      body: "Every first page still returns `total`. Counting two million rows means reading two million index entries: 1.3 s, every time a merchant opens the list. Nine first pages a second keep the database busy just counting.\n\nThe number is also wrong a moment later, because payments keep coming, and nobody needs to know it is 2 041 337 rather than \"about two million\".",
      fields: {
        "count(*)": "No shortcut: an exact count reads every matching row or index entry.",
        "actual rows=2041337": "Two million entries to say one number.",
        "Execution Time": "1.3 s against 0.4 ms for the page itself.",
        "most of the db's CPU": "9 x 1.3 s means about 12 cores busy only with counting.",
      },
    },
    "count-alt": {
      short: "Has more",
      title: "\"Has more\" and an estimate instead",
      body: "The list does not need the total. `has_more` comes for free from the 51st row. Where a number helps, the API shows an estimate: a per-merchant counter updated asynchronously and kept in the counter cache for 60 s, shown as \"about 2 040 000\".\n\nAn exact count is still available, but only where someone really needs it, such as the export summary, run once and not on every page. DB CPU falls from 70% to 15%.",
      check: {
        q: "The API asks the database for `LIMIT 51` and returns 50 rows. What does the 51st row tell it?",
        options: [
          "Nothing, it is a safety margin",
          "That there is at least one more page, so `has_more` is true, without counting anything",
          "How many pages are left",
        ],
        answer: 1,
        why: "If 51 rows come back, at least one row follows this page; if 50 or fewer, this is the last page. One extra row replaces a count of two million.",
      },
      fields: {
        has_more: "Taken from the 51st row: costs one row, not a count.",
        total_estimate: "Approximate on purpose, refreshed every minute, never on the page's critical path.",
      },
    },
    filters: {
      short: "Filters",
      title: "A cursor belongs to its filters",
      body: "The merchant scrolls the full list, then switches the filter to refunds, and the app sends the old cursor with the new filter. The position came from another list: the API would return refunds older than 09:02 and silently drop every newer refund.\n\nSo the cursor carries a short hash of the filters and the sort (`\"f\":\"9c1e\"`). If it does not match the request, the API answers 400 with a link to the first page of the new list, and the app starts over.",
      watch: "Filters on the same list can also change in the data: a payment that becomes refunded moves between lists. Keyset handles that fine, a row simply appears or disappears in its place.",
      fields: {
        status: "A new filter, combined with a cursor made for the old one.",
        error: "A clear code the app can react to: drop the cursor and reload.",
        detail: "Which filters and sort the cursor was made for.",
        restart: "The first page of the new list: no cursor needed.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Six rules for pagination.\n\n1) `OFFSET` reads everything it skips and shifts when rows are added or removed: avoid it for deep or changing lists. 2) Use keyset: `WHERE (created_at, id) < (?, ?) ORDER BY created_at DESC, id DESC LIMIT n+1`. 3) Give it a matching index: equality columns first, then the sort columns in the same order and direction. 4) Always end the sort with a unique column. 5) Hand out an opaque cursor, signed or strictly validated, bound to its filters and sort; take the tenant from the login. 6) Return `has_more` from the extra row; show an estimate if a number helps, and count exactly only where it is really needed.",
    },
  },
  scenarios: {
    "no-tiebreak": {
      label: "No tie-breaker",
      steps: {
        "tie-lost": {
          short: "Ties",
          title: "Sorting by amount loses the ties",
          body: "A new option sorts by amount. The developer copies the pattern but keeps only `amount` in the cursor. 180 of the merchant's payments are exactly 50 000, the price of one plan, and page 1 ends on the 12th of them.\n\nPage 2 asks for `amount < 50000`, and the other 168 payments of 50 000 are never shown. Switching to `<=` brings back the same 12 rows instead, and since rows with equal amounts have no defined order, even those may come back differently.",
          check: {
            q: "How do you make the order stable?",
            options: [
              "Use `<=` instead of `<`",
              "Add the unique `id` to the sort, the cursor and the index: `(amount, id)`",
              "Use larger pages so ties fit on one page",
            ],
            answer: 1,
            why: "A sort key that is not unique does not define a position. With the id appended, every row has exactly one place in the order, so a cursor points between two rows and never into a group of equal ones.",
          },
          fields: {
            "sort=amount": "A sort column with many equal values.",
            "amount < 50000": "Skips every remaining row that also has 50 000.",
            "exactly 50000": "A group of 180 rows with the same sort key.",
            "168 payments": "Never shown on any page, and missing from the export.",
            "<=": "The opposite mistake: the 12 rows already shown come again.",
          },
        },
        "tie-fix": {
          short: "Tie-breaker",
          title: "Every sort ends with the id",
          body: "The cursor now holds `(amount, id)`, the query compares and sorts on both, and a matching index `(merchant_id, amount DESC, id DESC)` keeps it fast. Page 2 starts with the 13th payment of 50 000 and nothing is lost.\n\nThe rule is general: whatever the user sorts by, the API appends the primary key as the last sort column, in the cursor and in the index.",
          fields: {
            "(amount, id)": "The amount for the order the user asked for, the id to break ties.",
            "id DESC": "The tie-breaker is part of ORDER BY, in the same direction.",
            tx_merchant_amount_id: "One more index for one more sort option: the cost of offering it.",
            "13th payment": "Exactly where page 1 stopped.",
          },
        },
      },
    },
  },
};

export default text;
