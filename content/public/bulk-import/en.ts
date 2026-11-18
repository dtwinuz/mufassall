import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Bulk import",
  summary:
    "A wholesale company uploads its product catalog as a CSV: 200 000 rows. Parsing it inside the request times out, eats memory and throws everything away for one bad row. The file goes to object storage instead, an import job streams it, validates every row and reports errors, survives restarts and repeated uploads, writes in short batches, shows progress and stays within per-tenant limits.",
  learn: [
    "Why a big file goes straight to object storage with a pre-signed URL and is read by a worker, not by the web server",
    "Per-row validation with row numbers and a downloadable error report: partial success is the normal result",
    "File-hash dedup, checkpoints every N rows, and batched upserts that keep locks on the main table short",
    "Progress the UI can poll, and limits per tenant on file size, rows and running jobs",
  ],
  nodes: {
    client: "Browser",
    api: "App API",
    db: "Catalog DB",
    storage: "Object storage",
    queue: "Job queue",
    worker: "Import worker",
  },
  metrics: {
    duration: "Import time",
    imported: "Rows imported",
    memory: "API memory",
    lockwait: "Checkout lock wait",
  },
  steps: {
    inline: {
      short: "Inline",
      title: "The web server parses the upload in the request",
      body: "An accountant uploads the product catalog from the old system as a CSV. The App API receives the whole file in the request, parses it and inserts every row into the catalog before it answers.\n\nWith 2 000 rows this takes 3 seconds and works fine. The same code is about to meet a file a hundred times bigger.",
      fields: {
        Cookie: "The user's session. Hidden here.",
        "Content-Type": "`multipart/form-data`, the browser's form upload: the file travels through the web server.",
        "Content-Length": "412 KB. The web server keeps all of it while the request runs.",
        imported: "Every row in one go, all or nothing.",
      },
    },
    bigfile: {
      short: "Big file",
      title: "200 000 rows: timeout, memory, one bad row",
      body: "Now the file is 41.9 MB, 200 000 rows. The API reads it all into memory, 1.9 GB on one request. After 60 s the proxy in front gives up with `504`, while the server keeps working. At row 117 403 a price is `12,5O`, with the letter O instead of a zero, and the whole transaction rolls back.\n\nThe user sees an error, has no idea that 117 402 rows were fine, and uploads the same file again. Two of those at once and the server runs out of memory.",
      watch: "In a big file, a bad row is a certainty, not a risk.",
      check: {
        q: "Where should a 42 MB file go, and who should read it?",
        options: [
          "Raise the proxy timeout to 10 minutes",
          "Straight from the browser to object storage; a background worker reads it from there",
          "Split it in the browser and send 200 requests to the API",
        ],
        answer: 1,
        why: "The web server should not carry the bytes at all. The API hands out a short-lived upload URL, the browser puts the file directly into object storage, and an import job reads it later at its own pace, with no request waiting on it.",
      },
      fields: {
        "in memory": "The whole file and all parsed rows live in the API process at once.",
        "504": "The proxy stopped waiting. The import may still be running behind it.",
        "not a number": "One typo in one cell.",
        ROLLBACK: "All or nothing turns one bad cell into zero imported rows.",
        again: "A second copy of the same heavy request.",
      },
    },
    presign: {
      short: "Pre-signed",
      title: "Upload straight to object storage",
      body: "The browser first asks the API for an upload URL. The API signs one for a single object, valid 15 minutes, and the browser sends the file directly to object storage. The API never sees the bytes; its memory goes back to 180 MB.\n\nThe browser also computes the file's SHA-256 while reading it, and storage checks it on arrival. A broken upload is caught here, not at row 150 000.",
      watch: "A pre-signed URL is a key to exactly one object for a few minutes. Never sign a whole bucket or a long expiry.",
      fields: {
        expires: "900 s. After that the URL is useless, even if it leaks.",
        sig: "The signature over the path, method and expiry. Hidden here.",
        "Content-Length": "41.9 MB go to storage, not to the API.",
        "x-content-sha256": "The file's hash. Storage rejects the upload if the bytes do not match.",
        ETag: "Storage confirms what it saved.",
      },
    },
    job: {
      short: "Job",
      title: "An import job and a worker that streams the file",
      body: "The browser tells the API: import this file. The API creates a job record, puts it on a queue and answers `202` with the job's address. An import worker takes the job and reads the file from storage as a stream, a few rows at a time, so its memory stays at 60 MB whether the file has 2 000 rows or 2 million.\n\nNo request waits any more. One problem is left from before: row 117 403 still fails the whole file.",
      fields: {
        file_key: "Where the file is in storage. Only the key goes through the API, not the file.",
        sha256: "The file's hash, saved with the job.",
        "202 Accepted": "Accepted for processing, not done. The work happens later.",
        Location: "Where to ask about this job from now on.",
        status: "`queued`, then `running`, then `completed` or `completed_with_errors`.",
      },
    },
    validate: {
      short: "Validate",
      title: "Validate each row, collect errors, keep the good rows",
      body: "The worker checks each row on its own: required fields, numbers, units, duplicates inside the file. A good row is written; a bad one goes into an error report with its row number, column and reason, and the import goes on.\n\n199 600 rows are imported and 400 are rejected. The report goes to storage next to the file, so the accountant can fix exactly those 400 rows and upload them again.",
      watch: "Partial success is the normal result of a real import. Design the UI and the job status for it.",
      fields: {
        row: "The line number in the user's file, so they can find it in their spreadsheet.",
        column: "Which cell is wrong.",
        required: "An empty SKU: the row cannot be matched to any product.",
        duplicate_in_file: "The same SKU twice in one file. The first wins, the second is reported.",
        completed_with_errors: "Done, with a report to read. Neither success nor failure.",
      },
    },
    restart: {
      short: "Restart",
      title: "A restart starts over; a second upload starts another job",
      body: "A deploy restarts the worker at row 122 000. The queue gives the job back, and the worker starts again at row 1. Every row it already wrote now hits the unique key, and the user sees thousands of false errors.\n\nMeanwhile the user, seeing no progress, uploads the same file again. A second job imports the same file in parallel, and the catalog database runs at 85 %.",
      check: {
        q: "How do you make a restart and a second upload of the same file harmless?",
        options: [
          "Ask users not to click twice and avoid deploys during imports",
          "Delete what the first attempt wrote and start over",
          "Find the job by the file's hash, and save the last finished row every 1 000 rows so a restart continues from there",
        ],
        answer: 2,
        why: "Restarts and double clicks will happen. The file hash turns the second upload into the same job. A checkpoint saved with each batch tells a restarted worker where to continue, and a lease makes sure only one worker owns the job.",
      },
      fields: {
        restarted: "A normal deploy, at a bad moment for the import.",
        "row 1": "The job remembered nothing: 122 000 rows of work again.",
        "already exists": "The rows from the first run collide with the unique key.",
        imp_78: "The same file, a second job.",
        parallel: "Twice the load on the catalog, for no new data.",
      },
    },
    checkpoint: {
      short: "Checkpoint",
      title: "File hash for dedup, checkpoint every 1 000 rows",
      body: "Every 1 000 rows the worker saves its position in the job record: last finished row and counters. After a restart it skips to row 123 001. A lease names the worker that owns the job, so a second worker cannot pick it up at the same time.\n\nBefore creating a job, the API looks for one with the same tenant and file hash. The second upload gets the existing job back instead of a new one.",
      fields: {
        last_row: "The last row whose batch is committed. A restart resumes after it.",
        lease_owner: "Only the worker holding the lease may update the job. A stale worker's update changes nothing.",
        resumes: "Lost work after a restart is at most 1 000 rows.",
        sha256: "The same file from the same tenant means the same job.",
      },
    },
    lock: {
      short: "Locks",
      title: "One giant write locks the catalog",
      body: "Writing row by row takes 200 000 round trips, about 7 minutes. To speed it up, the next version loads the file into a staging table and updates the catalog with one statement in one transaction.\n\nThat statement locks 150 000 product rows until it commits, 3 minutes later. Checkout, which decrements stock on the same rows, waits for the lock: 177 s, and the order times out. The import is fast; the shop is down.",
      watch: "A transaction holds its row locks until the very end. Size it by how long others can wait, not by how fast it is.",
      check: {
        q: "How should the worker write 200 000 rows without locking the catalog for minutes?",
        options: [
          "Batches of about 1 000 rows, each one upsert by tenant and SKU in its own short transaction",
          "The same single transaction, but at night",
          "Row by row with autocommit",
        ],
        answer: 0,
        why: "A batch of 1 000 rows is one statement and one round trip, and its locks are held for milliseconds. 200 batches give the speed of bulk writes without one long transaction; checkout slips in between them.",
      },
      fields: {
        staging: "A temporary table holding the whole file.",
        "one transaction": "Every changed row stays locked until the end.",
        "waiting for lock": "A buyer's order stands still behind the import.",
        "lock wait": "177 s. The order request gave up long before.",
        COMMIT: "Only now are the locks released.",
      },
    },
    batch: {
      short: "Batches",
      title: "Batched upserts with a natural key",
      body: "The worker writes 1 000 rows per statement: insert new products and update existing ones, matched by tenant and SKU. A row whose name and price did not change is skipped, so it is not even locked. Each batch commits together with its checkpoint.\n\nThe import takes 95 s instead of 7 minutes, each batch holds its locks for 38 ms, and checkout no longer waits.",
      fields: {
        tenant_id: "Every row belongs to one company. Part of every key and every query.",
        "ON CONFLICT": "Upsert: an existing SKU is updated, a new one inserted. Re-running a batch is harmless.",
        EXCLUDED: "The values from the incoming row.",
        "IS DISTINCT FROM": "Unchanged rows are not rewritten: less locking and fewer change events.",
        "38 ms": "How long this batch holds its locks.",
      },
    },
    progress: {
      short: "Progress",
      title: "Progress the UI can poll",
      body: "The page polls the job every 2 seconds and shows a bar: rows done, errors so far, time left. The API reads the job record the worker keeps up to date with each checkpoint. Server-Sent Events can push the same numbers, but polling a cheap endpoint is often enough.\n\nThe user can close the tab and come back: the job keeps running and the page picks up where it is.",
      fields: {
        status: "`running` now. The page stops polling at `completed` or `completed_with_errors`.",
        total_rows: "Counted in a quick first pass, so the bar has an end.",
        processed: "Up to the last checkpoint. It moves in steps of 1 000.",
        failed: "Errors so far. The user sees them growing, not only at the end.",
        eta_seconds: "Rows left divided by the recent rate.",
        errors_url: "Downloads the error report through a short-lived signed link.",
      },
    },
    limits: {
      short: "Limits",
      title: "Limits per tenant",
      body: "One tenant starts six imports of 2 GB files at once, and everyone else's jobs wait behind them. So each tenant gets limits: files up to 100 MB, up to 500 000 rows, 2 running imports. The upload URL is signed for the declared size, and the queue takes jobs fairly, tenant by tenant.\n\nA third import gets `429` with a clear reason and a retry time. The workers stay busy at 60 % and no tenant can stall the others.",
      fields: {
        "Retry-After": "Try again in 2 minutes, when a running import has likely finished.",
        error: "A machine-readable reason the UI can turn into a clear message.",
        limit_running: "Running imports allowed per tenant.",
        max_file_mb: "Checked when the upload URL is signed, before any bytes move.",
        max_rows: "Checked while streaming: the job stops at the limit with a clear status.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Six rules of bulk import.\n\n1) Never parse a big file in the web request: upload it to object storage with a short-lived pre-signed URL and let a worker stream it. 2) Validate each row, keep the good ones and give the user an error report with row numbers. 3) Deduplicate uploads by file hash, and save a checkpoint with each batch so a restart resumes. 4) Write in batches of about 1 000 rows with an upsert on a natural key, in short transactions. 5) Show progress from the job record. 6) Limit file size, rows and running jobs per tenant.",
    },
  },
};

export default text;
