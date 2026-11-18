import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Distributed locks",
  summary:
    "A marketplace pays its sellers with a nightly job. With two pods for availability the job runs twice and every seller is paid twice. A lock in Redis makes one pod wait for the other, until a lease runs out mid-job or a paused process wakes up still believing it holds the lock. Fencing tokens checked by the database, an idempotency key at the bank and an honest look at Redlock show what a lock can and cannot promise, and when a lock in the database itself is the better tool.",
  learn: [
    "Why a mutex inside one process does nothing across pods, and how `SET key token NX PX` builds a lock with a lease",
    "Releasing and renewing only your own lock, with a token compared inside a Lua script",
    "Why a GC pause or a clock jump breaks any lease, and how fencing tokens checked by the storage make a stale holder harmless",
    "What Redlock does and does not fix, and when a database lock or leader election is the better choice",
  ],
  nodes: {
    a: "Worker A",
    b: "Worker B",
    db: "Payouts DB",
    bank: "Bank",
    redis: "Redis",
  },
  metrics: {
    dup: "Double payouts",
    stale: "Stale writes accepted",
    rejected: "Stale writes rejected",
  },
  steps: {
    cron: {
      short: "Job",
      title: "One pod pays the sellers every night",
      body: "At 02:00 a scheduled job reads the pending payouts, sends a transfer to the bank for each one and marks it paid. A normal night is 2 140 payouts in 18 seconds.\n\nThere is one pod, so there is one run. Nobody had to think about who else might be doing the same work.",
      fields: {
        cron: "A timer inside the service: every night at 02:00.",
        pending: "Payouts not yet sent. The job's to-do list.",
        transfers: "A real money movement for every row.",
        "18 s": "How long the job holds its work. It will matter.",
      },
    },
    scaled: {
      short: "Two pods",
      title: "A second pod, and every seller is paid twice",
      body: "For availability the service now runs on two pods. Both have the same schedule. At 02:00 both read the same 2 140 pending payouts before either has marked a single one, and both send them all.\n\nThe bank executes 2 140 transfers twice. The code did not change: only the number of copies running it.",
      check: {
        q: "Each pod wraps the job in a mutex inside its own process. Does that help?",
        options: [
          "Yes, a mutex prevents two runs",
          "No: each process has its own mutex, the pods never see each other's",
          "Only if both pods run on the same machine",
        ],
        answer: 1,
        why: "A mutex lives in one process's memory. Two pods are two processes, often on two machines; neither can see the other's mutex, even on the same host. The lock has to live somewhere both can reach.",
      },
      fields: {
        "pod-b": "An identical copy, started 4 ms later.",
        pending: "Both read the list before anything is marked.",
        "two identical schedules": "Scaling copied the timer, not just the capacity.",
        "paid twice": "A bug that costs real money, all at once.",
      },
    },
    setnx: {
      short: "SET NX",
      title: "A lock in Redis: SET only if absent, with a lease",
      body: "Before the run, each pod tries `SET lock:payouts:<date> <token> NX PX 30000`. Redis runs commands one at a time, so exactly one pod gets `OK`; the other gets nothing and skips the run.\n\nThe value is a random token unique to this holder. `PX 30000` is a **lease**: if the holder dies, the key vanishes after 30 seconds and tomorrow's run is not blocked forever.",
      watch: "Never `SETNX` and then `EXPIRE` as two commands: a crash between them leaves a lock that never expires.",
      fields: {
        NX: "Set only if the key does not exist. The check and the write are one step.",
        PX: "Lease in milliseconds. A dead holder cannot block the lock forever.",
        "7f3c9a1e": "A random token: who holds the lock, needed for release.",
        OK: "pod-a holds the lock.",
        "(nil)": "The key already exists. pod-b does not run.",
      },
    },
    release: {
      short: "Release",
      title: "Release only the lock that is still yours",
      body: "When the job ends, the pod deletes the key. But it deletes it only if the key still holds its own token, and it does the compare and the delete in one Lua script, which Redis runs as one step.\n\nA plain `DEL` would be a bug waiting for a slow night: if the lease ran out and another pod took the lock, the first pod's `DEL` would free the other pod's lock.",
      check: {
        q: "Why not just `DEL lock:payouts:<date>` when the job finishes?",
        options: [
          "That is the same thing, only shorter",
          "If the lease already ran out and pod-b holds the lock, the `DEL` frees pod-b's lock and a third run can start",
          "`DEL` is slower than a Lua script",
        ],
        answer: 1,
        why: "Without the token check, a holder whose lease expired deletes whatever is there now: someone else's lock. The token makes \"release\" mean \"release mine\". The script keeps the check and the delete atomic.",
      },
      fields: {
        GET: "Read who holds the lock now.",
        ARGV: "The token this pod was given when it locked.",
        DEL: "Delete only when the tokens match.",
        "return 0": "Not ours any more: touch nothing.",
      },
    },
    expiry: {
      short: "Lease",
      title: "The job runs longer than the lease",
      body: "Month end: 8 000 payouts, and the job takes 45 seconds. The lease is 30. At 02:00:30 the key expires while pod-a is at payout 5 210, pod-b gets the lock and starts on the same 2 790 that pod-a is still sending.\n\nA dozen sellers are paid twice before the two pods drift apart. pod-a's release returns 0 at the end: the token check worked, but the damage was done before it.",
      fields: {
        "lease 30 s": "Picked for an 18-second job. Nobody updated it.",
        expired: "Redis removes the key on time. It cannot know the job is still running.",
        OK: "For Redis this is a free lock, given out correctly.",
        "2 790": "The rows pod-a had not marked yet, now in two hands.",
        "not its token": "The safe release did its job, too late to matter.",
      },
    },
    renew: {
      short: "Renew",
      title: "Renew the lease while the job runs",
      body: "A watchdog thread in the job extends the lease every 10 seconds, with the same token check: `PEXPIRE` only if the key is still ours. If the script returns 0, the lock is gone and the job stops at once instead of finishing the batch.\n\nThe lease stays short, so a crashed holder still frees the lock in at most 30 seconds, but a long job keeps it as long as it is alive.",
      watch: "Renew at a third of the lease, so one missed renewal is not yet a lost lock.",
      fields: {
        PEXPIRE: "Set a new lease, in milliseconds.",
        ARGV: "Token first, then the new lease length.",
        "every 10 s": "A third of the 30-second lease.",
        "stops at once": "Losing the lock means losing the right to continue.",
      },
    },
    pause: {
      short: "Pause",
      title: "The holder freezes past its lease and wakes up",
      body: "At 02:00:05 pod-a claims payout `po_5501`, and the runtime stops the whole process for a full garbage collection. The watchdog is frozen too. The lease expires, pod-b takes the lock and pays `po_5501`.\n\nAfter 41 seconds pod-a resumes in the middle of its loop, with no idea any time has passed, and sends the transfer again. A VM migration, swapping or a clock that jumps forward on Redis does the same: a lease is a promise about time, and the holder cannot see time stop.",
      check: {
        q: "pod-a checks `GET lock` right before every transfer. Is it safe now?",
        options: [
          "Yes, it always knows whether it holds the lock",
          "No: the pause can come between the check and the transfer",
          "Only if the check runs inside a Lua script",
        ],
        answer: 1,
        why: "Any check by the holder is a read of the past. The process can freeze right after a successful check, for as long as the lease or longer, and then act on stale knowledge. Only the place that receives the write can tell an old holder from a new one.",
      },
      fields: {
        "GC pause": "The whole process stops. No thread runs, including the renewer.",
        "lease expired": "Correct from Redis's point of view: no renewal came.",
        "41.2 s": "Longer than the lease. Rare, but it happens.",
        "paid again": "The old holder acts on a lock it no longer has.",
      },
    },
    fencing: {
      short: "Fencing",
      title: "Fencing tokens: the database rejects the old holder",
      body: "The lock script now also runs `INCR` on a counter and returns the number with the lock: pod-a got 33, pod-b later got 34. Every claim in the payouts table carries the number, and the database accepts it only if no higher number has written that row.\n\npod-a wakes up with 33, its next claim matches 0 rows, and it aborts the run. Only the one transfer that was already past its claim slipped through.",
      watch: "The check must happen where the write happens. A token that nobody checks is a comment.",
      fields: {
        fence: "The fencing token, stored on the row it protects.",
        "fence <= 33": "Accept only if no newer holder has touched this row.",
        "34": "pod-b's token. Higher means newer.",
        "UPDATE 0": "Rejected: the database itself refuses the stale holder.",
        abort: "The job treats 0 rows as \"you lost the lock\" and stops.",
      },
    },
    bank: {
      short: "Bank",
      title: "The bank cannot check fences: use an idempotency key",
      body: "The bank knows nothing about fencing tokens. So every transfer carries `Idempotency-Key: <payout id>`. When pod-a resends `po_5501`, the bank returns the transfer it already made instead of making a second one.\n\nNow the lock is an optimisation: it keeps the work on one pod. Correctness comes from the fence in the database and the key at the bank, and they hold even when the lock fails.",
      fields: {
        "Idempotency-Key": "One payout, one key, on every attempt from any pod.",
        amount_minor: "12 500.00 in minor units, the same on the repeat.",
        status: "The original transfer's outcome.",
        replayed: "Not a new transfer: the answer to the first one.",
      },
    },
    redlock: {
      short: "Redlock",
      title: "A Redis failover hands out the same lock twice",
      body: "Redis replicates asynchronously. pod-a gets `OK` from the primary, the primary crashes 2 ms later, the replica that never saw the key is promoted, and pod-b gets `OK` too. Two holders at once.\n\n**Redlock** answers with 5 independent Redis nodes and a lock only when a majority grants it within the lease. That survives one node failing, but it still gives no fencing token and still assumes bounded pauses and clock drift, so the critique of it stands. Here the fence and the idempotency key turn this into one wasted run, not money.",
      check: {
        q: "When is a single Redis lock good enough?",
        options: [
          "Never",
          "When a rare double run only wastes work, and correctness is guarded elsewhere by a fence, a unique key or an idempotency key",
          "Only when it is Redlock",
        ],
        answer: 1,
        why: "A lock for efficiency (do not do the same work twice) can be wrong now and then. A lock for correctness must never be wrong, and no lease-based lock can promise that alone. Then you need fences checked by the storage, or a consensus store that issues them.",
      },
      fields: {
        async: "The primary answers before the replica has the key.",
        promoted: "The new primary has no memory of the lock.",
        "two holders": "Exactly what the lock was meant to prevent.",
        Redlock: "Majority of independent nodes, still lease-based.",
        "fencing token": "What Redlock does not give you, and what correctness needs.",
      },
    },
    dblock: {
      short: "DB lock",
      title: "Lock in the database that holds the data",
      body: "The payouts live in one Postgres anyway, so the job takes its lock there. `pg_try_advisory_xact_lock` decides who runs at all, and `FOR UPDATE SKIP LOCKED` locks each row being paid, so two pods can even share the work without overlap. The locks end with the transaction or when the connection dies.\n\nA paused holder keeps its session and its lock, so nobody else takes over; if its connection is cut, its transaction is gone too and none of its writes can land. For a long-running singleton, such as a scheduler, use leader election on a consensus store (etcd, ZooKeeper) and its revision numbers as fences.",
      watch: "Add a lock service only when the data does not already live in a system that can lock it.",
      fields: {
        pg_try_advisory_xact_lock: "Try once, do not wait. Held until COMMIT or ROLLBACK.",
        false: "Another pod runs the job today. This one exits.",
        "SKIP LOCKED": "Row locks: each payout is in exactly one pod's hands.",
        COMMIT: "The lock and the writes end together, in one transaction.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Six rules for distributed locks.\n\n1) A mutex protects one process; across pods the lock must live in a shared place. 2) Lock with one atomic `SET key token NX PX`, and release or renew only with a token check in a script. 3) Renew the lease while working, and stop at once when renewal fails. 4) Any lease can be outlived by a pause or a clock jump, so the storage must check a fencing token on every write. 5) Where fences cannot be checked, such as an external API, use idempotency keys. 6) Prefer a lock in the database that holds the data, or leader election on a consensus store; treat a Redis lock, Redlock included, as an efficiency tool.",
    },
  },
  scenarios: {
    "pause-past-lease": {
      label: "Holder pauses",
      steps: {
        "p-freeze": {
          short: "Freeze",
          title: "With fences in place, pod-a freezes past its lease",
          body: "At 03:10 pod-a holds the lock with fence 51 and renews every 10 seconds. Twelve seconds in, the process stops dead. Its 03:10:20 renewal never runs, the lease expires at 03:10:42, and pod-b gets the lock with fence 52 and starts the same batch.\n\nThis is the same failure as before. What is different is what the database and the bank now check.",
          check: {
            q: "pod-a wakes at 03:10:58 holding fence 51. What happens to its next claim and its next transfer?",
            options: [
              "Both go through, as before",
              "The claim is rejected (51 < 52), and a repeated transfer returns the earlier one because the key is the same",
              "Redis blocks both, since the lock is gone",
            ],
            answer: 1,
            why: "Redis is not in the path of the write, so it cannot block anything. The database compares fences on the row and refuses 51 where 52 has written. The bank sees the same idempotency key and replays the first answer.",
          },
          fields: {
            "fence 51": "pod-a's token for this lock.",
            "renew missed": "A frozen process renews nothing.",
            "lease expired": "Redis does its job: the lock is free.",
            "fence 52": "The new holder, with a higher number.",
          },
        },
        "p-wake": {
          short: "Rejected",
          title: "pod-a wakes up and is turned away",
          body: "pod-a resumes in the middle of its loop and tries to claim the next payout with fence 51. The row already carries 52, so the update matches nothing and pod-a stops the run.\n\nNothing is paid twice and nothing stale is written. The pause cost 46 seconds of one pod's time and no money.",
          fields: {
            fence: "51 against 52 on the row: the newer holder wins.",
            "UPDATE 0": "The database refuses the stale holder.",
            stop: "Losing a fence check means losing the lock: stop, do not retry.",
          },
        },
      },
    },
  },
};

export default text;
