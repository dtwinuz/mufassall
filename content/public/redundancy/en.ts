import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Redundancy and failover",
  summary:
    "Every part fails sooner or later. How to find single points of failure, add a spare for each, switch over automatically, and not lose data on the way.",
  learn: [
    "How to spot a single point of failure",
    "Active-active app servers and health checks",
    "Active-passive databases: replica, failover, fencing",
    "What async and sync replication cost, and why zones matter",
  ],
  nodes: {
    guest: "Guest",
    app1: "App 1 · zone A",
    app2: "App 2 · zone B",
    lb: "Load balancer",
    db1: "DB 1 · zone A",
    db2: "DB 2 · zone B",
  },
  metrics: {
    errors: "Errors",
    recovery: "Time to recover",
    lost: "Lost bookings",
    "write-p95": "Write p95",
  },
  steps: {
    spof: {
      short: "One server",
      title: "One server, one point of failure",
      body: "The booking site runs on one app server and one database. At 3 a.m. the app server's disk fills up and the process dies.\n\nEvery request fails until someone wakes up, logs in and restarts it: half an hour of full outage.",
      watch: "A single point of failure is any part whose loss stops the whole system. Look for them before they find you.",
      fields: {
        "Connection refused": "Nothing listens on the port. The guest gets an error page, the hotel gets no booking.",
      },
    },
    "two-apps": {
      short: "Two apps",
      title: "Two app servers behind a load balancer",
      body: "A second app server runs the same code. A load balancer sends each request to one of them: both serve traffic all the time, this is **active-active**.\n\nThis works because the app servers keep no state of their own: sessions and data live in the database.",
      watch: "The load balancer is now a single point itself. In practice it runs as a pair sharing one floating IP.",
      fields: {
        "/healthz": "Every two seconds the load balancer asks each server: are you alive?",
        status: "“ok” means this server can take requests.",
        db: "A good check tests what the server needs to work, not only that the process is running.",
      },
    },
    "app-dies": {
      short: "Health check",
      title: "A dead server is taken out in seconds",
      body: "App 2 hangs. Its health checks time out three times in a row, and the load balancer stops sending it traffic.\n\nA few requests that were already on app 2 fail; everything after that goes to app 1. Nobody had to wake up.",
      watch: "App 1 now carries all the traffic. Two servers protect you only if one can handle the full load.",
      fields: {
        unhealthy_threshold: "Three failures in a row, so one slow answer does not throw a healthy server out.",
        "removed from pool": "No new requests go to app 2 until it passes checks again.",
      },
    },
    replica: {
      short: "Replica",
      title: "A standby copy of the database",
      body: "A database cannot simply be doubled: two servers taking writes on their own would disagree. So DB 2 is a **replica**: it receives the primary's write-ahead log and replays it.\n\nThis is **active-passive**: DB 1 takes all writes, DB 2 follows a fraction of a second behind and waits.",
      fields: {
        START_REPLICATION: "DB 2 asks the primary to stream its log from this position on.",
        WAL: "Write-ahead log: every change in order. Replaying it rebuilds the same data.",
        replay_lag: "How far DB 2 is behind: 180 ms of writes exist only on DB 1.",
      },
    },
    "primary-dies": {
      short: "Primary down",
      title: "The primary database dies",
      body: "DB 1's server loses power. Both app servers fail every request that touches the database, which is almost all of them.\n\nDB 2 has the data, but it is a read-only replica. Someone must notice, decide and promote it by hand: twenty minutes at night.",
      watch: "A spare that needs a human to switch on is a backup, not redundancy.",
      fields: {
        bookings: "A guest's booking that cannot be saved anywhere right now.",
        "timed out": "The primary is gone. The apps wait, then fail.",
      },
    },
    failover: {
      short: "Failover",
      title: "Automatic failover",
      body: "A small cluster manager watches DB 1. After 10 seconds without an answer it **promotes** DB 2 to primary and points the name `db-primary.internal` at it.\n\nThe app servers reconnect to the same name and reach DB 2. Writes come back in about 30 seconds.",
      watch: "Failing over too quickly is risky too: a short network blip should not trigger a switch.",
      fields: {
        "db-primary.internal": "The apps never use a server's own address, only this role name.",
        "192.0.2.121": "Now DB 2's address. A 5-second TTL makes the apps notice quickly.",
      },
    },
    "lost-writes": {
      short: "Lost writes",
      title: "The last seconds never reached the replica",
      body: "Replication was **asynchronous**: DB 1 confirmed a write to the guest before sending it to DB 2.\n\nWhen DB 1 died, 2.1 seconds of confirmed bookings existed only on its disk. DB 2 became primary without them. 240 guests were told “booked” and the booking is gone.",
      watch: "Async replication plus failover means: the last moments before a crash can be lost.",
      fields: {
        last_lsn: "The last write DB 1 committed and confirmed.",
        replay_lsn: "The last write DB 2 had received. Slightly older.",
        gap: "The difference: confirmed to guests, missing on the new primary.",
      },
    },
    "split-brain": {
      short: "Split brain",
      title: "Two primaries at once",
      body: "DB 1 comes back after a reboot. It still believes it is the primary, and app 1 has an old connection that finds it.\n\nNow app 1 writes to DB 1 and app 2 writes to DB 2. The two databases drift apart; one side's bookings will have to be thrown away.",
      watch: "Split brain is worse than downtime: you lose data quietly and find out days later.",
      fields: {
        "INSERT 0 1": "The write succeeded, on the wrong database.",
        primary: "DB 1 does not know it was replaced while it was down.",
      },
    },
    fencing: {
      short: "Fencing",
      title: "Fence the old primary",
      body: "Every promotion raises a **term** number. A database with an older term is not allowed to accept writes. DB 1 comes back with term 7, sees term 8, and steps down.\n\nIt rewinds its unshipped changes, becomes a replica of DB 2 and follows it. Only one primary can write at a time.",
      watch: "Fencing must happen before the new primary takes writes: cut the old one off first, then promote.",
      fields: {
        term: "A counter that only grows. The higher term wins, so an old primary cannot win back its role.",
        demoted: "DB 1 is now a replica and refuses writes.",
        rewind: "DB 1 drops its writes after the point where DB 2 took over and copies from DB 2 instead.",
      },
    },
    sync: {
      short: "Sync replica",
      title: "Confirm only after the replica has it",
      body: "Booking writes now use **synchronous** replication: the primary answers “committed” only after the replica confirms it has the change on disk.\n\nA crash can no longer lose a confirmed booking. The price is one extra round trip on every write: about 3 ms between two zones.",
      watch: "If the only sync replica dies, writes stop. Production setups keep two replicas and wait for either one.",
      fields: {
        synchronous_commit: "Wait for the replica's confirmation before telling the client “done”.",
        COMMIT: "The guest gets “booked” only after this returns.",
        confirm: "The extra wait: the cost of not losing data.",
      },
    },
    "zone-down": {
      short: "Zone down",
      title: "A whole zone goes dark",
      body: "Zone B loses power: app 2 and DB 2 are gone together. The load balancer drops app 2, the cluster manager promotes DB 1, and app 1 carries everything.\n\nThirty seconds of slower answers and no lost bookings: the sync replica in zone A had every confirmed write.",
      watch: "Two copies in one rack or one zone fail together. Put each copy where a different failure would take it out.",
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Find the parts whose loss stops everything and give each a spare that takes over without a human.\n\n1) Stateless servers run active-active behind health checks. 2) Databases run active-passive with a replica and automatic failover. 3) Fence the old primary so only one can write. 4) Async replication can lose the last seconds; sync costs latency. 5) Spread the copies across zones.",
    },
  },
};

export default text;
