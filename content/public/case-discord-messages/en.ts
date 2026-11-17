import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Case: how Discord stores messages",
  summary:
    "From one MongoDB collection to Cassandra and then to ScyllaDB: how Discord kept trillions of chat messages readable. Partition keys, tombstones, hot partitions, data services with request coalescing, and a migration at 3.2 million messages a second. Sources: https://discord.com/blog/how-discord-stores-billions-of-messages and https://discord.com/blog/how-discord-stores-trillions-of-messages",
  learn: [
    "Why a partition key of (channel, time bucket) keeps partitions small",
    "How deletes become tombstones and what they cost on reads",
    "Hot partitions: one busy channel slows a whole node",
    "Data services: request coalescing and routing by a consistent hash of the channel",
    "How a large live migration was made fast, checked and finished",
  ],
  nodes: {
    users: "Users",
    api: "API monolith",
    mongo: "MongoDB",
    n1: "Cassandra node 1",
    n2: "Cassandra node 2",
    n3: "Cassandra node 3",
    ds: "Data service A",
    ds2: "Data service B",
    mig: "Rust migrator",
    scylla: "ScyllaDB",
  },
  metrics: {
    read: "Read p99",
    insert: "Insert p99",
    nodes: "DB nodes",
  },
  steps: {
    mongo: {
      short: "MongoDB",
      title: "2015: one collection, one index",
      body: "Discord first kept every message in one MongoDB collection with a compound index on `channel_id` and `created_at`. History is stored forever, and reads and writes were about 50/50, with very random reads.\n\nBy November 2015 there were about 100 million stored messages. The data and the index no longer fit in RAM, and latency became unpredictable. The query here is simplified.",
      watch: "A store that is fast only while the working set fits in memory falls off a cliff, not a slope.",
      fields: {
        channel_id: "Every chat read is \"the latest messages of one channel\".",
        created_at: "Sort order. Later replaced with Snowflake ids: two messages can share a timestamp.",
        RAM: "Once the index spills out of memory, each read may touch the disk.",
      },
    },
    "partition-key": {
      short: "Partition key",
      title: "Cassandra: a channel split into time buckets",
      body: "Discord moved messages to Cassandra. The primary key is `((channel_id, bucket), message_id)`: all messages of one channel within one time window live together in one partition, copied to three nodes.\n\nA bucket is about 10 days, chosen so that even the largest channels stay under 100 MB per partition. `message_id` is a Snowflake, so it sorts by time. In 2017 the cluster was 12 nodes, with reads under 5 ms.",
      watch: "A partition must stay bounded. A key that only says \"channel\" lets one busy channel grow without limit.",
      check: {
        q: "Why not use just `channel_id` as the partition key?",
        options: [
          "Cassandra does not allow a numeric partition key",
          "A busy channel would grow into one huge partition on the same few nodes",
          "Messages of one channel would be spread randomly over the cluster",
        ],
        answer: 1,
        why: "The partition key decides which nodes hold the data. With the channel alone, the busiest channels grow into partitions far past 100 MB that never spread out. Adding a time bucket caps each partition at about 10 days of messages.",
      },
      fields: {
        channel_id: "First half of the partition key: which channel.",
        bucket: "Second half: which roughly 10-day window. Caps the partition size.",
        message_id: "Clustering key: a Snowflake id, so messages inside a partition are sorted by time.",
        "PRIMARY KEY": "The inner brackets are the partition key; what follows orders rows inside it.",
      },
    },
    tombstones: {
      short: "Tombstones",
      title: "Deleted messages still cost reads",
      body: "In Cassandra a delete is a write: a tombstone that hides the old value until compaction removes both. On one public server millions of messages were deleted and one was left.\n\nLoading that channel took about 20 seconds: the node scanned millions of tombstones to return one row and showed 10-second stop-the-world GC pauses. Discord cut the tombstone lifetime from 10 days to 2 and made queries skip buckets known to be empty.",
      fields: {
        bucket: "The query reads one bucket. Here it is full of tombstones.",
        tombstones: "Delete markers. Reads must step over them until compaction cleans up.",
        GC: "The JVM garbage collector stops the whole node while it works.",
      },
    },
    growth: {
      short: "Growth",
      title: "From 12 nodes to 177",
      body: "By early 2022 the messages cluster had 177 nodes and trillions of messages. Small servers of a few friends send orders of magnitude fewer messages than servers with hundreds of thousands of members, so load across partitions is very uneven.\n\nThe on-call team was frequently paged for this database.",
      fields: {
        "177": "Nodes in the cluster. Each one is a machine to tune, repair and watch.",
        "replication factor": "Each partition lives on three nodes.",
        trillions: "Messages are never thrown away: history stays readable forever.",
      },
    },
    "hot-partition": {
      short: "Hot partition",
      title: "One busy channel slows a whole node",
      body: "A big server posts an announcement and a huge number of people open the same channel at once. All those reads hit one partition, that is, the same three replicas.\n\nReads and writes use quorum, so a slow replica holds up every query that needs it, including queries for quite different, quiet channels on the same node. Latency spreads across the cluster.",
      watch: "Uneven keys turn one node's bad minute into everyone's bad minute.",
      check: {
        q: "Thousands of users read the same channel at the same moment. What happens to a quiet channel whose partition sits on the same nodes?",
        options: [
          "Nothing: each partition is served separately",
          "Its reads get slow too, because the node itself is overloaded",
          "Its data moves to another node automatically",
        ],
        answer: 1,
        why: "A partition is not a separate machine. The hot partition eats the node's CPU and disk, and quorum reads wait for that node, so every channel stored there slows down.",
      },
      fields: {
        QUORUM: "Two of the three replicas must answer. One slow replica slows the query.",
        channel_id: "The same channel for everyone: the same partition, the same nodes.",
        "every other query": "Other channels on these nodes pay for the hot one.",
      },
    },
    compaction: {
      short: "Compaction",
      title: "Compaction falls behind, GC pauses grow",
      body: "Cassandra merges its files in the background (compaction). When it falls behind, each read has to check more files and gets slower, and slow reads cascade.\n\nOperators did what the post calls a \"gossip dance\": take a node out of rotation, let it compact, bring it back to collect hints, repeat. JVM garbage collection pauses caused latency spikes, and some were long enough that a node had to be rebooted by hand.",
      fields: {
        compactions: "Background merges of data files. The backlog makes every read more expensive.",
        GC: "Garbage collection in the JVM: pauses stop the node from answering.",
        hints: "Writes the node missed while it was out, replayed when it returns.",
      },
    },
    "data-service": {
      short: "Data service",
      title: "A data service between the API and the database",
      body: "Discord put data services between the API monolith and the database clusters. They are written in Rust and expose gRPC endpoints, roughly one endpoint per database query, and they intentionally contain no business logic.\n\nThat gives one place to control how traffic reaches the database. The message shown here is a simplified illustration.",
      fields: {
        gRPC: "A typed RPC between the API and the data service.",
        channel_id: "The request names the channel. This matters in the next two steps.",
        "business logic": "None here: the service only shapes and protects database access.",
      },
    },
    coalescing: {
      short: "Coalescing",
      title: "Request coalescing: one query for many readers",
      body: "When many users ask for the same row at the same time, the data service queries the database only once. The first request starts a worker task; the requests that arrive while it runs subscribe to the same task and get its result.\n\nA spike of identical reads on a hot channel becomes one read for the database.",
      watch: "Coalescing only helps when the identical requests meet in the same process.",
      check: {
        q: "There are many data service instances and the API picks one at random. How much does coalescing help a hot channel?",
        options: [
          "Little: the same reads are spread over many instances, each makes its own query",
          "Fully: instances share their worker tasks over the network",
          "Not at all: coalescing works only for writes",
        ],
        answer: 0,
        why: "Coalescing joins requests inside one instance. With random routing, each instance sees only a slice of the readers and still sends its own query, so the database gets one query per instance instead of one in total.",
      },
      fields: {
        "worker task": "Started by the first request; it does the actual database read.",
        subscribe: "Later requests do not query, they wait for the same answer.",
        "same rows": "Everyone gets the same result from one database read.",
      },
    },
    routing: {
      short: "Routing",
      title: "Route by channel with a consistent hash",
      body: "Requests are routed by a key; for messages the key is the channel id. A consistent hash maps each channel to one data service instance, so all requests for one channel land in the same place and coalescing works fully.\n\nDiscord says these changes bought time and smoothed traffic spikes, but did not remove hot partitions completely.",
      fields: {
        channel_id: "The routing key. Same channel, same instance.",
        "consistent hash": "Adding or removing an instance moves only a small share of the channels.",
        "same instance": "That is where identical requests meet and are coalesced.",
      },
    },
    migrate: {
      short: "Migration",
      title: "Moving trillions of messages to ScyllaDB",
      body: "ScyllaDB is compatible with Cassandra, written in C++, has no garbage collector and splits work per CPU core. By 2020 every other Discord database had moved to it.\n\nThe first plan, writing new data to both and copying history with ScyllaDB's Spark migrator, was estimated at three months. The team wrote its own migrator in Rust: it reads token ranges, saves checkpoints in SQLite and writes into ScyllaDB. The new estimate was nine days, at a peak of 3.2 million messages a second. It stalled at 99.9999%: the last ranges were full of tombstones and timed out until they were compacted. To check the result, a small share of reads went to both databases and the answers were compared.",
      fields: {
        "token range": "A slice of the hash ring. The unit of work and of progress.",
        SQLite: "A local checkpoint file: a restart continues instead of starting over.",
        estimate: "Nine days instead of three months, from a faster copier.",
        "99.9999%": "The last ranges failed on old tombstones, the same problem as before.",
      },
    },
    results: {
      short: "Results",
      title: "Fewer nodes, flat latency",
      body: "Discord switched to ScyllaDB in May 2022. 177 Cassandra nodes became 72 ScyllaDB nodes, each holding 9 TB instead of about 4 TB on average.\n\np99 for fetching history went from 40-125 ms to 15 ms, and p99 for inserts from 5-70 ms to a steady 5 ms. During the 2022 World Cup final, message sends spiked with each goal, and the system handled it.",
      fields: {
        p99: "The slow tail. It went from a range that depended on the day to one flat number.",
        "72": "Nodes after the move, down from 177.",
        "9 TB": "Disk per node: fewer, larger nodes.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "What to take from Discord's story.\n\n1) Choose the partition key by how you read, and bound it: channel plus a time bucket. 2) Deletes are writes; tombstones and compaction are part of the read cost. 3) Uneven keys make hot partitions; protect the database with a layer in front of it. 4) Coalesce identical reads and route by the same key so they meet. 5) For a big migration, make the copier fast and restartable, and compare reads from both stores before switching.\n\nSources: https://discord.com/blog/how-discord-stores-billions-of-messages and https://discord.com/blog/how-discord-stores-trillions-of-messages",
    },
  },
};

export default text;
