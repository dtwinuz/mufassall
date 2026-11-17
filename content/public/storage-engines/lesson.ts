import { defineLesson } from "@mufassall/scene-schema";

/**
 * A sensor ingestion service: first on a B-tree table, then on an LSM-tree engine
 * (WAL + memtable + SSTables + compaction). Log lines are generic, not one product's.
 * Numbers are a model scenario for the story, not measurements.
 */
export default defineLesson({
  slug: "storage-engines",
  level: "advanced",
  minutes: 15,
  tier: "public",
  metrics: [
    { id: "writes", unit: "/s", better: "up" },
    { id: "write-amp", unit: "x", better: "down" },
    { id: "read-files", unit: "", better: "down" },
    { id: "read-p99", unit: "ms", better: "down" },
  ],
  steps: [
    {
      id: "btree",
      kind: "case",
      nodes: {
        sensors: { kind: "client", at: [0, 4] },
        ingest: { kind: "service", at: [3, 4], load: 20 },
        table: { kind: "db", at: [7, 4], load: 30 },
      },
      edges: {
        send: { from: "sensors", to: "ingest", rate: 6 },
        write: { from: "ingest", to: "table", rate: 6 },
      },
      metrics: { writes: 8000, "write-amp": 10, "read-files": 1, "read-p99": 3 },
      focus: ["ingest", "table"],
      exchange: {
        edge: "write",
        request: {
          format: "sql",
          head: "INSERT INTO readings (sensor_id, ts, value)",
          body: "VALUES ('s_1093', 1795392843, 21.4);",
        },
        response: {
          format: "text",
          head: "INSERT 0 1",
          body: "wal: +96 bytes\npage 81233: dirty, 8192 bytes to flush",
        },
        marks: ["sensor_id", "wal", "dirty"],
      },
    },
    {
      id: "random-io",
      kind: "problem",
      nodes: { ingest: { state: "slow", load: 90 }, table: { state: "slow", load: 100 } },
      edges: { send: { flow: "fail", rate: 10 }, write: { rate: 4 } },
      metrics: { writes: 12000, "write-amp": 40 },
      focus: ["table"],
      exchange: {
        edge: "write",
        request: {
          format: "text",
          head: "LOG: checkpoint complete",
          body: "wrote 412840 buffers (3.2 GB)\nwrite=27.4 s, sync=3.1 s\npage splits in last minute: 18220\ndisk: 100% busy, 9800 IOPS",
        },
        marks: ["checkpoint", "buffers", "page splits", "IOPS"],
      },
    },
    {
      id: "lsm",
      kind: "fix",
      nodes: {
        table: null,
        wal: { kind: "queue", at: [5, 1], load: 30 },
        memtable: { kind: "cache", at: [6, 4], load: 10 },
        ingest: { state: "ok", load: 50 },
      },
      edges: {
        send: { flow: "request", rate: 10 },
        append: { from: "ingest", to: "wal", rate: 10 },
        put: { from: "ingest", to: "memtable", rate: 10 },
      },
      metrics: { writes: 50000, "write-amp": 2 },
      focus: ["wal", "memtable"],
      exchange: {
        edge: "append",
        request: {
          format: "text",
          head: "APPEND 000412.log offset=88123904 len=64",
          body: "group commit: 312 records",
        },
        response: { format: "text", head: "fsync: 0.4 ms" },
        marks: ["APPEND", "offset", "group commit", "fsync"],
      },
    },
    {
      id: "flush",
      kind: "case",
      nodes: {
        l0: { kind: "storage", at: [9, 4], load: 20 },
        memtable: { load: 25 },
      },
      edges: { flush: { from: "memtable", to: "l0", rate: 2 } },
      metrics: { "write-amp": 3 },
      focus: ["memtable", "l0"],
      exchange: {
        edge: "flush",
        request: {
          format: "text",
          head: "flush memtable #57",
          body: "size: 64 MB, keys: 1048576\nwritten: 000913.sst level=0\nrange: s_0001 .. s_9999\nwal 000412.log: deleted",
        },
        marks: ["flush", "level", "range", "deleted"],
      },
    },
    {
      id: "read-amp",
      kind: "problem",
      nodes: {
        dash: { kind: "service", at: [6, 9], load: 40 },
        l0: { state: "slow", load: 80 },
      },
      edges: {
        "get-mem": { from: "dash", to: "memtable", rate: 2 },
        "get-l0": { from: "dash", to: "l0", rate: 8 },
      },
      metrics: { "read-files": 31, "read-p99": 85 },
      focus: ["dash", "l0"],
      exchange: {
        edge: "get-l0",
        request: { format: "text", head: "GET s_1093/latest" },
        response: {
          format: "text",
          head: "memtable: miss",
          body: "000943.sst: miss\n000942.sst: miss\n... 27 more files: miss\n000914.sst: hit\nfiles read: 31",
        },
        marks: ["miss", "hit", "files read"],
      },
    },
    {
      id: "bloom",
      kind: "fix",
      nodes: { l0: { state: "ok", load: 25 }, dash: { load: 15 } },
      edges: { "get-l0": { rate: 2 } },
      metrics: { "read-files": 2, "read-p99": 9 },
      focus: ["dash", "l0"],
      exchange: {
        edge: "get-l0",
        request: { format: "text", head: "GET s_1093/latest" },
        response: {
          format: "text",
          head: "memtable: miss",
          body: "000943.sst bloom: no\n000942.sst bloom: no\n... 27 more files bloom: no\n000914.sst bloom: maybe -> hit\ndisk reads: 1",
        },
        marks: ["bloom", "maybe", "disk reads"],
      },
    },
    {
      id: "compaction",
      kind: "fix",
      nodes: {
        compact: { kind: "worker", at: [11, 8], load: 60 },
        l1: { kind: "storage", at: [12, 4], load: 20 },
      },
      edges: {
        take: { from: "l0", to: "compact", rate: 4 },
        merge: { from: "compact", to: "l1", rate: 4 },
        "get-l1": { from: "dash", to: "l1", rate: 2 },
      },
      metrics: { "write-amp": 12 },
      focus: ["l0", "compact", "l1"],
      exchange: {
        edge: "merge",
        request: {
          format: "text",
          head: "compact L0 -> L1",
          body: "in: 8 files, 512 MB\nout: 3 files, 388 MB\ndropped: 1.9M old versions\ndropped: 40k tombstones",
        },
        marks: ["compact", "old versions", "tombstones"],
      },
    },
    {
      id: "stall",
      kind: "problem",
      nodes: {
        ingest: { state: "slow", load: 95 },
        compact: { state: "slow", load: 100 },
        l0: { state: "slow", load: 95 },
      },
      edges: { send: { flow: "fail", rate: 12 }, put: { rate: 3 }, append: { rate: 3 } },
      metrics: { writes: 16000, "read-files": 37, "read-p99": 120 },
      focus: ["ingest", "l0", "compact"],
      exchange: {
        edge: "put",
        request: {
          format: "text",
          head: "WARN write stall",
          body: "level0 files: 36 (limit 36)\npending compaction: 41 GB\nwrites delayed to 16 MB/s",
        },
        marks: ["write stall", "limit", "pending compaction"],
      },
    },
    {
      id: "tune",
      kind: "fix",
      nodes: {
        ingest: { state: "ok", load: 60 },
        compact: { state: "ok", load: 75 },
        l0: { state: "ok", load: 40 },
      },
      edges: { send: { flow: "request", rate: 10 }, put: { rate: 10 }, append: { rate: 10 }, take: { rate: 8 }, merge: { rate: 8 } },
      metrics: { writes: 50000, "read-files": 3, "read-p99": 11 },
      focus: ["compact", "l0"],
      exchange: {
        edge: "take",
        request: {
          format: "text",
          head: "compaction threads: 6 (was 2)",
          body: "memtable size: 256 MB (was 64 MB)\nlevel0 slowdown at: 20 files\nlevel0 stop at: 36 files\ningest limit: 60000/s per node",
        },
        marks: ["threads", "memtable size", "slowdown", "ingest limit"],
      },
    },
    {
      id: "range-scan",
      kind: "case",
      nodes: { dash: { load: 45 } },
      edges: { "get-mem": { rate: 4 }, "get-l0": { rate: 4 }, "get-l1": { rate: 6 } },
      metrics: { "read-files": 5, "read-p99": 45 },
      focus: ["dash", "l0", "l1"],
      exchange: {
        edge: "get-l1",
        request: { format: "text", head: "SCAN s_1093 from 09:00 to 10:00" },
        response: {
          format: "text",
          head: "merge iterators: memtable, 3 x L0, L1",
          body: "keys seen: 5400, returned: 3600\nskipped old versions: 1800\nbloom: not used for ranges",
        },
        marks: ["SCAN", "merge iterators", "skipped", "bloom"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
});
