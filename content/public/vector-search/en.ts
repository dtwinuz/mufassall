import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Vector search",
  summary:
    "An online store's help centre has 2 million article chunks, and customers ask in their own words: \"can I get my money back for a broken kettle\". Keyword search misses the answer when it uses other words. We add embeddings and cosine similarity, see why exact kNN is too slow, trade a little recall for milliseconds with HNSW, shrink memory with int8, handle filters, combine BM25 and vectors with reciprocal rank fusion, and feed the result to an LLM.",
  learn: [
    "What an embedding is and how cosine similarity finds text with the same meaning but no shared words",
    "Why exact kNN costs N x d per query, and how HNSW trades recall, latency and memory",
    "Filters with approximate search, and hybrid BM25 + vector ranking with reciprocal rank fusion",
    "Why vectors from different model versions must never be compared, and how to re-embed safely",
  ],
  nodes: {
    user: "Help chat",
    api: "Search API",
    text: "Keyword index",
    indexer: "Indexer",
    docs: "Articles DB",
    model: "Embedding model",
    vdb: "Vector index",
    llm: "LLM",
  },
  metrics: {
    recall: "Recall@10 (golden set)",
    p95: "Search p95",
    mem: "Index memory",
    empty: "Empty results",
  },
  steps: {
    ask: {
      short: "Keywords",
      title: "The customer and the article use different words",
      body: "The help chat searches articles with BM25, as in the full-text search lesson. A customer writes: \"singan choynak uchun pulimni qaytarib olsam bo'ladimi\" (can I get my money back for a broken kettle).\n\nThe top 3 are about choosing and cleaning kettles. The right article is called \"Mablag'ni qaytarish: 14 kun ichida\" and shares not one word with the question. On a golden set of 500 labelled questions, only 41% of the relevant articles reach the top 10.",
      fields: {
        BM25: "Keyword ranking: it can only score words the text actually contains.",
        "top 3": "What the chat shows. All three are about kettles, none about refunds.",
        "no shared word": "\"pulimni\" and \"mablag'ni\" mean the same money; for an index they are unrelated tokens.",
      },
    },
    embed: {
      short: "Embedding",
      title: "Turn meaning into 768 numbers",
      body: "An **embedding model** maps a piece of text to a vector: here 768 numbers. It was trained so that texts with similar meaning land close together, whatever the words and even across languages.\n\nThe search API sends the question to the model and gets one vector back. Every article chunk gets its vector the same way, ahead of time.",
      watch: "The question and the articles must be embedded by the same model and version. Vectors from two models live in two unrelated spaces.",
      fields: {
        model: "Which model and version made the vector. It must be stored with the vector.",
        input: "The text to embed: a question, or one chunk of an article.",
        normalize: "Scale the vector to length 1, so cosine becomes a plain dot product.",
        dim: "768 dimensions: 768 float numbers per text.",
        embedding: "The vector itself. Each number means nothing alone; only distances matter.",
        Authorization: "The model's API key, never shown.",
      },
    },
    cosine: {
      short: "Cosine",
      title: "Similar meaning, small angle",
      body: "**Cosine similarity** measures the angle between two vectors: 1 means the same direction, 0 means unrelated. With normalized vectors it is just the sum of 768 products.\n\nThe refund article scores 0.83, the kettle warranty 0.71, delivery times 0.12. The best answer comes first, with not a single matching word.",
      check: {
        q: "The question is in Uzbek, and the only refund article exists in Russian. Can vector search find it?",
        options: [
          "No: different words in a different alphabet cannot match",
          "Only if every article is translated into Uzbek first",
          "Yes, if the embedding model was trained on both languages: the same meaning lands in the same region",
        ],
        answer: 2,
        why: "A multilingual model maps \"pulni qaytarish\" and its Russian equivalent to nearby vectors, because it learned meaning, not spelling. A model trained only on English would not; that is why the model choice is part of the design.",
      },
      fields: {
        cos: "Cosine of the angle between two vectors, from -1 to 1.",
        normalized: "Both vectors have length 1, so the division disappears.",
        "0.83": "The refund article: closest in meaning.",
        "0.12": "Delivery times: nearly unrelated.",
      },
    },
    brute: {
      short: "Exact kNN",
      title: "Compare the question with all 2 million vectors",
      body: "The vectors go into a vector index, and the indexer embeds every new or changed chunk. The simplest search, **exact kNN**, computes the similarity to every vector and keeps the 10 best.\n\nRecall on the golden set jumps from 41% to 89%. But each query reads 6.1 GB and does 1.54 billion multiply-adds: 340 ms on a 16-core node, and 50 questions a second would need about 15 such nodes just for memory bandwidth.",
      fields: {
        "exact kNN": "k nearest neighbours, computed exactly: the best possible answer, at full cost.",
        "multiply-adds": "N x d = 2 000 000 x 768 per question.",
        "6.1 GB": "2 million vectors x 3 072 bytes, all read for every question.",
        p95: "Too slow for a chat that also has to generate an answer.",
        "50 questions/s": "The cost grows with every vector and every question.",
      },
    },
    hnsw: {
      short: "HNSW",
      title: "Walk a graph instead of reading everything",
      body: "**HNSW** links each vector to its nearest neighbours in a layered graph. A search starts at the sparse top layer, jumps towards the question and goes down layer by layer, keeping the `ef_search` best candidates. It computes about 2 900 distances instead of 2 million.\n\nThe price is recall: 96% of the true 10 nearest are found, so recall on the golden set goes from 89% to 86%. p95 falls from 340 ms to 4 ms. The graph adds 0.26 GB of memory.",
      check: {
        q: "You raise `ef_search` from 64 to 200. What changes?",
        options: [
          "Recall and latency go up; memory and the index stay the same",
          "Memory triples, because the graph gets more links",
          "Nothing until the index is rebuilt",
        ],
        answer: 0,
        why: "`ef_search` is a query-time setting: a wider candidate list visits more nodes, finds more of the true neighbours and takes longer (0.99 and 11 ms here). `M` and `ef_construction` are build-time settings: they shape the graph and its memory and need a rebuild to change.",
      },
      fields: {
        "M=16": "Links per node. More links: better recall, more memory, slower build.",
        ef_construction: "Candidate list size while building: a better graph, a longer build.",
        ef_search: "Candidate list size while searching: the recall vs latency knob.",
        "recall@10": "Share of the exact top 10 that the graph search finds.",
        "graph links": "The extra memory for the graph: about 128 bytes per vector.",
      },
    },
    quantize: {
      short: "int8",
      title: "Store each number in 1 byte instead of 4",
      body: "The index needs 6.4 GB of RAM, and RAM is the expensive part. **Scalar quantization** stores each of the 768 numbers as an 8-bit integer: 768 bytes per vector instead of 3 072, 1.5 GB in total.\n\nRounding costs some recall, 0.96 → 0.93. The fix is cheap: search on int8, then rescore the top 50 with the full float32 vectors from SSD. Recall returns to 0.96, p95 is 6 ms, memory 1.8 GB.",
      fields: {
        float32: "4 bytes per number: exact, and four times the memory.",
        int8: "1 byte per number: each value rounded to one of 256 steps.",
        rescore: "Re-rank the few best candidates with exact vectors.",
        SSD: "The full vectors stay on disk; only 50 are read per question.",
      },
    },
    filter: {
      short: "Filter",
      title: "The filter removes almost everything the graph found",
      body: "Uzbek-speaking customers must get Uzbek articles about products in stock. The first version takes the HNSW top 10 and then applies the filter. Only 8% of chunks match it, so on average 0.8 of the 10 survive.\n\n62% of Uzbek questions get no result at all. Raising `ef_search` to 1 000 helps a little and makes p95 eight times slower.",
      check: {
        q: "A shop filter matches only 0.1% of the vectors. What does filtering after the top 10 give?",
        options: [
          "Almost always an empty result: 10 x 0.001 = 0.01 hits per query on average",
          "The same 10 results, just a bit slower",
          "An error, because the index cannot filter",
        ],
        answer: 0,
        why: "The graph search does not know about the filter, so it returns the 10 nearest of all vectors, and the filter keeps only the few that happen to match. The more selective the filter, the emptier the result; this is why filtering must happen during the search, not after.",
      },
      fields: {
        filter: "Metadata stored next to each vector: language, stock, shop.",
        "8%": "How many chunks pass. The rest are useless for this customer.",
        "0.8 results": "What survives a post-filter on the top 10, on average.",
        ef_search: "Searching wider is a slow and incomplete workaround.",
      },
    },
    prefilter: {
      short: "Pre-filter",
      title: "Choose the plan by how much the filter keeps",
      body: "The filter moves into the search. With 8% matching, **filtered HNSW** walks the graph as before but only counts matching nodes as results: 9 ms, and nothing empty.\n\nA very selective filter, such as one shop's 2 400 chunks, breaks the graph into islands. There an exact scan of just the matches is cheaper: 1.8 M operations, 1 ms. A filter used by every query, such as language, is best served by a separate index per language.",
      watch: "Vector databases switch between these plans by themselves, but only if the filtered fields are indexed as metadata. A filter on a field the index does not know falls back to post-filtering.",
      fields: {
        "filtered HNSW": "Non-matching nodes are still walked through, but never returned.",
        "exact scan": "Few matches: compute all their similarities, no graph needed.",
        "separate index": "One index per value of a filter that every query uses.",
      },
    },
    hybrid: {
      short: "Hybrid",
      title: "Vectors miss exact codes: bring BM25 back",
      body: "\"KT-2041 choynak qopqog'i yopilmayapti\" (the KT-2041 lid does not close). Vectors know what a lid is, but a model number is just noise to them: the KT-2041 warranty article is only 4th. BM25 puts it first because it matches the exact token.\n\nThe search API asks both and merges the lists with **reciprocal rank fusion**: each list adds 1 / (60 + rank). No score scaling is needed, only ranks. Recall on the golden set rises from 85% to 93%.",
      fields: {
        "vector top": "Good at meaning, weak at codes, names and rare exact words.",
        BM25: "Good at exact tokens, blind to synonyms.",
        RRF: "Reciprocal rank fusion: add up 1 / (k + rank) from every list.",
        "60": "The usual k: it keeps one list's first place from dominating everything.",
        "vector only": "A document found by one list only gets one term, so it usually ranks lower.",
      },
    },
    rag: {
      short: "RAG",
      title: "Give the best 5 chunks to an LLM, with sources",
      body: "Retrieval-augmented generation is one more step on top: the top 5 hybrid chunks, about 2 100 tokens, go into the LLM prompt with an instruction to answer only from them and cite them.\n\nThe answer is only as good as the retrieval: an LLM cannot cite an article that search did not find. That is why the golden set measures retrieval separately from the answers.",
      watch: "Retrieved text is data, not instructions. An article that says \"ignore the rules above\" must not change the assistant's behaviour.",
      fields: {
        "top 5": "Few enough to fit the context, enough to cover the question.",
        context: "The chunks pasted into the prompt, with their numbers.",
        cite: "Each claim points to a source the customer can open.",
        "not found": "Better an honest \"not found\" than an invented refund policy.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Six rules for vector search.\n\n1) An embedding model turns text into a vector; cosine similarity finds the same meaning without shared words. 2) Exact kNN costs N x d per query; use it only for small sets. 3) HNSW trades a few points of recall for milliseconds; `ef_search` is the query-time knob, `M` the build-time one. 4) Quantize to int8 and rescore the top candidates to cut memory without losing recall. 5) Filter during the search, pick the plan by selectivity, and combine vectors with BM25 through reciprocal rank fusion. 6) A vector is only comparable with vectors from the same model version: store the version, and re-embed into a new index before switching.",
    },
  },
  scenarios: {
    "model-swap": {
      label: "New model, old vectors",
      steps: {
        "swap-drop": {
          short: "Model swap",
          title: "The query model changes, the stored vectors do not",
          body: "At 14:00 a config change switches the query side to the new embedding model emb-v2. It has the same 768 dimensions, so nothing complains: no error, no timeout, p95 still 9 ms.\n\nBut the 2 million stored vectors were made by emb-v1. The question and the articles now live in two different spaces: the best article scores 0.09 instead of 0.83. Recall on the golden set falls from 93% to 38%; only the BM25 half of the hybrid still works.",
          check: {
            q: "Why did nothing fail loudly?",
            options: [
              "HNSW hides errors to keep latency low",
              "Cosine across two models throws an error, but logging was off",
              "The dimensions match, so every operation is valid: the index is simply comparing vectors from two unrelated spaces",
            ],
            answer: 2,
            why: "A vector is only a list of 768 numbers; nothing in it says which model made it. Same length means the maths works and returns confident nonsense. Only a quality check, such as recall on a golden set, or a model id stored and checked with every vector, catches it.",
          },
          fields: {
            EMBED_MODEL: "One setting on the query side; the index was not touched.",
            "768 dims": "The same size: no type error to stop the deploy.",
            "no error": "Every dashboard is green.",
            "0.09": "The refund article now looks unrelated to the refund question.",
            "golden set": "500 labelled questions: the only alarm that rang.",
          },
        },
        "swap-fix": {
          short: "Re-embed",
          title: "Build a new index, switch the model and the index together",
          body: "The query side goes back to emb-v1 at once. Then a new index help_v2 is built next to the live one: 2 million chunks are re-embedded with emb-v2 in about 30 minutes. While it builds, new and edited chunks are written to both indexes.\n\nhelp_v2 is checked on the golden set first: 94%. Then one release moves the alias and the model setting together. Every vector stores the model that made it, and a query from another model is refused instead of answered badly.",
          fields: {
            help_v2: "A new index for the new model, next to the old one.",
            "re-embed": "Every chunk through the new model: a planned job, not a side effect of a deploy.",
            "both indexes": "Writes go to old and new until the switch, so nothing is missing afterwards.",
            alias: "The name the API queries; switching it is instant and easy to roll back.",
            refused: "A mismatch becomes a loud error instead of quiet garbage.",
          },
        },
      },
    },
  },
};

export default text;
