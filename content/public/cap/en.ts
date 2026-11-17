import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "CAP: when the link breaks",
  summary:
    "A seat-booking service runs in two data centres that copy changes to each other. When the link between them breaks, each side must choose: refuse writes and stay correct, or accept them and sort out conflicts later. How quorums make that choice automatic.",
  learn: [
    "Why asynchronous replication means some reads are stale (eventual consistency)",
    "What a network partition forces you to choose: consistency or availability",
    "How an available system reconciles conflicting writes after the link heals",
    "Why quorums with R + W > N give fresh reads and let only the majority write",
  ],
  nodes: {
    "user-e": "User (east)",
    "api-e": "API east",
    "db-e": "DB east",
    "user-w": "User (west)",
    "api-w": "API west",
    "db-w": "DB west",
    fixer: "Reconciler",
    "db-t": "DB third site",
  },
  metrics: {
    accepted: "Writes accepted",
    stale: "Stale reads",
    conflicts: "Unresolved conflicts",
    lag: "Replication lag",
  },
  steps: {
    "two-dcs": {
      short: "Two DCs",
      title: "Two data centres, one booking system",
      body: "Users near the east site book seats through the east API, users near the west site through the west API. Each side has its own database.\n\nEvery change is copied to the other side in the background, about 30 ms later. Writes return fast, because nobody waits for the far side.",
      fields: {
        key: "The record that changed: seat 14A.",
        version: "Grows by one on every change. Replicas compare it to see which copy is newer.",
        lag_ms: "How far the copy is behind the original. Normally tens of milliseconds.",
      },
    },
    "stale-read": {
      short: "Stale read",
      title: "For 30 ms the two sides disagree",
      body: "User `u_42` books seat 14A in the east. A friend in the west opens the seat map a moment later, before the copy arrives, and sees 14A as free.\n\nThis is eventual consistency: if writes stop, both sides end up the same, but not at every instant. Usually it is 2% of reads and nobody notices.",
      fields: {
        holder: "West still shows nobody. East already has `u_42`.",
        version: "16 here, 17 in the east. The west copy is one change behind.",
      },
    },
    partition: {
      short: "Partition",
      title: "The link between the sites breaks",
      body: "A fibre between the data centres is cut. Both sites are up, both APIs answer their users, but they cannot reach each other.\n\nChanges pile up on each side. After 45 s a third of western reads show old data, and the gap keeps growing.",
      watch: "From one side, a dead peer and a broken link look exactly the same.",
      fields: {
        "timed out": "The east sees silence. It cannot tell whether the west is down or just unreachable.",
        lag: "Not milliseconds any more: as long as the cut lasts.",
      },
    },
    refuse: {
      short: "Refuse",
      title: "Choice 1: stay correct, refuse writes",
      body: "East is the primary for bookings. West, cut off from it, stops taking bookings and stops answering questions that need fresh data: 503, try again later.\n\nNo seat can be sold twice, and nobody sees old data. But half the users cannot book at all until the link is back. This is the consistent choice (CP).",
      fields: {
        "503": "The west is up, but declines on purpose.",
        "Retry-After": "Tells the app to retry in 30 s instead of hammering the server.",
        error: "`read_only`: a clear reason, so the app can show \"booking paused\" instead of a generic error.",
      },
    },
    accept: {
      short: "Accept",
      title: "Choice 2: stay available, accept writes on both sides",
      body: "The other option: the west keeps taking bookings during the cut. Every user can book, the service looks healthy.\n\nBut the east is doing the same. In the east `u_42` takes seat 14B; two seconds later in the west `u_77` takes the same 14B. Each side checked its own copy and saw it free. This is the available choice (AP).",
      watch: "Each side's check is correct for its own copy. The copies disagree.",
      fields: {
        "holder IS NULL": "\"Only if the seat is free.\" True in the west copy, while the east has already sold it.",
        "UPDATE 1": "Success. The west has no idea it just double-booked.",
      },
    },
    heal: {
      short: "Heal",
      title: "The link is back, so are the conflicts",
      body: "The fibre is repaired and replication resumes. Now both sides send their version of seat 14B, both at version 5, with different holders.\n\nThere is no right answer in the data itself. Over the hour of the cut 18 records ended up like this.",
      fields: {
        version: "Same number on both sides: both changed version 4. Neither is newer.",
        east: "East's write, with its time.",
        west: "West's write, 2.4 s later.",
        status: "The replicator cannot pick a winner by version. Someone has to decide.",
      },
    },
    reconcile: {
      short: "Reconcile",
      title: "Reconcile with a business rule",
      body: "A reconciler reads every conflict and applies a rule chosen by the business: for seats, the earlier hold wins. The loser gets an apology and another seat.\n\nOther data needs other rules. A like counter can just add both sides; a cart can merge the items. \"Last write wins\" is the simplest rule and silently throws one write away.",
      watch: "Available systems do not avoid conflicts. They move the cost to after the cut.",
      fields: {
        rule: "Decided per data type, in advance. Not by whichever packet arrived last.",
        loser: "A real person who was told \"booked\". The rule only decides who gets the bad news.",
        action: "The compensation: another seat. Sometimes a refund is the only option.",
      },
    },
    quorum: {
      short: "Quorum",
      title: "Three replicas, write to two, read from two",
      body: "A small third site is added. Each seat now lives on N = 3 replicas. A write counts only when W = 2 replicas confirm it; a read asks R = 2 replicas and takes the highest version.\n\nBecause R + W = 4 > 3, every read overlaps every finished write on at least one replica: no stale reads. The price is a slower write, 38 ms instead of 4, since one confirmation comes from another site.",
      fields: {
        N: "How many replicas hold each record.",
        W: "How many must confirm before the write is accepted.",
        committed: "Two of three confirmed. The third catches up in the background.",
      },
    },
    majority: {
      short: "Majority",
      title: "Now the partition decides itself",
      body: "The east site is cut off from both others. West and the third site still see each other: 2 of 3, a majority. They keep accepting bookings.\n\nThe east can reach only its own replica: 1 of 3. It cannot collect W = 2, so it refuses writes by itself. No double booking, no reconciler, and only the minority side is unavailable.",
      fields: {
        error: "`no_quorum`. Not a crash: the east knows it is in the minority.",
        acks: "Only the east's own database confirmed.",
        needed: "W = 2. Without a second site no write is accepted.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Links between sites do break, and then you choose: be correct or be available. You cannot have both during the cut.\n\n1) Async replication means stale reads for a short time, even on a good day. 2) Consistent (CP): the cut-off side refuses writes. 3) Available (AP): both sides accept, then a business rule reconciles conflicts. 4) Quorums with R + W > N give fresh reads and let only the majority side write.",
    },
  },
};

export default text;
