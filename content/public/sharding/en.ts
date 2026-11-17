import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Sharding",
  summary:
    "A chat service's messages table reaches 6 TB and one server can no longer hold it. We split it across shards, choose a shard key, meet a hot shard and a hot key, and add a fourth shard without moving everything.",
  learn: [
    "Range sharding versus hash sharding, and why time ranges make a hot shard",
    "How to choose a shard key: the most frequent query decides",
    "What a cross-shard query costs, and how to split a hot key",
    "Why `hash % n` makes resharding painful, and how fixed slots fix it",
  ],
  nodes: {
    app: "Chat app",
    api: "Chat API",
    db: "Messages DB",
    "shard-0": "Shard 0",
    "shard-1": "Shard 1",
    "shard-2": "Shard 2",
    "shard-3": "Shard 3",
    mover: "Data mover",
  },
  metrics: {
    p95: "Query p95",
    hottest: "Hottest shard load",
    fanout: "Shards per query",
    disk: "Largest shard",
  },
  steps: {
    "one-db": {
      short: "One DB",
      title: "One server, 6 TB of messages",
      body: "Every chat message goes into one `messages` table. It now holds 6 TB, and the server takes 20 000 writes a second at 98% load.\n\nA bigger server would buy months, not years. Indexes no longer fit in memory, backups take a day, and one insert takes over a second at peak.",
      fields: {
        chat_id: "The chat this message belongs to. Almost every query filters on it.",
        Time: "1.4 seconds to insert one message. The server is out of room, not the query.",
      },
    },
    range: {
      short: "Range",
      title: "Split by date range",
      body: "We split the table into three shards, each a separate database: 2024 on shard 0, 2025 on shard 1, 2026 on shard 2. The API reads a small shard map and sends each query to the right shard.\n\nEach shard holds about 2 TB, and history queries are fast. But look at the load: almost all traffic already goes to shard 2.",
      fields: {
        created_at: "The shard key: the value that decides which shard holds the row.",
        ranges: "The shard map: each key range belongs to one shard.",
      },
    },
    hot: {
      short: "Hot shard",
      title: "Every new message hits the same shard",
      body: "New messages are all from today, so every write lands on shard 2. People mostly read recent chats, so the reads go there too.\n\nShard 2 is at 100% and timing out, while shards 0 and 1 sit almost idle. We have three servers and the capacity of one.",
      watch: "A shard key that grows over time (date, auto-increment id) sends all new writes to the last shard.",
      fields: {
        "statement timeout": "The insert waited too long and was cancelled. The user's message did not send.",
        cpu: "One shard at 100%, the others under 10%. The load is not split at all.",
      },
    },
    hash: {
      short: "Hash",
      title: "Shard by a hash of chat_id",
      body: "The new shard key is `chat_id`, and the shard is `hash(chat_id) % 3`. A good hash scatters chats evenly, so new and old chats are mixed on all three shards.\n\nAll messages of one chat live on one shard, so \"open chat c_8812\" touches one server. Load is 33–35% everywhere, p95 22 ms.",
      fields: {
        chat_id: "The key matches the most common query: messages of one chat.",
        hash: "Turns similar ids into far-apart numbers, so neighbours do not pile up on one shard.",
        "shard-2": "The remainder picks the shard. The API computes this on every query.",
      },
    },
    cross: {
      short: "Cross-shard",
      title: "A query without the shard key asks every shard",
      body: "A new feature: \"all messages I sent\". The query filters by `sender_id`, not by `chat_id`, so the API cannot know which shard has them. It asks all three, waits for all answers and merges them.\n\nThe query is as slow as the slowest shard: 615 ms. With 30 shards it would ask 30 servers for every request.",
      watch: "Cross-shard queries are fine when rare. If one becomes common, build a separate copy keyed for it.",
      fields: {
        sender_id: "Not the shard key. Every shard may hold this user's messages.",
        merge: "60 rows from three shards, sorted again to keep the 20 newest.",
        total: "Set by shard 2, the slowest one. Fan-out takes the worst latency of all shards.",
      },
    },
    celebrity: {
      short: "Hot key",
      title: "One huge channel heats one shard",
      body: "A public channel `c_1` with 2 million members goes viral. All its messages, reactions and reads go to the shard that holds `c_1`, shard 1.\n\nHashing spreads chats, not traffic inside one chat. Shard 1 is at 95% again because of a single key.",
      fields: {
        "top keys": "The shard's busiest keys. Measure this before you guess.",
        c_1: "41% of this shard's writes come from one chat.",
      },
    },
    "split-key": {
      short: "Split key",
      title: "Split the hot chat into buckets",
      body: "For chats marked hot, the key becomes `(chat_id, bucket)`, where bucket is `msg_id % 8`. The eight buckets of `c_1` hash to different shards, so its writes are spread over all of them.\n\nThe cost: reading the latest messages of `c_1` now asks every shard and merges. That is acceptable for a handful of hot chats, not for all of them.",
      fields: {
        "hot chat": "Only a few chats get buckets. Normal chats stay on one shard.",
        bucket: "Part of the key. Bucket 5 of `c_1` lands on shard 0; others land elsewhere.",
      },
    },
    "add-shard": {
      short: "Add shard",
      title: "A fourth shard, and `% 4` moves 75% of the rows",
      body: "Shards grow to 2.6 TB, so we add shard 3. But the routing is `hash % 3`. Changing it to `% 4` changes the answer for three of every four rows.\n\nThe data mover has to copy 5.2 billion rows while traffic keeps flowing. The busy shards slow down, and the job would take nine days.",
      watch: "With `hash % n`, every change of `n` moves almost all data.",
      fields: {
        "rows that move": "A row stays only if `hash % 3` equals `hash % 4`: one in four.",
        eta: "Nine days of copying under load, with two routing maps alive at once.",
      },
    },
    slots: {
      short: "Slots",
      title: "Fixed slots: move only what the new shard takes",
      body: "We route in two steps: `hash % 1024` picks a slot, and a small map assigns each slot to a shard. The slot count never changes; only the map does.\n\nShard 3 takes 256 slots, a quarter of the data. Each slot moves alone: copy its rows, catch up on new writes, switch one map entry. Only 25% of rows move, and the rest of the system does not notice.",
      fields: {
        slot: "A fixed bucket of keys. The unit that moves between shards.",
        "catch up": "Writes that arrived during the copy are applied before the switch.",
        switch: "The map version changes, and the API sends this slot's queries to shard 3.",
        slots: "256 of 1024: shard 3 has its fair quarter.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Sharding spreads one table across servers when it no longer fits on one. Everything depends on the shard key.\n\n1) Pick the key your most common query filters on. 2) Avoid keys that grow over time: hash them. 3) Queries without the key fan out to every shard; keep them rare. 4) Watch for hot keys and split them. 5) Route through fixed slots so adding a shard moves only its share.",
    },
  },
};

export default text;
