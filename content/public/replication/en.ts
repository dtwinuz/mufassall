import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Database replication",
  summary:
    "A profile service outgrows one database. We add read replicas, meet replication lag and the read-your-writes problem, lose the leader, fail over, and decide what synchronous replication is worth.",
  learn: [
    "How a leader streams its log to followers, and what replication lag is",
    "Why a user can stop seeing their own write, and two ways to fix it",
    "What failover does, and why async replication can lose commits",
    "The price of a synchronous replica",
  ],
  nodes: {
    app: "Profile app",
    api: "Profile API",
    "db-a": "DB A",
    "db-b": "DB B",
    "db-c": "DB C",
    sentinel: "Failover manager",
  },
  metrics: {
    p95: "Request p95",
    lag: "Worst replica lag",
    stale: "Stale reads",
    lost: "Commits lost on failover",
  },
  steps: {
    "one-db": {
      short: "One DB",
      title: "One database takes every read and write",
      body: "Every profile view and every edit goes to one database, DB A. Nine requests in ten are reads.\n\nAt peak the database is at 95% load and a simple profile read takes 640 ms. The reads are crowding out the writes.",
      fields: {
        user_id: "A primary-key lookup. Cheap on its own, slow when the server is saturated.",
        Time: "640 ms for one row: the time is spent waiting for CPU and disk, not on the query.",
      },
    },
    replicas: {
      short: "Replicas",
      title: "Two followers copy the leader's log",
      body: "DB A becomes the leader: it alone takes writes. DB B and DB C are followers. Each one connects to the leader and receives the write-ahead log as a stream, then replays it to hold the same data.\n\nThe API sends writes to the leader and spreads reads across the two replicas. Leader load drops to 35%, p95 to 45 ms.",
      fields: {
        START_REPLICATION: "The follower asks for the log stream from a position onward.",
        SLOT: "A replication slot: the leader keeps the log until this follower has received it.",
        lsn: "Log sequence number: a position in the leader's log. Followers report how far they have replayed.",
      },
    },
    stale: {
      short: "Stale read",
      title: "A user saves, reloads and sees the old bio",
      body: "User `u_42` changes their bio. The write commits on the leader. The page reloads, and the read goes to DB B.\n\nDB B is busy serving a backup and is 900 ms behind. It returns the old bio, and the user thinks the save failed and edits again.",
      watch: "Asynchronous replicas are always a little in the past. The question is only how far.",
      fields: {
        bio: "Still `Backend dev`. The new text is on the leader but not here yet.",
        updated_at: "09:10:55: the replica has not replayed the 09:14 write.",
      },
    },
    lag: {
      short: "Lag",
      title: "Measuring replication lag",
      body: "The leader knows how far each follower is. DB C is 40 ms behind. DB B, busy with the backup, is 2.4 seconds behind.\n\nLag is not fixed: it grows with load on the replica, long queries and big write bursts on the leader. 5% of reads now return old data.",
      fields: {
        replay_lag: "Time between a commit on the leader and its replay on this follower.",
        db_b: "2.4 s behind. Any read sent here can miss the last 2.4 seconds of writes.",
        db_c: "40 ms behind: healthy, but still not zero.",
      },
    },
    "read-your-writes": {
      short: "Read your writes",
      title: "Read-your-writes: route by the user's last write",
      body: "After a write, the API remembers the leader's log position for that user's session. On the next read it asks the replica: have you replayed up to that position?\n\nIf yes, the replica answers. If not, this user's read goes to the leader. Other users still read from replicas. Stale reads of your own data drop to zero.",
      watch: "A simpler variant: send a user's reads to the leader for a few seconds after they write.",
      fields: {
        pg_last_wal_replay_lsn: "How far this replica has replayed the log.",
        caught_up: "`f` — the replica is behind this user's write, so the read goes to the leader.",
      },
    },
    "leader-dies": {
      short: "Leader down",
      title: "The leader dies",
      body: "DB A loses its disk. Reads still work on the replicas, but every write fails.\n\nThe replicas stopped receiving the log in the middle of the stream. Neither of them is allowed to take writes yet.",
      fields: {
        UPDATE: "A write. Only the leader can take it, and there is no leader.",
        "Connection refused": "The API keeps retrying and users see errors on save.",
      },
    },
    failover: {
      short: "Failover",
      title: "Failover: promote the most up-to-date replica",
      body: "A failover manager has watched DB A for 30 seconds with no answer. It picks the replica that has replayed the most log, DB C, and promotes it to leader. The API sends writes to DB C, and DB B now follows DB C.\n\nBut replication was asynchronous. DB A had acknowledged 12 commits that never reached any replica. Those users were told \"saved\", and their data is gone.",
      watch: "With async replication, a failover can lose writes that were already acknowledged.",
      fields: {
        candidates: "Each replica's last replayed position. The newest one loses the least.",
        promote: "DB C stops replaying and starts taking writes.",
        timeline: "A new history branch starts at 8, so the old leader's log cannot be mixed in.",
        "commits lost": "The difference between the dead leader's log and the new leader's.",
      },
    },
    rejoin: {
      short: "Rejoin",
      title: "The old leader comes back as a follower",
      body: "DB A gets a new disk and boots. It must not take writes: two leaders accepting different writes is split brain, and the data can never be merged.\n\nWe rewind it to the point where its history and the new leader's split, throwing away its 12 extra commits, and start it as a follower of DB C.",
      watch: "Fence the old leader before it comes back: block its writes, or it will happily take them.",
      fields: {
        pg_rewind: "Copies back only the changed blocks to match the new leader's history.",
        timeline: "The old leader is on timeline 7, the new one on 8. The fork point is where they agree.",
        rewinding: "Everything after the fork point is undone on DB A.",
        replica: "DB A now follows. The cluster has one leader again.",
      },
    },
    sync: {
      short: "Sync replica",
      title: "One synchronous replica: no acknowledged write is lost",
      body: "We make the leader wait: a commit is acknowledged only after at least one of the two followers has the log on disk. If the leader dies now, some follower has every acknowledged commit.\n\nThe cost: each write waits for a network round trip, about 3 ms here. And if both followers are down, writes stop instead of risking loss.",
      fields: {
        synchronous_standby_names: "Which followers can confirm a commit.",
        "ANY 1": "Any one of the two is enough. Waiting for all would make every write as slow as the slowest replica.",
        pg_reload_conf: "Applies the setting without a restart.",
        COMMIT: "Now includes a wait for one follower.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Replicas give read capacity and a spare for failover. They do not give fresh data: async replicas lag, and lag grows under load.\n\n1) Writes go to the leader, reads to replicas. 2) Measure lag and route a user's reads to the leader right after their write. 3) Failover promotes the most up-to-date replica and must fence the old leader. 4) Async can lose acknowledged commits; one synchronous replica prevents it at the cost of latency.",
    },
  },
};

export default text;
