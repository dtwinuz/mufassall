import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Design a job scheduler",
  summary:
    "\"Send the digest at 09:00\", \"remind me tomorrow\", \"sync every 5 minutes\": millions of delayed and recurring jobs for many tenants. We go from one cron box to a jobs table claimed with `SKIP LOCKED`, leases with heartbeats, idempotent at-least-once runs, retries with backoff and a dead-letter table, then survive the 09:00 spike with time partitions and per-tenant fairness.",
  learn: [
    "Why a single cron box both misses jobs and runs them twice after failover",
    "How workers claim due rows safely with `FOR UPDATE SKIP LOCKED`",
    "Leases and heartbeats: why they give at-least-once, and why that needs idempotency keys",
    "Backoff with jitter, a dead-letter table, time partitions and fairness between tenants",
  ],
  nodes: {
    app: "Tenant app",
    cron: "Cron box A",
    cron2: "Cron box B",
    mail: "Email provider",
    api: "Scheduler API",
    db: "Jobs table",
    w1: "Worker 1",
    w2: "Worker 2",
    dlq: "Dead jobs",
    app2: "Big tenant",
  },
  metrics: {
    lag: "Start lag p99",
    missed: "Jobs not run",
    dupes: "Jobs run twice",
  },
  steps: {
    cron: {
      short: "Cron box",
      title: "One machine, one crontab",
      body: "Tenants schedule work through the app: a daily digest at 09:00, a rate sync every five minutes, a one-off reminder for tomorrow. The first version writes each one as a line in the crontab of a single server, and cron starts the command on time.\n\nIt is simple and it works on day one. But the whole schedule lives on one disk, in one process, on one machine.",
      check: {
        q: "At 08:12 the cron box drops off the network. What happens to the jobs due at 08:15 to 08:50?",
        options: [
          "Cron runs them late, once the box is back",
          "They never run, and nobody notices until customers complain",
          "Another server picks them up automatically",
        ],
        answer: 1,
        why: "Cron fires at the minute or not at all: it keeps no record of what was due. A box that is down misses everything scheduled in that window, silently.",
      },
      fields: {
        "0 9 * * *": "Minute 0, hour 9, every day. In the server's local time zone, whatever that is.",
        "*/5": "Every five minutes. If a run takes six, two copies overlap.",
        "--once": "A one-off job faked as a yearly line. Someone has to delete it after it runs.",
      },
    },
    failover: {
      short: "Failover",
      title: "The box dies, then comes back twice",
      body: "At 08:12 cron-a loses its network. Jobs due until 08:50 simply never run: about 4 200 a day on bad days. An engineer promotes cron-b with a copy of the crontab.\n\nAt 08:55 cron-a's network returns. Now two machines have the same crontab and both fire at 09:00: every customer of tenant `t_17` gets the digest twice. A standby box does not remove the single point of failure; it adds a second source of truth.",
      watch: "Failover without fencing turns \"nothing runs\" into \"everything runs twice\".",
      check: {
        q: "What removes both the missed runs and the double runs?",
        options: [
          "A third cron box and a vote",
          "Store jobs as rows with a due time; stateless workers take due rows from that table",
          "Run cron in a container that restarts automatically",
        ],
        answer: 1,
        why: "Once the schedule is data in one place, any worker can run any job, a dead worker is just less capacity, and \"who runs this job\" becomes a question the database answers.",
      },
      fields: {
        "never ran": "Cron keeps no backlog. Due work in the outage window is lost.",
        promoted: "A manual failover: the old box was not fenced off.",
        "came back": "A network blip, not a dead machine. It still had its crontab.",
        "cron-b": "Same line, same minute, second copy of every email.",
      },
    },
    table: {
      short: "Jobs table",
      title: "The schedule becomes rows with a due time",
      body: "The API now inserts each job as a row: what to run, for which tenant, and `run_at`, stored in UTC. A partial index on `run_at` over queued rows makes \"what is due now\" cheap. Recurring jobs insert their next row when one finishes.\n\nAny number of stateless workers poll the table. A dead worker no longer loses the schedule: missed runs drop to zero. But two workers polling at the same moment read the same due rows and both run them: 900 duplicates a day.",
      watch: "Store `run_at` in UTC and keep the tenant's time zone next to it. \"09:00 every day\" must survive daylight-saving changes.",
      fields: {
        run_at: "When the job is due, in UTC. 04:00Z is 09:00 in UTC+5.",
        status: "`queued`, `running`, `done`, `dead`. Workers only read `queued`.",
        attempt: "How many times it has been tried. Drives the backoff later.",
        max_attempts: "After this many failures the job leaves the table for the dead-letter table.",
      },
    },
    claim: {
      short: "SKIP LOCKED",
      title: "Claim rows with `FOR UPDATE SKIP LOCKED`",
      body: "Each worker claims a batch in one statement. It selects up to 50 due rows ordered by `run_at` and locks them `FOR UPDATE`. `SKIP LOCKED` makes a second worker step over rows already locked instead of waiting for them, so it takes the next 50.\n\nThe same statement marks the rows `running` and records which worker owns them. Two workers can never claim the same row, and nobody blocks: duplicates drop to zero, start lag to about a second.",
      watch: "Without `SKIP LOCKED` the second worker waits on the first one's locks; with plain `SELECT` it runs the same jobs.",
      check: {
        q: "Worker 2 claims 50 jobs, marks them running, and is killed by the OOM killer. What happens to those 50 jobs?",
        options: [
          "The database releases them when the connection drops",
          "They stay `running` forever: nobody will ever finish them",
          "Worker 1 picks them up on its next poll",
        ],
        answer: 1,
        why: "The row locks ended with the transaction, long ago. What remains is the status `running` and the name `w-2`, and the claim query only looks for `queued` rows.",
      },
      fields: {
        run_at: "Only rows due now, oldest first.",
        LIMIT: "Batch size: fewer round trips, but a crash affects more jobs.",
        "FOR UPDATE": "Locks the chosen rows until the statement commits.",
        "SKIP LOCKED": "Rows another worker holds are skipped, not waited for.",
        RETURNING: "The worker gets its jobs back from the same atomic statement.",
      },
    },
    dies: {
      short: "Worker dies",
      title: "A dead worker strands its jobs",
      body: "Worker 2 is killed at 09:00:05 with 50 jobs claimed. Their rows say `running`, owned by `w-2`, and nothing will ever change that. 47 minutes later they are still there.\n\nA `running` status is a promise from a process that may no longer exist. The scheduler has no way to tell a slow job from a dead worker.",
      fields: {
        locked_by: "The owner. Here, a worker that no longer exists.",
        running: "Claimed, never finished. The claim query skips these.",
        "w-2": "The killed worker. All 50 of its jobs are stuck.",
        "wait forever": "No timeout means no recovery.",
      },
    },
    lease: {
      short: "Lease",
      title: "A lease that expires unless renewed",
      body: "A claim now gives a **lease**: `lease_until` 30 seconds ahead. While the job runs, the worker renews it every 10 seconds (a heartbeat). The claim query also takes `running` rows whose lease has expired, so a dead worker's jobs come back within 30 seconds. Missed runs drop to zero.\n\nAll times come from the database's `now()`, never from worker clocks, which drift by seconds. The cost: a worker frozen in a long GC pause loses its lease, another worker runs the job, and then the first one wakes up and finishes too. Delivery is now **at least once**: about 40 duplicates a day.",
      watch: "A heartbeat that returns `UPDATE 0` means the lease is lost. The worker must stop, not carry on.",
      check: {
        q: "A job may now run twice. How do we keep the customer from getting two emails?",
        options: [
          "Make the lease 10 minutes long",
          "Give every run a key and have the email provider ignore a key it has already seen",
          "Check the job status before sending",
        ],
        answer: 1,
        why: "A longer lease only delays recovery. A status check races: both workers can see `running` and send. An idempotency key makes the second send harmless wherever it comes from.",
      },
      fields: {
        lease_until: "The owner's right to run the job ends here unless renewed.",
        "now()": "Database time. One clock for every worker, no skew between machines.",
        locked_by: "Only the current owner can renew; a stale worker matches zero rows.",
        "UPDATE 0": "The lease was taken over. Stop the work and do not commit side effects.",
      },
    },
    idempotent: {
      short: "Idempotency",
      title: "Every run carries an idempotency key",
      body: "The worker sends each email with a key built from the job id and the scheduled time: `j_8812:2026-11-19T04:00Z`. Two runs of the same occurrence send the same key; tomorrow's digest has a different one.\n\nThe provider remembers keys for a day. The second send returns the first result with `replayed: true` and no second email. Duplicates drop to zero. For side effects in our own database, the same key goes into a unique column.",
      watch: "Do not build the key from the attempt number or the current time: every retry would look new.",
      fields: {
        "Idempotency-Key": "Job id plus scheduled time: the same for every attempt of this run.",
        message_id: "The email that was sent the first time.",
        replayed: "This answer is the stored result of an earlier request. Nothing was sent again.",
      },
    },
    storm: {
      short: "Retry storm",
      title: "The provider fails, workers hammer it",
      body: "At 09:00 the email provider starts answering `503` for ten minutes. Workers retry each job three times within 200 ms, all of them at once, and then mark it failed. The provider, already struggling, gets three times the traffic.\n\nWhen it recovers, 6 000 digests are marked failed and nobody will send them. The provider even said when to come back, in `Retry-After`, and we ignored it.",
      check: {
        q: "How should a worker retry a job after a temporary failure?",
        options: [
          "Retry immediately in a loop until it works",
          "Put the job back with `run_at` pushed out exponentially, with jitter, and park it in a dead-letter table after the last attempt",
          "Drop the job: the tenant can reschedule",
        ],
        answer: 1,
        why: "Rescheduling uses the scheduler itself: the job goes back with a later `run_at`, the worker is free, and growing delays give the provider room. Jitter spreads thousands of retries apart, and the dead-letter table keeps what could not be sent.",
      },
      fields: {
        "503": "Temporary failure: worth retrying, later.",
        "Retry-After": "The provider's own hint: two minutes.",
        "at once": "Thousands of workers retrying in the same 200 ms make the outage worse.",
        failed: "Three tries in 200 ms cannot outlast a ten-minute outage.",
      },
    },
    backoff: {
      short: "Backoff + DLQ",
      title: "Exponential backoff, jitter and a dead-letter table",
      body: "A failed job goes back to `queued` with `run_at` pushed out: 30 s, 1 min, 2 min, doubling up to 32 min, each delay shifted randomly by up to 20%. It is the scheduler scheduling its own retries; the worker is free at once. Eight attempts cover about an hour.\n\nPermanent errors, like a mailbox that does not exist, stop early. A job that runs out of attempts moves to a **dead-letter table** with its last error, and the tenant's dashboard can replay it. Through the same ten-minute outage, nothing is lost.",
      watch: "A dead-letter table nobody looks at is a slower way to lose jobs. Alert on its growth.",
      fields: {
        "8/8": "The last allowed attempt.",
        "550": "A permanent error: retrying would never help.",
        dead_jobs: "The dead-letter table: the job, its payload and every error, kept for replay.",
        jitter: "Random spread so that retries from one outage do not all land in the same second.",
        replay: "Sends the job back to `queued` after someone fixed the cause.",
      },
    },
    peak: {
      short: "09:00 spike",
      title: "Everyone wants 09:00 sharp",
      body: "Most people pick round times, and one big tenant `t_9` scheduled 1.5 million reminders for 09:00. Claims always take the oldest due rows first, so small tenants wait behind all of them: a digest due at 09:00 starts at 09:15.\n\nThe table also suffers: millions of rows inserted, updated and deleted every day leave 41 million dead tuples, and the `run_at` index is so bloated that every claim gets slower.",
      check: {
        q: "What lets a tenant with 88 jobs start on time next to one with 1.5 million?",
        options: [
          "Claim a few due jobs per active tenant in each batch, instead of the oldest rows overall",
          "Give big tenants their own database",
          "Ask tenants to avoid round times",
        ],
        answer: 0,
        why: "Fairness is a property of the claim query. Taking a small slice per tenant means the big tenant still gets most of the capacity, but never all of it.",
      },
      fields: {
        due: "Jobs ready to run right now, per tenant.",
        late: "How long the oldest due job has waited. 15 minutes for everyone.",
        t_9: "One tenant holds 99.9% of the queue.",
        "dead tuples": "Old row versions. Vacuum cannot keep up and the index bloats.",
      },
    },
    fair: {
      short: "Fairness",
      title: "Hourly partitions and a slice per tenant",
      body: "The jobs table is partitioned by `run_at` hour. Claims only touch the current partition, which stays small and hot. Old partitions are dropped whole three days later: no `DELETE`, no bloat, no vacuum fight.\n\nThe claim takes at most five due jobs per active tenant. `t_9` still uses most of the workers, but `t_17` and `t_3` get their slice in every batch. Start lag falls from 15 minutes to 3 seconds. Very large fleets go one step further and load the next minutes into an in-memory time wheel, but the rule is the same.",
      watch: "Per-tenant caps need a per-tenant view of due work. Keep a small table of tenants with due jobs, or the outer loop scans everyone.",
      fields: {
        LATERAL: "For each active tenant, run the inner query: up to five jobs each.",
        jobs_2026_11_19_09: "The 09:00 hour partition. Small, recent, and the only one claims touch.",
        "LIMIT 5": "Each tenant's slice per batch. Big tenants get many batches, never all of one.",
        "DROP TABLE": "Retention by dropping a whole hour: instant, and leaves no dead rows behind.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "A scheduler is a database of due times plus workers that cannot be trusted to stay alive.\n\n1) One cron box misses jobs while down and runs them twice after failover. 2) Store jobs as rows with `run_at` in UTC; workers claim with `FOR UPDATE SKIP LOCKED`. 3) Claims are leases renewed by heartbeat, on the database clock; expiry brings stranded jobs back. 4) That makes runs at least once, so every side effect carries an idempotency key. 5) Retry by rescheduling with exponential backoff and jitter; park the rest in a dead-letter table and alert on it. 6) Partition by time, drop old partitions, and claim a slice per tenant so 09:00 is fair.",
    },
  },
};

export default text;
