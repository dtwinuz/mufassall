import { defineLesson } from "@mufassall/scene-schema";

/**
 * An online store's help centre: 2 M article chunks, questions in everyday words. Keyword search
 * misses answers that use other words. An embedding model turns text into 768 numbers, cosine
 * similarity finds the closest meaning, exact kNN is too slow, HNSW trades a little recall for
 * milliseconds, int8 vectors cut memory, filters and hybrid BM25 + vectors with RRF fix the
 * gaps, and retrieval feeds an LLM answer. Numbers are a model scenario.
 */
export default defineLesson({
  slug: "vector-search",
  level: "advanced",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "recall", unit: "%", better: "up" },
    { id: "p95", unit: "ms", better: "down" },
    { id: "mem", unit: "GB", better: "down" },
    { id: "empty", unit: "%", better: "down" },
  ],
  steps: [
    {
      id: "ask",
      kind: "case",
      nodes: {
        user: { kind: "client", at: [0, 5] },
        api: { kind: "service", at: [4, 5] },
        text: { kind: "db", at: [4, 10] },
        indexer: { kind: "worker", at: [9, 9] },
        docs: { kind: "db", at: [9, 12] },
      },
      edges: {
        ask: { from: "user", to: "api", rate: 3, mode: "call" },
        bm: { from: "api", to: "text", rate: 3 },
        read: { from: "indexer", to: "docs", rate: 1 },
        textidx: { from: "indexer", to: "text", rate: 1 },
      },
      metrics: { recall: 41, p95: 12, empty: 0 },
      focus: ["user", "api", "text"],
      exchange: {
        edge: "bm",
        request: {
          format: "text",
          head: "q = \"singan choynak uchun pulimni qaytarib olsam bo'ladimi\"",
          body: "BM25 top 3\n  1  \"Choynak tanlash: 5 maslahat\"         7.9\n  2  \"Elektr choynakni tozalash\"           7.1\n  3  \"Singan ekran: ustaxona manzillari\"   5.4\n-- the answer is \"Mablag'ni qaytarish: 14 kun ichida\": no shared word",
        },
        marks: ["BM25", "top 3", "no shared word"],
      },
    },
    {
      id: "embed",
      kind: "fix",
      nodes: { model: { kind: "external", at: [8, 1] } },
      edges: { embq: { from: "api", to: "model", rate: 3, mode: "call" } },
      focus: ["api", "model"],
      exchange: {
        edge: "embq",
        request: {
          format: "json",
          head: "POST /v1/embeddings HTTP/1.1",
          headers: [
            ["Host", "embed.example.com"],
            ["Authorization", "***"],
          ],
          body: `{
  "model": "emb-v1",
  "input": "singan choynak uchun pulimni qaytarib olsam bo'ladimi",
  "normalize": true
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "dim": 768,
  "embedding": [0.0213, -0.1127, 0.0481, "... 765 more"]
}`,
        },
        marks: ["model", "input", "normalize", "dim", "embedding"],
        masked: ["Authorization"],
      },
    },
    {
      id: "cosine",
      kind: "case",
      focus: ["api", "model"],
      exchange: {
        edge: "embq",
        request: {
          format: "text",
          head: "cos(a, b) = (a . b) / (|a| |b|)    normalized vectors: cos = a . b",
          body: "q  \"singan choynak uchun pulimni qaytarib olsam bo'ladimi\"\n0.83  \"Mablag'ni qaytarish: 14 kun ichida\"\n0.71  \"Choynak kafolati: 12 oy\"\n0.12  \"Toshkent bo'ylab yetkazib berish\"\n-- close meaning, close vectors: no word has to match",
        },
        marks: ["cos", "normalized", "0.83", "0.12"],
      },
    },
    {
      id: "brute",
      kind: "problem",
      nodes: { vdb: { kind: "db", at: [9, 5], state: "slow", load: 100 } },
      edges: {
        bm: null,
        knn: { from: "api", to: "vdb", rate: 3, flow: "fail" },
        embd: { from: "indexer", to: "model", rate: 1 },
        upsert: { from: "indexer", to: "vdb", rate: 1 },
      },
      metrics: { recall: 89, p95: 340, mem: 6.1 },
      focus: ["api", "vdb"],
      exchange: {
        edge: "knn",
        request: {
          format: "text",
          head: "exact kNN   2 000 000 vectors x 768 dims, float32",
          body: "per query     1.54 billion multiply-adds, 6.1 GB read from RAM\np95           340 ms on one 16-core node\n50 questions/s -> 307 GB/s of memory reads, about 15 such nodes",
        },
        marks: ["exact kNN", "multiply-adds", "6.1 GB", "p95", "50 questions/s"],
      },
    },
    {
      id: "hnsw",
      kind: "fix",
      nodes: { vdb: { state: "ok", load: 35 } },
      edges: { knn: { flow: "request" } },
      metrics: { recall: 86, p95: 4, mem: 6.4 },
      focus: ["api", "vdb"],
      exchange: {
        edge: "knn",
        request: {
          format: "text",
          head: "index = HNSW(M=16, ef_construction=200)    build: 38 min",
          body: "search with ef_search=64\n  distances computed   2 900 instead of 2 000 000\n  recall@10 vs exact   0.96        p95 4 ms\n  memory               6.1 GB vectors + 0.26 GB graph links\nef_search=200 -> recall@10 0.99, p95 11 ms",
        },
        marks: ["M=16", "ef_construction", "ef_search", "recall@10", "graph links"],
      },
    },
    {
      id: "quantize",
      kind: "fix",
      metrics: { mem: 1.8, p95: 6 },
      focus: ["vdb"],
      exchange: {
        edge: "upsert",
        request: {
          format: "text",
          head: "vector storage per chunk, 768 dims",
          body: "float32   768 x 4 B = 3 072 B    6.1 GB in RAM\nint8      768 x 1 B =   768 B    1.5 GB in RAM   recall@10 0.93\nsearch on int8, rescore the top 50 with float32 from SSD -> 0.96, p95 6 ms",
        },
        marks: ["float32", "int8", "rescore", "SSD"],
      },
    },
    {
      id: "filter",
      kind: "problem",
      edges: { knn: { flow: "fail" } },
      metrics: { empty: 62 },
      focus: ["user", "api", "vdb"],
      exchange: {
        edge: "knn",
        request: {
          format: "text",
          head: "filter: lang = \"uz\" AND in_stock = true    matches 8% of chunks",
          body: "HNSW top 10, then the filter: 10 x 0.08 = 0.8 results on average\n62% of Uzbek questions: 0 results left\nef_search=1000 to make up for it: p95 6 -> 48 ms, still 9% empty",
        },
        marks: ["filter", "8%", "0.8 results", "ef_search"],
      },
    },
    {
      id: "prefilter",
      kind: "fix",
      edges: { knn: { flow: "request" } },
      metrics: { empty: 0, recall: 85, p95: 9 },
      focus: ["api", "vdb"],
      exchange: {
        edge: "knn",
        request: {
          format: "text",
          head: "plan by how many chunks the filter keeps",
          body: "8% (lang = uz)        filtered HNSW: skip non-matching nodes during the walk   9 ms\n< 1% (one shop, 2 400) exact scan of the matches: 2 400 x 768 = 1.8 M ops       1 ms\nalways the same filter a separate index per language",
        },
        marks: ["filtered HNSW", "exact scan", "separate index"],
      },
    },
    {
      id: "hybrid",
      kind: "fix",
      edges: { bm: { from: "api", to: "text", rate: 3 } },
      metrics: { recall: 93, p95: 14 },
      focus: ["api", "vdb", "text"],
      exchange: {
        edge: "bm",
        request: {
          format: "text",
          head: "q = \"KT-2041 choynak qopqog'i yopilmayapti\"",
          body: "vector top   1 \"Choynak qopqog'ini almashtirish\"  2 \"KT-3300 yo'riqnomasi\"  ...  4 \"KT-2041 kafolat\"\nBM25 top     1 \"KT-2041 kafolat va ehtiyot qismlar\"  ...  6 \"Choynak qopqog'ini almashtirish\"\nRRF   score(d) = sum of 1 / (60 + rank)\n  \"KT-2041 kafolat ...\"            1/61 + 1/64 = 0.0320\n  \"Choynak qopqog'ini ...\"         1/66 + 1/61 = 0.0315\n  \"KT-3300 yo'riqnomasi\" (vector only)   1/62 = 0.0161",
        },
        marks: ["vector top", "BM25", "RRF", "60", "vector only"],
      },
    },
    {
      id: "rag",
      kind: "fix",
      nodes: { llm: { kind: "external", at: [0, 1] } },
      edges: { gen: { from: "api", to: "llm", rate: 2, mode: "call" } },
      focus: ["api", "llm"],
      exchange: {
        edge: "gen",
        request: {
          format: "text",
          head: "retrieve the top 5 chunks (hybrid, 14 ms) -> 2 100 tokens of context",
          body: "system: answer only from the sources below, cite them as [n],\n        say \"not found\" when they do not cover the question\n[1] Mablag'ni qaytarish: 14 kun ichida, chek bilan ...\n[2] Choynak kafolati: 12 oy ...\nanswer: \"Ha, 14 kun ichida chek bilan qaytarsangiz bo'ladi [1]\"",
        },
        marks: ["top 5", "context", "cite", "not found"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "model-swap",
      from: "rag",
      steps: [
        {
          id: "swap-drop",
          kind: "problem",
          nodes: { model: { state: "slow" } },
          edges: { knn: { flow: "fail" } },
          metrics: { recall: 38 },
          focus: ["api", "model", "vdb"],
          exchange: {
            edge: "embq",
            request: {
              format: "text",
              head: "14:00 deploy  query side: EMBED_MODEL=emb-v1 -> emb-v2",
              body: "emb-v2: 768 dims, the same as emb-v1\nindex: 2 000 000 vectors made by emb-v1\nno error, no timeout, p95 9 ms\ncos(q, best article)   0.83 -> 0.09\ngolden set: recall@10  93% -> 38%  (only the BM25 half still works)",
            },
            marks: ["EMBED_MODEL", "768 dims", "no error", "0.09", "golden set"],
          },
        },
        {
          id: "swap-fix",
          kind: "fix",
          nodes: { model: { state: "ok" } },
          edges: { knn: { flow: "request" } },
          metrics: { recall: 94 },
          focus: ["indexer", "model", "vdb"],
          exchange: {
            edge: "upsert",
            request: {
              format: "text",
              head: "help_v1 (emb-v1, live)      help_v2 (emb-v2, building)",
              body: "re-embed 2 000 000 chunks at 1 100 chunks/s -> 30 min, 600 M tokens\nnew and edited chunks: written to both indexes until the switch\ngolden set on help_v2: recall@10 94%   (help_v1: 93%)\nswitch the alias help -> help_v2 and EMBED_MODEL in one release\nevery vector stores model=emb-v2: a query from another model is refused",
            },
            marks: ["help_v2", "re-embed", "both indexes", "alias", "refused"],
          },
        },
      ],
    },
  ],
});
