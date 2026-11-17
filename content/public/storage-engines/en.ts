import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Storage engines: B-tree and LSM",
  summary:
    "A sensor fleet sends 50 000 readings a second, and a B-tree table cannot keep up. We follow a write through an LSM-tree engine: WAL, memtable, SSTables and compaction, and see what it costs on reads.",
  learn: [
    "Why a B-tree rewrites whole pages and turns small writes into random disk IO",
    "How an LSM-tree turns writes into appends: WAL, memtable, flush to SSTables",
    "Read amplification, Bloom filters and why compaction can stall writes",
    "When a B-tree wins and when an LSM-tree wins",
  ],
  nodes: {
    sensors: "Sensors",
    ingest: "Ingest service",
    table: "B-tree table",
    wal: "WAL",
    memtable: "Memtable",
    l0: "SSTables L0",
    l1: "SSTables L1",
    compact: "Compaction",
    dash: "Dashboard API",
  },
  metrics: {
    writes: "Accepted writes",
    "write-amp": "Write amplification",
    "read-files": "Places checked per read",
    "read-p99": "Read p99",
  },
  steps: {
    btree: {
      short: "B-tree",
      title: "A write lands in a B-tree page",
      body: "Every sensor sends a reading every few seconds. The ingest service inserts each one into a `readings` table with a B-tree primary key `(sensor_id, ts)`.\n\nThe database finds the leaf page where the key belongs, changes it in memory and logs the change to the WAL. Later the whole 8 KB page goes to disk, even though the row was 40 bytes.",
      check: {
        q: "The fleet grows to 50 000 writes a second, each to a different page. What gives out first?",
        options: [
          "The WAL: appends cannot keep up",
          "The CPU: parsing that many INSERTs",
          "The disk: random page writes keep it 100% busy",
        ],
        answer: 2,
        why: "Each write dirties a different 8 KB page and full pages split, so the disk does random writes all over the table. It is 100% busy and the table accepts only 12 000 writes a second; the WAL append is the cheap part.",
      },
      fields: {
        sensor_id: "The first key column. Readings from 10 000 sensors land on 10 000 different pages.",
        wal: "The write-ahead log entry: small and sequential. This part is cheap.",
        dirty: "The page changed in memory. Sooner or later all 8 KB are written back.",
      },
    },
    "random-io": {
      short: "Random IO",
      title: "At 50 000 writes a second the disk gives up",
      body: "The fleet grows to 50 000 writes a second. Each write touches a different page, so the disk does random writes all over the table. Full pages split in two, and every split is more pages to write.\n\nThe disk is 100% busy and the table accepts only 12 000 writes a second. Sensors get errors and lose data.",
      watch: "Write amplification: 40 bytes of data turn into kilobytes of disk writes.",
      fields: {
        checkpoint: "The database flushes every dirty page to disk. Here it takes almost 30 seconds.",
        buffers: "3.2 GB of 8 KB pages written for a few hundred MB of new rows.",
        "page splits": "A full leaf page split in two: both halves and the parent are written.",
        IOPS: "Random IO operations per second. The disk is at its limit.",
      },
    },
    lsm: {
      short: "LSM",
      title: "LSM-tree: append to a log, sort in memory",
      body: "We move to an LSM-tree engine. A write does two cheap things: it appends to the WAL, a file that only grows at the end, and puts the key into the memtable, a sorted tree in memory.\n\nNo page on disk is found or rewritten. The disk sees one sequential stream, and the service takes 50 000 writes a second.",
      fields: {
        APPEND: "Writes at the end of the log file. No seek, no read before the write.",
        offset: "Where in the file this record lies. It only grows.",
        "group commit": "312 writes share one disk sync. That is how a log takes tens of thousands of writes a second.",
        fsync: "The data is on disk before the write is acknowledged. If the process dies, the WAL replays the memtable.",
      },
    },
    flush: {
      short: "Flush",
      title: "A full memtable becomes an SSTable",
      body: "When the memtable reaches 64 MB it is frozen, a new empty one takes writes, and the frozen one is written to disk as an SSTable: a sorted file that is never changed again.\n\nAfter the flush its WAL segment is no longer needed and is deleted. New files land in level 0.",
      check: {
        q: "Every L0 file covers almost all sensors. How many places does a read of one sensor's latest value check?",
        options: [
          "Many: the memtable and every overlapping L0 file",
          "One: SSTables are sorted, so one file holds the key",
          "None on disk: the memtable always has the latest value",
        ],
        answer: 0,
        why: "L0 key ranges overlap, so the newest value can be in any file. The engine checks the memtable and then 30 files, newest first: 31 places, and read p99 rises to 85 ms.",
      },
      fields: {
        flush: "Writing the sorted memtable out in one sequential pass.",
        level: "`0` — fresh files from flushes. Their key ranges overlap each other.",
        range: "The lowest and highest key in the file. Every L0 file covers almost all sensors.",
        deleted: "The data is safe in the SSTable now, so the log segment can go.",
      },
    },
    "read-amp": {
      short: "Read amp",
      title: "One read checks 31 places",
      body: "The dashboard asks for the latest reading of sensor `s_1093`. The newest value can be anywhere, so the engine checks the memtable and then every L0 file from newest to oldest.\n\nThirty files overlap the key, and the hit is in the last one. One read became 31 lookups, and read p99 rose to 85 ms.",
      watch: "LSM writes are cheap because the work is moved to reads and to compaction.",
      fields: {
        miss: "This file covers the key range, but the key is not there. A wasted disk read.",
        hit: "Found in the oldest file. Only now can the engine answer.",
        "files read": "Read amplification: 31 places checked for one key.",
      },
    },
    bloom: {
      short: "Bloom",
      title: "A Bloom filter skips the wrong files",
      body: "Each SSTable gets a Bloom filter, a few bits per key kept in memory. It answers \"definitely not here\" or \"maybe here\".\n\nThe engine now skips 29 files without touching the disk and reads only the one that says maybe. One disk read, p99 back to 9 ms.",
      fields: {
        bloom: "A memory check before the disk read. `no` is always right.",
        maybe: "Probably here; about 1% of the time it is wrong and the read is wasted.",
        "disk reads": "From 31 to 1 for a single key.",
      },
    },
    compaction: {
      short: "Compaction",
      title: "Compaction merges files into level 1",
      body: "L0 keeps growing with a new file every few seconds. A background compaction job merges L0 files into L1: sorted, non-overlapping files, so each key lives in exactly one L1 file.\n\nOld versions and deleted keys are thrown away. The price: the same data is written to disk again, once per level.",
      check: {
        q: "A storm pushes writes to 80 000 a second, faster than compaction can merge L0. What happens?",
        options: [
          "Writes keep flowing; only disk usage grows",
          "The engine slows writes down on purpose",
          "Reads fail until compaction catches up",
        ],
        answer: 1,
        why: "Flushes create L0 files faster than compaction merges them. At the L0 limit of 36 files the engine throttles writers to protect reads, and accepted writes fall to 16 000 a second.",
      },
      fields: {
        compact: "Read several sorted files, merge them, write new ones. A large sequential job.",
        "old versions": "Sensors overwrite the same `latest` key. Only the newest version survives.",
        tombstones: "A delete in an LSM is a marker written later. Compaction finally removes the data and the marker.",
      },
    },
    stall: {
      short: "Stall",
      title: "Compaction falls behind and writes stall",
      body: "A storm hits, every sensor reports at once, and writes jump to 80 000 a second. Flushes create L0 files faster than compaction can merge them.\n\nWhen L0 reaches its limit, the engine slows writes down on purpose so reads do not have to check hundreds of files. Accepted writes fall to 16 000.",
      watch: "An LSM-tree absorbs bursts only while compaction keeps up. Compaction debt is real debt.",
      fields: {
        "write stall": "The engine throttles writers to protect reads and disk space.",
        limit: "Hard cap on L0 files. Above it, writes stop.",
        "pending compaction": "41 GB waiting to be merged. This number must go down, not up.",
      },
    },
    tune: {
      short: "Tune",
      title: "Give compaction room and cap the input",
      body: "Compaction gets six threads instead of two. A bigger memtable makes fewer, larger L0 files. Writes slow down gently at 20 files instead of stopping at 36.\n\nThe ingest service caps each node at 60 000 writes a second and buffers the rest briefly. Writes are back at 50 000 a second and L0 stays small.",
      fields: {
        threads: "More parallel merges, at the cost of CPU and disk bandwidth.",
        "memtable size": "Fewer flushes, fewer L0 files; costs memory and a longer WAL replay.",
        slowdown: "Brake early and gently instead of a hard stop.",
        "ingest limit": "Backpressure at the door, before the engine has to say no.",
      },
    },
    "range-scan": {
      short: "Range scan",
      title: "A range read: where the B-tree wins",
      body: "The dashboard asks for one sensor's last hour. A B-tree reads a few neighbouring leaf pages. The LSM engine opens an iterator on the memtable, on each L0 file and on L1, and merges them.\n\nIt also walks past old versions that compaction has not dropped yet. The range read takes 45 ms, where a B-tree would take a few.",
      fields: {
        SCAN: "A key range, not a single key.",
        "merge iterators": "Every level is sorted, but they are separate. The engine merges five streams.",
        skipped: "One third of the keys seen were older versions of the same key.",
        bloom: "A Bloom filter answers \"is this key here?\", not \"what lies between A and B?\".",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "A B-tree updates data in place: fast, predictable reads and range scans, but every small write rewrites a page at a random spot. An LSM-tree appends and sorts later: very fast writes, paid for with read amplification and compaction.\n\nPick a B-tree for read-heavy, transactional data with many range queries. Pick an LSM-tree for write-heavy streams: events, metrics, logs. With an LSM, watch three numbers: L0 file count, pending compaction and write stalls.",
    },
  },
};

export default text;
