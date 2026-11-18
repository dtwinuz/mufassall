import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Full-text search",
  summary:
    "A marketplace searches its catalogue with `LIKE '%word%'`. At 4 million products every search reads every row, and it still misses products written with another apostrophe, in Cyrillic or with an Uzbek suffix. We build real full-text search: an inverted index over analysed tokens, BM25 ranking, an index that follows the database's change log, shards with scatter-gather, and typo tolerance.",
  learn: [
    "Why `LIKE '%x%'` cannot use an index and reads the whole table",
    "Analysis: lowercase, Cyrillic to Latin, Uzbek apostrophes and suffixes, the same analyzer at index and query time",
    "The inverted index with postings, and BM25 ranking worked out in numbers",
    "Keeping the index fresh from the change log, sharding by document, scatter-gather and typo tolerance",
  ],
  nodes: {
    user: "Shop app",
    api: "Search API",
    db: "Products DB",
    catalog: "Catalog service",
    index: "Search index",
    indexer: "Indexer",
    log: "Change log",
    shard1: "Index shard 1",
    shard2: "Index shard 2",
  },
  metrics: {
    p95: "Search p95",
    scanned: "Rows read per search",
    missed: "Relevant products missed",
    zero: "Searches with no results",
    lag: "Write to searchable",
  },
  steps: {
    like: {
      short: "LIKE",
      title: "Search with LIKE, while the catalogue is small",
      body: "Sellers add products through the catalogue service, buyers type words into the search box. The first version is one query: `LIKE '%choynak%'` over the title and the description, sorted by sales.\n\nWith 50 000 products it answers in 45 ms. Nobody thinks about it again.",
      fields: {
        LIKE: "Compares the text character by character, for every row.",
        "%choynak%": "A wildcard on both sides: the word can be anywhere in the text.",
        sold_count: "The only ranking: popular first, whatever the text says.",
        "50 000 products": "Small enough that reading everything is still fast.",
      },
    },
    scan: {
      short: "Full scan",
      title: "4 million products: every search reads the table",
      body: "Three years later the catalogue has 4 million products and 1.2 GB of text. Each search reads all of it: 2.8 seconds, and the database CPU is at 100% at peak.\n\nOnly 1 840 rows match. The other 3 998 160 are read and thrown away.",
      check: {
        q: "There is a B-tree index on `title`. Why does the database ignore it?",
        options: [
          "The statistics are stale; ANALYZE would fix it",
          "A B-tree is sorted from the first character; with a leading `%` there is no place to start the seek",
          "Indexes are never used together with ORDER BY",
        ],
        answer: 1,
        why: "A B-tree finds `choynak%` by jumping to where words starting with \"choynak\" are sorted. `%choynak%` can start at any position of any title, so the sort order does not help and the only plan left is reading every row.",
      },
      fields: {
        "Seq Scan": "A sequential scan: the whole table, row after row.",
        "rows read": "All 4 million rows, to find 1 840.",
        "Execution Time": "2.8 s per search, at hundreds of searches per second.",
        "leading %": "A wildcard at the start means there is no prefix to look up.",
      },
    },
    inverted: {
      short: "Inverted index",
      title: "Turn it around: from word to products",
      body: "An **inverted index** stores, for every word, the list of products that contain it: its **postings**. A search no longer reads products, it reads the lists for its words and intersects them.\n\nFor \"elektr choynak\" it walks the 21 000 ids of the rarer word and jumps ahead in the longer list. 18 ms instead of 2.8 s. For now an indexer rebuilds the index from the database every night.",
      watch: "The index is a second copy of the data, built for reading. The database stays the source of truth, and the index can always be rebuilt from it.",
      fields: {
        df: "Document frequency: in how many products the word appears.",
        postings: "The sorted list of product ids for this word.",
        positions: "Where the word is in the text: needed for phrase queries like \"elektr choynak\" in this order.",
        "jump ahead": "Lists are sorted, so the walk skips whole blocks of ids it does not need.",
      },
    },
    spelling: {
      short: "Spelling",
      title: "The same word, written four ways",
      body: "Fast, but a third of the relevant products are still not found. Sellers write \"g'ilof\" with an ASCII apostrophe, with the official `ʻ` (U+02BB), with no apostrophe at all, or in Cyrillic. A buyer who types one form finds only that form.\n\nUzbek suffixes make it worse: \"telefon g'iloflari\" is a different word from \"g'ilof\" for the index, and returns nothing.",
      fields: {
        "ASCII apostrophe": "The `'` on every keyboard. The most common, but not the only form.",
        "U+02BB": "The official Uzbek letter apostrophe. It looks the same, it is a different character.",
        Cyrillic: "Many sellers still type in Uzbek Cyrillic. Same word, other letters.",
        suffix: "-lar, -i, -ni, -ning: one stem, dozens of word forms.",
      },
    },
    analyze: {
      short: "Analyzer",
      title: "Decide what a word is, once, for both sides",
      body: "Before a word goes into the index, an **analyzer** normalizes it: lowercase, Cyrillic to Latin, every apostrophe variant removed, split into tokens, a short list of suffixes cut off. \"Telefon GʻILOFLARI\" and \"telefon g'ilof\" both become `telefon gilof`.\n\nThe key rule: the very same analyzer runs on the query. Changing it means reindexing everything, because the stored tokens were made by the old one.",
      watch: "Stem carefully. Cutting suffixes too eagerly merges different words; a short list of plural and case endings and a minimum stem of 3 letters is a safe start.",
      fields: {
        lowercase: "\"Choynak\", \"CHOYNAK\" and \"choynak\" become one token.",
        transliterate: "Uzbek Cyrillic letters mapped to Latin: one alphabet in the index.",
        apostrophes: "All five look-alikes are removed, so \"g'ilof\" and \"gilof\" meet.",
        stem: "The suffix is cut: \"giloflari\" is found by \"gilof\".",
        "index time": "The same steps on products and on queries, or they never match.",
      },
    },
    bm25: {
      short: "BM25",
      title: "Rank by relevance, not by sales",
      body: "Now 1 840 products match \"elektr choynak\" and the order matters. **BM25** scores each one: rare words weigh more (`idf`), more occurrences help but with diminishing returns, and long texts are discounted.\n\nThe kettle A scores 11.29. Filter B repeats \"choynak\" four times in a long description, and still gets only 8.65. Counting matches, B would have won.",
      check: {
        q: "A seller stuffs \"choynak\" 40 times into the description. What does BM25 do with it?",
        options: [
          "The score grows 40 times, the item goes to the top",
          "The score grows a little and flattens out, and the long text is discounted",
          "BM25 notices spam and removes the item",
        ],
        answer: 1,
        why: "The term part is tf x (k1 + 1) / (tf + k1 x length factor): it can never exceed k1 + 1 = 2.2, however large tf gets. The long description raises the length factor, which lowers the score further. Spam still needs its own filter, but it no longer wins by repetition.",
      },
      fields: {
        idf: "Rarity: \"choynak\" (21 000 products) weighs more than \"elektr\" (96 000).",
        k1: "How fast repetitions stop helping. 1.2 is the usual default.",
        b: "How much a long text is discounted. 0.75 is the usual default.",
        tf: "How many times the word appears in this product.",
        len: "Tokens in this product, compared with the average of 12.",
      },
    },
    stale: {
      short: "Stale index",
      title: "A new product is invisible until tomorrow",
      body: "The index is rebuilt every night. A kettle added at 10:12 becomes searchable at 05:40 the next day, after a 2 h 40 min rebuild. Price and stock changes wait just as long.\n\nAll day, 3 800 sold-out items still show up as \"in stock\". On average a change waits 12 hours before search sees it.",
      fields: {
        "seller adds": "The write reaches the database at once.",
        "nightly rebuild": "Reading all 4 million rows again, to change a few thousand.",
        "19 h 28 min": "The wait for this one product.",
        "sold-out": "The buyer clicks, and the product page says it is gone.",
      },
    },
    cdc: {
      short: "Change log",
      title: "Feed the index from the database's change log",
      body: "Each committed change in the products table goes into a change log, through CDC or an outbox. The indexer reads it, groups 500 changes into one bulk request and sends only what changed.\n\nThe index makes new writes searchable at each **refresh**, here once a second. This is **near-real-time**: a change is searchable about 1.6 s after its commit, not instantly, and not tomorrow.",
      check: {
        q: "Why not have the catalogue service write to the index right after its database commit?",
        options: [
          "The index cannot accept single writes",
          "It would be slower than the change log",
          "It is a dual write: if the service crashes between the two writes, the index silently misses the change",
        ],
        answer: 2,
        why: "Two writes to two systems with no shared transaction: sometimes the commit succeeds and the index write does not. The change log is written by the database itself as part of the commit, so nothing committed can be skipped, and a crashed indexer resumes from its position in the log.",
      },
      fields: {
        lsn: "Position in the database log. The indexer resumes from here after a restart.",
        bulk: "Many changes per request: much cheaper than one request per product.",
        refresh_interval: "How often new writes become searchable. Shorter means more, smaller segments to merge.",
        "1.6 s": "Commit to searchable, end to end.",
      },
    },
    shard: {
      short: "Shards",
      title: "Split by document, ask every shard",
      body: "With descriptions and positions the index reaches 38 GB and no longer fits in one node's memory: p95 creeps up at peak. It is split into two **shards** by product id, 2 million products each.\n\nThe search API sends the query to both shards (**scatter**), each returns its own top 10, and the API merges the 20 hits by score (**gather**). The answer takes as long as the slower shard: 24 ms.",
      watch: "Each shard computes idf from its own documents. With random ids this is nearly the same everywhere; with small or skewed shards, scores from different shards stop being comparable.",
      fields: {
        "top 10": "Each shard returns only its best 10, never all matches.",
        merge: "The API picks the global top 10 from 2 x 10 candidates.",
        "by document": "Writes go to one shard, every read asks all shards.",
        "by term": "Each shard owns some words: reads get cheaper, but writes touch many shards and a popular word overloads one node.",
      },
    },
    typo: {
      short: "Typos",
      title: "Find \"choynak\" when the buyer types \"choyank\"",
      body: "2% of searches still find nothing, mostly because of typos. A **fuzzy** query also accepts words within an edit distance: \"choyank\" is one swap away from \"choynak\".\n\nThe limits keep it cheap: at most 2 edits, the first letter must match, and short words get fewer edits. The index answers 1 840 hits in 21 ms and suggests the corrected query.",
      fields: {
        q: "What the buyer typed, with the typo.",
        max_edits: "At most 2 changed, missing or extra letters. More would match almost anything.",
        prefix_length: "The first letter must match: it cuts the candidates many times over.",
        transpositions: "Two swapped neighbours count as one edit, the most common typo.",
        corrected: "Shown to the buyer as \"did you mean\".",
        Authorization: "The app's token, hidden here.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Six rules for full-text search.\n\n1) `LIKE '%x%'` reads every row; it does not grow past a small table. 2) Decide what a word is with one analyzer, for products and queries alike: lowercase, one alphabet, no apostrophe variants, a careful stemmer. 3) An inverted index maps words to sorted postings; a search reads only those lists. 4) Rank with BM25: rarity counts, repetitions saturate, long texts are discounted. 5) Feed the index from the database's change log and accept near-real-time; prices and stock are re-read from the database. 6) Shard by document and scatter-gather, and tolerate typos with tight limits.",
    },
  },
  scenarios: {
    "indexer-lag": {
      label: "Indexer 5 min behind",
      steps: {
        "lag-pile": {
          short: "Lag",
          title: "A price list import, and the index falls 5 minutes behind",
          body: "At 10:01 a large seller uploads a price list: 2.4 million updates in 4 minutes. The change log receives 10 000 changes a second, the indexer handles 4 000. The lag grows to 1.8 million changes, 300 seconds.\n\nSearch still answers in 24 ms, but from a 5-minute-old picture: filters by price use yesterday's prices, and a seller cannot find the product he just added.",
          check: {
            q: "A buyer clicks a kettle that the index shows at 299 000, while the database already says 329 000. What goes into the cart?",
            options: [
              "299 000: the price the buyer saw",
              "329 000 from the database, and the page shows the price changed",
              "Nothing: the item is blocked until the index catches up",
            ],
            answer: 1,
            why: "The index is for finding, the database is the truth. Prices and stock are read from the database for the product page and the cart, so a stale index can only make an item appear in the wrong place in the list, never sell it at the wrong price.",
          },
          fields: {
            incoming: "Changes arriving per second, 2.5 times what the indexer can apply.",
            "consumer lag": "How far the indexer is behind the log, in changes and in seconds.",
            "yesterday's price": "The filter runs on the index's copy, which is 5 minutes old.",
            "4 minutes ago": "The write is in the database; it is the index that does not know yet.",
          },
        },
        "lag-catchup": {
          short: "Catch up",
          title: "Coalesce, batch, and read the truth from the database",
          body: "Most of the 2.4 million updates touch the same products several times. The indexer keeps only the latest change per product id: 600 000 documents. The log position is the version, so an older change can never overwrite a newer one.\n\nLarger bulks and a 30 s refresh while catching up save the index from creating thousands of tiny segments. Four consumers split by product id. By 10:11 the lag is 2 s again.",
          fields: {
            coalesce: "Ten price changes of one product become one index write.",
            "version = lsn": "The index rejects a write older than what it already has.",
            refresh_interval: "Longer while catching up, back to 1 s afterwards.",
            "re-read from the DB": "Ten primary key lookups for the page that is shown: correct price, 3 ms.",
          },
        },
      },
    },
  },
};

export default text;
