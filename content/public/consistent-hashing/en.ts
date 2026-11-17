import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Consistent hashing",
  summary:
    "A profile API keeps hot data in three cache servers. Adding a fourth one should help, but with `hash % N` it empties almost the whole cache. How a hash ring moves only a quarter of the keys, and why it needs virtual nodes.",
  learn: [
    "Why `hash % N` remaps almost every key when N changes",
    "How a hash ring picks a node: the next point clockwise",
    "Why only about 1/N of the keys move when a node joins or leaves",
    "What virtual nodes fix: uneven arcs and a dead node's load",
  ],
  nodes: {
    client: "App",
    api: "Profile API",
    "cache-a": "Cache A",
    "cache-b": "Cache B",
    "cache-c": "Cache C",
    "cache-d": "Cache D",
    db: "Users DB",
  },
  metrics: {
    hit: "Cache hit rate",
    "db-reads": "DB reads",
    moved: "Keys moved",
  },
  steps: {
    modulo: {
      short: "hash % 3",
      title: "Three caches, one rule: `hash % 3`",
      body: "The API serves about 5 000 profile reads a second. Each key goes to one of three caches: take the hash of the key, divide by 3, the remainder is the cache number.\n\n95% of reads are hits. Only 250 a second reach the database.",
      fields: {
        GET: "`hash(\"user:u_42\") = 2718281827`, and `2718281827 % 3 = 1`, so the key lives on cache B.",
        u_42: "The user id inside the key. Every API server computes the same cache for it, with no lookup table.",
      },
    },
    "add-node": {
      short: "+1 cache",
      title: "A fourth cache empties the other three",
      body: "Memory is tight, so a fourth cache is added and the rule becomes `hash % 4`. The same key now gives `2718281827 % 4 = 3`: cache D, which is empty.\n\nThis happens to almost every key: with 3 → 4 nodes only about one key in four keeps its remainder. Three quarters of the cache is suddenly in the wrong place.",
      watch: "The old data is still on A, B and C. Nobody asks for it there any more.",
      fields: {
        GET: "Same key, same hash, new divisor. The answer now points to cache D.",
        nil: "Miss. The API must now go to the database for this key.",
      },
    },
    "db-flood": {
      short: "DB floods",
      title: "Every miss lands on the database",
      body: "The hit rate fell from 95% to 24%. The database went from 250 reads a second to 3 800, while it was sized for a few hundred.\n\nQueries queue up, a simple read takes 410 ms, the API times out. Adding cache made the system slower until the new layout warms up.",
      watch: "A cache that the database relies on cannot be emptied all at once.",
      fields: {
        users: "The table behind the cache. Its normal load is the 5% of misses.",
        "410 ms": "Normally about 2 ms. The database spends its time waiting in line, not reading.",
      },
    },
    ring: {
      short: "Hash ring",
      title: "Put keys and nodes on one ring",
      body: "Roll back to three caches and change the rule. Hash each cache's name to a point on a circle of 2³² positions. Hash each key to a point on the same circle.\n\nA key belongs to the first cache found clockwise from it. No division by N: the node count does not appear in the formula.",
      fields: {
        "0x5A3C11F0": "Where `user:u_42` sits on the ring: a 32-bit hash of the key.",
        clockwise: "The next node point after the key. Here it is cache B at `0x66600000`.",
      },
    },
    "add-on-ring": {
      short: "+1 on ring",
      title: "Now a new node takes only one arc",
      body: "Cache D is added at point `0x4CC00000`. It takes the keys between the previous point (cache A) and itself. Those keys used to belong to cache B. Everything else stays where it was.\n\nOnly 25% of the keys move, about 1/N with N = 4. The hit rate dips to 71% and recovers in minutes instead of collapsing.",
      fields: {
        takes: "The one arc that changes owner: from A's point up to D's point. It used to be part of B's arc.",
        "moved keys": "A quarter, not three quarters. In general a joining node takes about 1/N.",
        stays: "Key `u_42` is after D's point, so it still goes to cache B and still hits.",
      },
    },
    uneven: {
      short: "Uneven",
      title: "Four points cut the ring into unequal arcs",
      body: "With only one point per cache, the arcs are as random as the hashes. Here cache C owns 45% of the ring and cache B only 10%.\n\nC runs at 92% and starts to slow down while B is nearly idle. One hot node limits the whole cluster.",
      watch: "With few nodes, \"one point each\" never splits the ring evenly.",
      fields: {
        keys: "1.8 million keys on cache C, about 4 times what cache B holds.",
      },
    },
    vnodes: {
      short: "Vnodes",
      title: "Virtual nodes: many small points per cache",
      body: "Each cache now gets 128 points on the ring (`cache-a#0` … `cache-a#127`), each from its own hash. 512 small arcs average out: every cache owns very close to 25%.\n\nThe lookup is the same: next point clockwise, then the cache that owns that point. A stronger cache can simply get more points.",
      fields: {
        vnodes: "Virtual nodes: points on the ring that all map to one real server.",
        "cache-c#17": "Point number 17 of cache C. Points of different caches are mixed all around the ring.",
        share: "How much of the ring each cache owns. Close to equal, so load is close to equal.",
      },
    },
    "node-dies": {
      short: "Node dies",
      title: "When a cache dies, its keys spread out",
      body: "Cache B stops answering and the API removes it from the ring. Its 128 small arcs go to the next point clockwise, and those points belong to A, C and D almost equally.\n\nAgain only about 25% of the keys move, and no single survivor takes them all. Without virtual nodes the whole arc would land on one neighbour.",
      watch: "All API servers must see the same node list, or they route one key to different caches.",
      fields: {
        unreachable: "The API stopped getting answers from cache B and removed it from its copy of the ring.",
        arcs: "B's small arcs are split among the survivors, so each one gets about a third of B's load.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "`hash % N` is fine while N never changes. Change N and almost every key moves.\n\n1) Put nodes and keys on one ring; a key belongs to the next node clockwise. 2) A node joining or leaving moves only about 1/N of the keys. 3) Give every node many virtual points so arcs and load even out. 4) Every client must use the same node list.",
    },
  },
};

export default text;
