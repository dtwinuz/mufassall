import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Bloom filters",
  summary:
    "An online shop's sign-up form asks \"is this username taken?\" on every keystroke, against 50 million accounts. Most names typed are free, and each one costs a database lookup. How a 62 MB bit array answers \"definitely free\" without the database, how to size it, why it cannot forget, and where the same trick hides inside storage engines.",
  learn: [
    "How a Bloom filter works: m bits, k hashes, \"definitely not\" or \"maybe\"",
    "False-positive math: about 10 bits per key and 7 hashes give about 1%",
    "Why a filter must be sized for its growth and rebuilt when it fills up",
    "Why you cannot delete from it, counting Bloom filters, and Bloom filters in LSM reads",
  ],
  nodes: {
    form: "Sign-up form",
    api: "Accounts API",
    db: "Users DB",
    filter: "Bloom filter",
    sst1: "SSTable 1",
    sst2: "SSTable 2",
    sst3: "SSTable 3",
  },
  metrics: {
    reads: "DB reads",
    p95: "Check p95",
    fp: "False positives",
    memory: "Filter memory",
  },
  steps: {
    "every-key": {
      short: "Every key",
      title: "A database lookup for every keystroke",
      body: "While a new customer types a username, the form asks the API after every pause: is `ali_k1993x` free? The API looks the name up in the users table, an indexed query of about 4 ms.\n\nAt 1000 checks a second the database copes. It is the cheapest query there is, but it is still a trip to the database for every check.",
      fields: {
        available: "The whole answer: one bit of information.",
        "X-DB-Time": "Each check costs a database round trip, even for a name nobody has.",
      },
    },
    load: {
      short: "Load",
      title: "A sign-up campaign triples the checks",
      body: "A marketing campaign brings a wave of sign-ups: 3000 checks a second. The database spends a large share of its capacity answering \"no such name\", and orders slow down with it.\n\nThe pattern is telling: 80% of the checks are for names that do not exist. The database is busy proving absence.",
      watch: "Lookups for keys that are not there are often the biggest and most useless share of reads.",
      fields: {
        username: "An indexed column: a fast lookup, but still a lookup.",
        "0 rows": "The usual answer. The work was done to learn that there is nothing.",
        "80%": "Most checks are misses. That is what a Bloom filter is good at.",
      },
    },
    bloom: {
      short: "Bloom filter",
      title: "A bit array that says \"definitely not\"",
      body: "The API keeps a **Bloom filter** in memory: an array of m bits, all zero at first. To add a name, it is hashed with k different hash functions and the k bits they point at are set to 1. All 50 million existing names are added.\n\nTo check a name, the same k bits are read. If any of them is 0, the name was never added: it is **definitely free**, and the database is not asked. A single zero is enough.",
      watch: "A Bloom filter never says \"no\" by mistake. It only sometimes says \"maybe\" for a key that is not there.",
      check: {
        q: "For the name \"zarina_t\" all k bits are 1. What should the API do?",
        options: [
          "Answer \"taken\" without asking the database",
          "Ask the database: it may be a false positive",
          "Add the name to the filter again",
        ],
        answer: 1,
        why: "All ones means \"maybe\": the bits may have been set by other names. Only the database knows for sure. The filter's value is in the zeros, which skip the database for most free names.",
      },
      fields: {
        h1: "The first hash points at a bit that is 1. Not enough to decide.",
        h2: "The second hash hits a 0. The name was never added.",
        "definitely not": "One zero is proof. The remaining hashes are not even computed.",
      },
    },
    maybe: {
      short: "Maybe",
      title: "\"Maybe\" goes to the database",
      body: "For a taken name all k bits are 1, and the API confirms in the database. The same happens for a small share of free names whose bits happen to be set by other names: a **false positive**.\n\nThe answer to the user is always correct. The filter only decides how often the database has to be asked.",
      fields: {
        "all = 1": "Every bit is set: either the name exists or the bits were set by others.",
        maybe: "The filter cannot tell these two cases apart.",
        "1 row": "The database gives the exact answer: taken.",
      },
    },
    math: {
      short: "The math",
      title: "How often it lies: the false-positive formula",
      body: "With n names, m bits and k hashes, the chance that a free name finds all its bits set is about p = (1 - e^(-kn/m))^k.\n\nFor 50 million names and 10 bits per name (62.5 MB), the best k is about 7, and p = 0.82%. So of 2400 free-name checks a second, about 19 still reach the database, plus the 600 for names that really exist: 620 reads instead of 3000.",
      fields: {
        n: "How many keys are in the filter.",
        m: "How many bits it has. m/n, bits per key, is what matters.",
        k: "How many hashes per key. Too few or too many both raise p; the best is m/n x ln 2.",
        p: "The false-positive rate: the share of absent keys that still answer \"maybe\".",
      },
    },
    sizing: {
      short: "Sizing",
      title: "Trading memory for accuracy",
      body: "The rate depends only on bits per key, not on the total size. 5 bits per key give about 9%, 10 bits about 0.8%, 15 bits about 0.07%.\n\nThe shop picks 10 bits: 62.5 MB in each API instance for 50 million names. Storing the names themselves would take about a gigabyte.",
      check: {
        q: "Each extra 5 bits per key, with the best k, does what to the false-positive rate?",
        options: ["Halves it", "Nothing once k is fixed", "Cuts it about ten times"],
        answer: 2,
        why: "From 5 to 10 bits per key the rate falls from 9.2% to 0.82%, and from 10 to 15 to 0.07%: roughly tenfold each time. Accuracy is cheap: memory grows linearly, errors fall exponentially.",
      },
      fields: {
        "bits/key": "m/n: the only dial that sets accuracy.",
        "false positives": "Drops about ten times for every ~5 extra bits per key.",
        memory: "Grows linearly with bits per key and the number of names.",
      },
    },
    growth: {
      short: "Growth",
      title: "The filter fills up as users grow",
      body: "Two years later the shop has 120 million accounts, but the filter still has 500 million bits. Most of its bits are now 1, and the false-positive rate climbs to 24%: one free name in four goes to the database again.\n\nA Bloom filter cannot grow in place. The service builds a new 150 MB filter from the users table in the background and swaps it in.",
      watch: "Size the filter for the n you will have, and alert on its fill ratio. A full filter fails silently: it just says \"maybe\" to everything.",
      fields: {
        n: "Two and a half times the keys the filter was sized for.",
        "0.24": "The same formula with the new n. The bits are mostly ones.",
        rebuild: "A full scan into a bigger bit array. Old bits cannot be stretched.",
        swap: "The API switches to the new filter at once; checks never stop.",
      },
    },
    delete: {
      short: "Delete",
      title: "A filter cannot forget",
      body: "A customer closes the account `ali_k`, and the name should become free. The obvious move is to clear its k bits.\n\nBut bits are shared: one of them was also set by `zarina_t`. After clearing, the filter says `zarina_t` is definitely not present, and a second person could register a taken name. A false negative breaks the only promise the filter makes.",
      check: {
        q: "Why not just set a deleted name's k bits back to 0?",
        options: [
          "Other names share those bits and would look free",
          "It is too slow: k writes per delete",
          "It works if done under a lock",
        ],
        answer: 0,
        why: "Each bit can belong to many names. Clearing it removes them all from the filter, so taken names start answering \"definitely not\". A lock does not help: the problem is shared bits, not concurrency.",
      },
      fields: {
        remove: "Plain Bloom filters have no safe remove.",
        "also set": "Bits do not remember who set them.",
        "false negative": "The one error a Bloom filter must never make.",
      },
    },
    counting: {
      short: "Counting",
      title: "Counting Bloom filter, or rebuild",
      body: "A **counting Bloom filter** keeps a small counter in each slot instead of a bit. Adding a name increments its k counters, removing it decrements them, and a slot is \"set\" while its counter is above zero.\n\nThe cost is four times the memory. Since closed accounts are rare and a freed name may wait a day, the shop keeps the plain filter and rebuilds it nightly instead. A name freed today is a \"maybe\" until then, and the database answers correctly.",
      watch: "With a plain filter, stale ones are safe (an extra \"maybe\"), missing ones are not. Rebuild on a schedule if keys are deleted.",
      fields: {
        "4-bit counters": "Enough for up to 15 names per slot; overflow is rare at sane sizes.",
        counter: "Shared slots now count their owners.",
        maybe: "zarina_t still answers correctly after ali_k is removed.",
        memory: "Four bits per slot instead of one.",
      },
    },
    lsm: {
      short: "In LSM",
      title: "The same trick inside the database",
      body: "Storage engines built on an LSM tree keep data in many sorted files on disk, SSTables. A read for a key may have to look into each of them, newest first, and a missing key means opening every file.\n\nSo each SSTable carries its own Bloom filter in memory. The read asks the filters first and opens only files that say \"maybe\". A missing key costs no disk reads at all.",
      watch: "Wherever a lookup is expensive and misses are common, a Bloom filter in front of it pays off.",
      fields: {
        SSTables: "Immutable sorted files. The more there are, the more a miss costs.",
        skip: "The filter said \"definitely not\", so the file is not opened.",
        "0 disk reads": "A miss answered from memory, instead of three disk reads.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Five rules for Bloom filters.\n\n1) Use one in front of an expensive lookup when most keys asked for do not exist. 2) \"No\" is certain, \"maybe\" goes to the real store. 3) About 10 bits per key with 7 hashes gives about 1% false positives; every ~5 more bits cut it tenfold. 4) Size for future n, watch the fill ratio, rebuild into a bigger filter. 5) A plain filter cannot delete: use a counting filter or rebuild on a schedule.",
    },
  },
};

export default text;
