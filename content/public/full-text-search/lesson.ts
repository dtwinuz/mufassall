import { defineLesson } from "@mufassall/scene-schema";

/**
 * A marketplace with 4 M products searches its catalogue with `LIKE '%word%'`. The query reads
 * every row, and it misses products written with another apostrophe, in Cyrillic or with an
 * Uzbek suffix. An inverted index built from analysed tokens, BM25 ranking, an index fed from
 * the database's change log, document shards with scatter-gather and typo tolerance fix it.
 * Numbers are a model scenario; the BM25 scores are computed with k1 = 1.2, b = 0.75.
 */
export default defineLesson({
  slug: "full-text-search",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "p95", unit: "ms", better: "down" },
    { id: "scanned", unit: "", better: "down" },
    { id: "missed", unit: "%", better: "down" },
    { id: "zero", unit: "%", better: "down" },
    { id: "lag", unit: "s", better: "down" },
  ],
  steps: [
    {
      id: "like",
      kind: "case",
      nodes: {
        user: { kind: "client", at: [0, 4] },
        api: { kind: "service", at: [4, 4] },
        db: { kind: "db", at: [4, 9] },
        catalog: { kind: "service", at: [0, 9] },
      },
      edges: {
        search: { from: "user", to: "api", rate: 3, mode: "call" },
        like: { from: "api", to: "db", rate: 3 },
        write: { from: "catalog", to: "db", rate: 2 },
      },
      metrics: { p95: 45, scanned: 50000, zero: 3, lag: 0 },
      focus: ["api", "db"],
      exchange: {
        edge: "like",
        request: {
          format: "sql",
          head: "SELECT id, title, price_minor FROM products",
          body: " WHERE lower(title || ' ' || description) LIKE '%choynak%'\n ORDER BY sold_count DESC\n LIMIT 20;\n-- 50 000 products, 45 ms: good enough for the first year",
        },
        marks: ["LIKE", "%choynak%", "sold_count", "50 000 products"],
      },
    },
    {
      id: "scan",
      kind: "problem",
      nodes: { db: { state: "slow", load: 100 } },
      edges: { like: { flow: "fail" } },
      metrics: { p95: 2800, scanned: 4000000 },
      focus: ["api", "db"],
      exchange: {
        edge: "like",
        request: {
          format: "sql",
          head: "EXPLAIN ANALYZE SELECT ... WHERE lower(title || ' ' || description) LIKE '%choynak%';",
        },
        response: {
          format: "text",
          head: "Seq Scan on products  (rows removed by filter: 3 998 160)",
          body: "  rows read     4 000 000   (1.2 GB of text)\n  rows found        1 840\nExecution Time: 2 812 ms\n-- the B-tree on title is not used: a leading % has no prefix to seek to",
        },
        marks: ["Seq Scan", "rows read", "Execution Time", "leading %"],
      },
    },
    {
      id: "inverted",
      kind: "fix",
      nodes: {
        db: { state: "ok", load: 30 },
        index: { kind: "db", at: [9, 4] },
        indexer: { kind: "worker", at: [9, 9] },
      },
      edges: {
        like: null,
        query: { from: "api", to: "index", rate: 3 },
        dump: { from: "indexer", to: "db", rate: 1 },
        build: { from: "indexer", to: "index", rate: 1 },
      },
      metrics: { p95: 18, scanned: 21000 },
      focus: ["api", "index", "indexer"],
      exchange: {
        edge: "query",
        request: {
          format: "text",
          head: "term       df       postings (doc id: positions)",
          body: "choynak    21 000   3:[1]  88:[1,4]  9051:[2]  ...\nelektr     96 000   3:[0]  41:[7]  9051:[1]  ...\nquery \"elektr choynak\": walk the 21 000 ids, jump ahead in the longer list\n4 000 000 rows -> 21 000 postings,  2 812 ms -> 18 ms",
        },
        marks: ["df", "postings", "positions", "jump ahead"],
      },
    },
    {
      id: "spelling",
      kind: "problem",
      edges: { query: { flow: "fail" } },
      metrics: { missed: 37, zero: 14 },
      focus: ["user", "api", "index"],
      exchange: {
        edge: "search",
        request: {
          format: "text",
          head: "sellers wrote \"g'ilof\" (phone case) in 4 ways, 2 170 products",
          body: "  g'ilof     ASCII apostrophe    1 120\n  gʻilof     U+02BB              410\n  gilof      no apostrophe       260\n  Cyrillic   U+0493 ...          380\nquery \"g'ilof\"               -> 1 120 of 2 170\nquery \"telefon g'iloflari\"   -> 0: plural + possessive suffix",
        },
        marks: ["ASCII apostrophe", "U+02BB", "Cyrillic", "suffix"],
      },
    },
    {
      id: "analyze",
      kind: "fix",
      edges: { query: { flow: "request" }, build: { rate: 2 } },
      metrics: { missed: 6, zero: 5 },
      focus: ["index", "indexer"],
      exchange: {
        edge: "build",
        request: {
          format: "text",
          head: "analyze(\"Telefon GʻILOFLARI, qora\")",
          body: "1 lowercase       telefon gʻiloflari, qora\n2 transliterate   U+0493 -> g', U+049B -> q, U+045E -> o', U+0447 -> ch\n3 apostrophes     ' ʻ ’ ‘ ` removed      telefon giloflari, qora\n4 tokens          [telefon] [giloflari] [qora]\n5 stem            giloflari -> gilof   (-lari -lar -ning -ni -dan -da -ga)\n=> telefon gilof qora   -- the same analyzer at index time and at query time",
        },
        marks: ["lowercase", "transliterate", "apostrophes", "stem", "index time"],
      },
    },
    {
      id: "bm25",
      kind: "fix",
      focus: ["api", "index"],
      exchange: {
        edge: "query",
        request: {
          format: "text",
          head: "query \"elektr choynak\"   N = 4 000 000   avgdl = 12",
          body: "k1 = 1.2, b = 0.75\nidf(elektr)  = ln(1 + (N - 96 000 + 0.5) / (96 000 + 0.5)) = 3.73\nidf(choynak) = ln(1 + (N - 21 000 + 0.5) / (21 000 + 0.5)) = 5.25\nA  \"Elektr choynak 1.7 l, po'lat, kumush\"   len 6    tf 1 + 1   -> 11.29\nB  \"Choynak uchun filtr ... choynak\"         len 36   tf 1 + 4   ->  8.65",
        },
        marks: ["idf", "k1", "b", "tf", "len"],
      },
    },
    {
      id: "stale",
      kind: "problem",
      nodes: { indexer: { load: 100 } },
      edges: { dump: { flow: "fail" } },
      metrics: { lag: 43200 },
      focus: ["catalog", "db", "indexer", "index"],
      exchange: {
        edge: "dump",
        request: {
          format: "text",
          head: "10:12  seller adds \"Elektr choynak 2 l\"  id 4120551  -> Products DB ok",
          body: "10:13  search \"choynak 2 l\"  -> not in the results\n03:00  nightly rebuild: read 4 000 000 rows, 2 h 40 min\n05:40  the product is searchable, 19 h 28 min after it was added\n-- all day long 3 800 sold-out items still show \"in stock\"",
        },
        marks: ["seller adds", "nightly rebuild", "19 h 28 min", "sold-out"],
      },
    },
    {
      id: "cdc",
      kind: "fix",
      nodes: { log: { kind: "queue", at: [6, 12] }, indexer: { load: 40 } },
      edges: {
        dump: null,
        changes: { from: "db", to: "log", rate: 2, mode: "async" },
        consume: { from: "indexer", to: "log", rate: 2 },
      },
      metrics: { lag: 2 },
      focus: ["db", "log", "indexer", "index"],
      exchange: {
        edge: "consume",
        request: {
          format: "text",
          head: "cdc  products  op=u  id=4120551  lsn 0/7A3F10",
          body: "     price_minor 32900000 -> 29900000\nindexer   batch of 500 changes -> one bulk request, 120 ms\nindex     refresh_interval = 1s: a new segment becomes searchable\nsearch sees the new price 1.6 s after COMMIT",
        },
        marks: ["lsn", "bulk", "refresh_interval", "1.6 s"],
      },
    },
    {
      id: "shard",
      kind: "fix",
      nodes: {
        index: null,
        shard1: { kind: "db", at: [9, 2] },
        shard2: { kind: "db", at: [12, 6] },
      },
      edges: {
        query1: { from: "api", to: "shard1", rate: 3 },
        query2: { from: "api", to: "shard2", rate: 3 },
        build1: { from: "indexer", to: "shard1", rate: 1 },
        build2: { from: "indexer", to: "shard2", rate: 1 },
      },
      metrics: { p95: 24 },
      focus: ["api", "shard1", "shard2"],
      exchange: {
        edge: "query2",
        request: {
          format: "text",
          head: "search q=\"elektr choynak\" size=10   -> both shards",
          body: "shard 1   2 000 000 docs   top 10   14 ms\nshard 2   2 000 000 docs   top 10   22 ms\nmerge 20 hits by score -> top 10        total 24 ms\n-- by document: every query asks every shard, p95 = the slowest one\n-- by term: one shard per word, but a hot word melts one node",
        },
        marks: ["top 10", "merge", "by document", "by term"],
      },
    },
    {
      id: "typo",
      kind: "fix",
      metrics: { zero: 2 },
      focus: ["user", "api"],
      exchange: {
        edge: "search",
        request: {
          format: "json",
          head: "POST /v1/search HTTP/1.1",
          headers: [
            ["Host", "search.example.com"],
            ["Authorization", "***"],
          ],
          body: `{
  "q": "elektr choyank",
  "fuzzy": {
    "max_edits": 2,
    "prefix_length": 1,
    "transpositions": true
  },
  "size": 10
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "corrected": "elektr choynak",
  "hits": 1840,
  "took_ms": 21
}`,
        },
        marks: ["q", "max_edits", "prefix_length", "transpositions", "corrected"],
        masked: ["Authorization"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "indexer-lag",
      from: "typo",
      steps: [
        {
          id: "lag-pile",
          kind: "problem",
          nodes: { indexer: { state: "slow", load: 100 } },
          edges: { consume: { flow: "fail", rate: 1 }, changes: { rate: 6 } },
          metrics: { lag: 300 },
          focus: ["log", "indexer"],
          exchange: {
            edge: "consume",
            request: {
              format: "text",
              head: "10:05  change log  incoming 10 000 changes/s   indexer 4 000/s",
              body: "a seller uploaded a price list: 2.4 M updates in 4 min\nconsumer lag   1.8 M changes = 300 s\nsearch \"choynak\" price <= 300 000 -> 37 hits at yesterday's price\nseller: \"I added it 4 minutes ago, search shows nothing\"",
            },
            marks: ["incoming", "consumer lag", "yesterday's price", "4 minutes ago"],
          },
        },
        {
          id: "lag-catchup",
          kind: "fix",
          nodes: { indexer: { state: "ok", load: 70 } },
          edges: { consume: { flow: "request", rate: 4 }, changes: { rate: 2 } },
          metrics: { lag: 2 },
          focus: ["indexer", "api", "db"],
          exchange: {
            edge: "consume",
            request: {
              format: "text",
              head: "indexer  coalesce by id: 2.4 M updates -> 600 000 documents",
              body: "version = lsn: an older change never overwrites a newer one\nbulk 5 000 docs, refresh_interval 30 s until the lag is under 10 s\n4 consumers, split by product id\nsearch page: price and stock of the 10 hits re-read from the DB, 3 ms\n10:11 consumer lag 2 s",
            },
            marks: ["coalesce", "version = lsn", "refresh_interval", "re-read from the DB"],
          },
        },
      ],
    },
  ],
});
