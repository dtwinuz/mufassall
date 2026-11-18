import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Design search autocomplete",
  summary:
    "Every keystroke in the search box asks for ten suggestions, and the answer must arrive before the next key. We build it step by step: the budget, why `LIKE 'pre%'` fails, a trie with precomputed top-k, prefix shards, debounce and CDN, an offline pipeline with an atomic swap, a real-time layer for trends, filtering and the price of personalization.",
  learn: [
    "How to turn keystrokes into a request rate and a latency budget",
    "Why a prefix tree with top-k stored in every node beats a database query",
    "How debounce, a client cache and a CDN remove most requests before they reach you",
    "How an offline pipeline, an atomic index swap and a small real-time layer keep suggestions fresh and clean",
  ],
  nodes: {
    user: "Search box",
    api: "Suggest API",
    db: "Queries DB",
    index: "Index shard 1",
    index2: "Index shard 2",
    cdn: "CDN edge",
    queue: "Query log",
    agg: "Aggregation job",
    storage: "Snapshots",
    trend: "Trending 5 min",
  },
  metrics: {
    p95: "Suggest p95",
    "backend-rps": "Requests to backend",
    staleness: "Freshness lag",
    bad: "Bad suggestions",
  },
  steps: {
    estimate: {
      short: "Estimate",
      title: "Ten suggestions per keystroke, before the next key",
      body: "Say 25 million searches a day, about 12 keystrokes each: 300 million suggest calls a day, **3 500/s** on average and four times that in the evening peak. Each call is `GET /suggest?q=<prefix>` and returns up to ten completions.\n\nPeople type a character every 150 ms or so. To feel instant, the list must appear within about **100 ms p95** end to end. A phone on mobile data spends 50 to 60 ms of that on the network, so the server gets about 20 ms.",
      check: {
        q: "First version: `SELECT ... WHERE query LIKE 'ip%' ORDER BY hits DESC LIMIT 10` on the queries table, with an index on `query`. What happens at 3 500/s?",
        options: [
          "Fine: the index finds the prefix in a few milliseconds",
          "Short prefixes match millions of rows that must all be sorted; the database melts",
          "The index cannot be used with LIKE at all",
        ],
        answer: 1,
        why: "The index does find rows starting with `ip`, but there are 1.8 million of them. To return the ten most popular, the database reads and sorts every one. One- and two-letter prefixes are exactly what people type first.",
      },
      fields: {
        q: "The prefix typed so far. It changes on every keystroke.",
        suggestions: "Ranked completions, most popular first. Ten at most; the UI shows five to eight.",
        took_ms: "Server time. It has to stay near 20 ms to fit the 100 ms budget.",
      },
    },
    like: {
      short: "LIKE",
      title: "`LIKE 'ip%'` reads millions of rows to return ten",
      body: "A B-tree index on `query` can find where the `ip` range starts. But the result must be ordered by popularity, not by text, so the database walks the whole range, 1.8 million rows, and sorts them to keep the top ten.\n\nEach call costs 600 ms of database time. At 3 500/s that is not a slow query, it is a database at 97% CPU and suggestions that arrive after the user finished typing.",
      watch: "Adding more indexes does not help: no B-tree order matches both \"starts with\" and \"most popular\".",
      fields: {
        EXPLAIN: "Shows the plan and, with ANALYZE, real times. Always look before blaming the network.",
        LIKE: "A prefix pattern. It can use the index, but only to find the range, not the order.",
        "ORDER BY": "Ranks by `hits`. This is what forces reading every matching row.",
        rows: "1.8 million rows read for one keystroke. Short prefixes are the worst case.",
        "Execution Time": "612 ms per call against a 20 ms budget.",
      },
    },
    trie: {
      short: "Trie",
      title: "A trie with the answer already stored in each node",
      body: "A **trie** (prefix tree) has one node per prefix: `i`, then `ip`, then `iph`. Finding a prefix is a walk of as many hops as characters typed, independent of how many queries exist.\n\nThe trick: every node stores its **top-k** completions, computed offline when the trie is built. A request walks two hops and returns a list that is already sorted. No scan, no sort, 0.03 ms. The trie lives in memory on the suggest servers and is rebuilt nightly, so it is up to a day old.",
      watch: "Without a stored top-k, a trie still has to visit every query under `i` to rank them. The precomputed list is what makes it fast.",
      check: {
        q: "40 million distinct queries, each node keeping a top-10 list: the trie needs about 60 GB. What now?",
        options: [
          "Buy one machine with 128 GB of memory",
          "Split the trie by prefix range across servers, each range replicated",
          "Keep the trie on disk and read nodes on demand",
        ],
        answer: 1,
        why: "One big box is one point of failure and one CPU for the evening peak. Disk reads break the 20 ms budget. Splitting by prefix keeps every lookup on one server, and replicas give capacity and failover.",
      },
      fields: {
        walk: "One hop per typed character. Cost depends on prefix length, not on data size.",
        top_k: "The ten best completions, stored right in the node and already sorted.",
        time: "Memory lookup: three orders of magnitude under the budget.",
      },
    },
    shard: {
      short: "Shards",
      title: "Shard the index by prefix range",
      body: "The full trie needs about 60 GB, too much for one process and one CPU at the evening peak. We split it by **prefix range**: every query starting with `a` up to `ip` lives on shard 1, the rest on shard 2. A prefix always maps to exactly one shard, so a lookup never fans out.\n\nRanges are cut by traffic, not by alphabet: far more queries start with `i` than with `x`. Each range runs on three replicas, so a dead server only removes capacity, not a part of the alphabet.",
      watch: "One-letter prefixes are the hottest keys and the same for everyone. They are the first thing to cache, next.",
      fields: {
        "shard map": "Prefix ranges to shards. The API keeps it in memory and reloads it on change.",
        heap: "Each shard holds about 30 GB: half the trie, plus room for the next version during a swap.",
        replicas: "Copies of a range. The router spreads load and skips a dead one.",
      },
    },
    keystrokes: {
      short: "Keystrokes",
      title: "Every keystroke is a request",
      body: "In the evening peak the API takes **14 000 requests/s**. One user typing `iphone` sends six calls in 224 ms and reads exactly one list. Half the traffic answers prefixes nobody will look at.\n\nThere is a second bug: replies arrive out of order. The answer for `iph` lands after the one for `iphone`, and the list jumps back to older results under the user's finger.",
      check: {
        q: "Which change removes the most backend requests without making the box feel slower?",
        options: [
          "Wait 80 ms after the last key, cache answers in the page, and let a CDN serve short prefixes",
          "Show suggestions only after 4 characters",
          "Add more API servers",
        ],
        answer: 0,
        why: "Debounce drops the requests no one reads, the client cache answers backspace and retyping, and short prefixes are identical for everyone, so an edge cache serves them. Waiting for 4 characters hides the feature exactly when it helps most. More servers only pay for the waste.",
      },
      fields: {
        q: "A new prefix every 40 to 50 ms: faster than one round trip.",
        "6 requests": "Six backend calls for one useful list.",
        "arrived after": "Out-of-order reply. The client must drop answers for prefixes that are no longer in the box.",
      },
    },
    edge: {
      short: "Debounce + CDN",
      title: "Most requests never reach the backend",
      body: "Three layers, cheapest first. The page waits **80 ms** after the last key before asking (debounce) and drops replies for prefixes no longer in the box. It caches answers it already has, so backspace costs nothing. Short prefixes go through a **CDN**: `ip` is the same for every English user, so the edge keeps it for five minutes.\n\nPeak traffic to the backend falls from 14 000/s to 3 200/s, and a CDN hit answers in about 10 ms from a nearby city.",
      watch: "The cache key must include everything that changes the answer: prefix, language, region. Forget `lang` and Russian users get English suggestions.",
      fields: {
        lang: "Part of the URL, so part of the CDN cache key.",
        "Cache-Control": "`public, max-age=300`: shared caches may keep this for five minutes.",
        Age: "Seconds this copy has been sitting at the edge.",
        "X-Cache": "HIT: answered by the CDN, the backend never saw it.",
      },
    },
    pipeline: {
      short: "Pipeline",
      title: "Query logs become the next index",
      body: "Every search the user actually submits goes to a **query log** stream, fire-and-forget. An aggregation job reads the last hour, counts hits and distinct users per query, and blends them with history: new score = old score × decay + hits.\n\nThe job then builds new tries for each shard and writes them to object storage as versioned snapshots. Suggestions come from what people searched, not from what the database happens to contain.",
      watch: "Log the submitted query, not every keystroke prefix, or the index learns half-typed words.",
      fields: {
        query: "A submitted search, lower-cased and trimmed.",
        users_1h: "Distinct users. One bot repeating a phrase counts once.",
        decay: "How fast old popularity fades. 0.92 per hour forgets in a few days.",
        score: "What the trie ranks by. Old score times decay plus fresh hits.",
      },
    },
    swap: {
      short: "Swap",
      title: "Load the new trie beside the old, then swap one pointer",
      body: "Each shard downloads its new snapshot into spare memory while still serving the old one. It checks the checksum, warms the hottest prefixes, then switches a single pointer. Requests already in flight finish on the old trie; new ones see the new trie.\n\nNo restart, no half-built index visible to users, and rollback is one more pointer swap to the previous snapshot. With an hourly pipeline, suggestions are about an hour behind reality.",
      watch: "During the swap a shard holds two tries. Size memory for both or the swap is the moment it falls over.",
      check: {
        q: "A storm warning starts trending at 10:03. With an hourly pipeline, when does it appear in suggestions?",
        options: [
          "Right away: the query log is a stream",
          "After the next build and swap, up to an hour later",
          "Only when the CDN entries expire",
        ],
        answer: 1,
        why: "The log is a stream, but the index is a batch: the term appears only after the next hourly build lands. For breaking news that is far too late, which is what a small real-time layer fixes.",
      },
      fields: {
        snapshot: "An immutable, versioned trie file. Shards only ever load whole snapshots.",
        checksum: "A corrupt download is rejected before it serves a single request.",
        atomic: "One pointer write: every request sees either the old trie or the new one, never a mix.",
        "in-flight": "Readers still using the old trie. It is freed only when they finish.",
      },
    },
    trending: {
      short: "Trending",
      title: "A small real-time layer for what is hot right now",
      body: "A second consumer reads the same query log and keeps counts for the last five minutes in memory. It only tracks queries that jump well above their usual rate, a few thousand at most. The API asks it for trends that match the prefix and merges them into the shard's top-k.\n\nA new term now appears within a minute. But the fast layer has no history to protect it: a bot ring pushed a spam phrase into suggestions in three minutes, and about 140 bad suggestions a day get shown.",
      watch: "Keep the fast layer tiny and bounded. It adds to the index; it never replaces it.",
      fields: {
        window: "Sliding five-minute window. Older counts drop out.",
        x46: "Rate versus its usual level. A spike, not just a popular query.",
        merge: "Trending items slot into the precomputed list; the rest of the top-k stays.",
      },
    },
    filter: {
      short: "Filter",
      title: "Filter before anything is shown",
      body: "Suggestions are words we put in front of users, so they need the same care as any content. Both the aggregation job and the trending layer drop queries that match a **blocklist** (spam, hate, adult content) or look like personal data such as phone numbers.\n\nA query must also come from at least 50 distinct users before it can appear. The spam phrase came from three accounts: it never qualifies. Bad suggestions fall from 140 to about 3 a day, and those go to a reviewer with a one-click removal that reaches every shard in a minute.",
      fields: {
        blocklist: "Terms and patterns that never show, kept outside the index so it applies at once.",
        min_users: "A popularity floor counted in people, not in hits.",
        distinct: "Many hits from few accounts is a signal of abuse, not of interest.",
        "personal data": "Names with phone numbers or addresses must never be completed for strangers.",
      },
    },
    personal: {
      short: "Personal",
      title: "Personalization costs the cache",
      body: "Product wants the user's own past searches on top. A personalized answer is different for everyone, so it is `private`: the CDN cannot share it, and every keystroke goes back to the backend plus a lookup of the user's history. Doing it for all prefixes would push the backend from 3 200/s back to about 9 000/s.\n\nThe compromise: short prefixes stay shared and cached. From three characters, where CDN hits are rare anyway, the API reranks with the user's history. Recent searches the page already knows are blended in on the device. The backend ends at 3 600/s.",
      watch: "Never let a personalized answer be cached as public: one user's searches would show up for the next.",
      fields: {
        iph: "Three characters: from here the answer may be personal.",
        "Cache-Control": "`private`: only this browser may keep it, never the CDN.",
        personal: "Tells the client the list was reranked for this user.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Autocomplete is a race against the next keystroke: about 100 ms end to end, 20 ms on the server.\n\n1) Count keystrokes, not searches: 3 500/s average, 14 000/s at peak. 2) `LIKE 'pre%'` reads every match to rank them; a trie with top-k stored in each node answers in microseconds. 3) Shard by prefix range cut by traffic, with replicas. 4) Debounce, a client cache and a CDN for short prefixes take most of the load. 5) An offline pipeline turns query logs into snapshots, swapped in atomically; a tiny real-time layer adds trends. 6) Filter with a blocklist and a distinct-user floor; personalize only where the cache is not helping anyway.",
    },
  },
};

export default text;
