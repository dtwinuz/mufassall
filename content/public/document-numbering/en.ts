import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Gapless document numbering",
  summary:
    "In many countries issued invoices must carry continuous numbers: per series and per year, no number skipped and none used twice, and an auditor checks the register. A database sequence leaves gaps, MAX()+1 gives duplicates. A counter row taken in the finalize transaction gives both guarantees, at the price of making writers wait in line, so the lesson also measures that price and keeps it small.",
  learn: [
    "Why database sequences leave gaps by design, and why MAX()+1 hands the same number to two documents",
    "A counter row per series and year, taken with UPDATE ... RETURNING in the same transaction as the document, and what its row lock costs in throughput",
    "Take the number at finalize, not at draft; keep the locked part of the transaction short",
    "Cancel instead of delete, a series per branch, and a year rollover in the company's legal time zone",
  ],
  nodes: {
    clerk: "Accountant",
    clerk2: "Second accountant",
    branch: "Branch office",
    api: "Invoice service",
    db: "Invoices DB",
    export: "Register export",
    auditor: "Tax auditor",
  },
  metrics: {
    gaps: "Missing numbers",
    dups: "Numbers used twice",
    tps: "Finalizes per series",
    wait: "p99 finalize wait",
  },
  steps: {
    issue: {
      short: "Number",
      title: "Every invoice gets the next number",
      body: "An accountant creates an invoice and the service gives it a number like `INV-2026-000481`: series, year, and a running number. The number comes from a database sequence the moment the draft is created.\n\nThe law the company works under says issued invoices in one series and year must be numbered continuously. Skipped numbers have to be explained in writing, a repeated number makes two documents claim the same identity.",
      fields: {
        number: "The legal identity of the document, printed on it and reported.",
        nextval: "A database sequence: fast, never blocks, never goes back.",
        draft: "The document is not issued yet, but it already holds a number.",
        "INV-2026-000481": "Series INV, year 2026, the 481st document of the year.",
      },
    },
    gaps: {
      short: "Gaps",
      title: "The register has holes",
      body: "At the end of the year the register is exported for the tax auditor. It skips 214 numbers.\n\nNone of them is a lost invoice. A sequence value taken by a transaction that later rolls back is gone. A deleted draft keeps its number to the grave. A sequence with `CACHE 20` hands each connection 20 numbers ahead, and a restart throws away the unused ones; even without a cache, a crash may skip up to 32 values. Each hole needs a written explanation.",
      watch: "A sequence is the right tool for ids. It is the wrong tool for a number the law requires to be continuous.",
      check: {
        q: "Why does `ROLLBACK` not give 000483 back to the sequence?",
        options: [
          "It is a bug in the database",
          "Sequences are outside transactions on purpose: otherwise every writer would wait for the previous one to commit",
          "The number is given back, but only after a restart",
        ],
        answer: 1,
        why: "If a rollback could return a number, the next writer could not take 000484 until it knew whether 000483 would commit. Sequences avoid that wait by never going back, so gaps are the price of their speed.",
      },
      fields: {
        "register 2026": "The yearly list of issued documents, in number order.",
        ROLLBACK: "The transaction is undone, the number it took is not.",
        "drafts deleted": "Numbers that belonged to documents that never existed.",
        "cached values": "Numbers handed out ahead to a connection and lost with it.",
        "214 missing": "Each one is a question from the auditor.",
      },
    },
    maxplus: {
      short: "MAX+1",
      title: "MAX()+1 gives the same number twice",
      body: "A developer replaces the sequence: the next number is the highest one plus one. A rollback no longer leaves a hole, so rollback and cache gaps disappear; deleted drafts still leave 60.\n\nBut two finalizes in the same millisecond both read 481 before either commits, and both write 482. Without a unique index the company now has two invoices with the same number, 40 times a year. With one, the second user simply gets an error.",
      fields: {
        "max(no) + 1": "A read, then a write: another transaction can read the same value in between.",
        "has not committed": "T2 cannot see T1's row yet, so it sees the same maximum.",
        "INV-2026-000482": "One number, two documents, two buyers.",
        "unique index": "Turns duplicates into failed requests, which is better but still wrong.",
      },
    },
    counter: {
      short: "Counter",
      title: "A counter row per series and year",
      body: "One row per series and year holds the last number used. The finalize transaction increments it with `UPDATE ... RETURNING` and uses the returned value.\n\nThe `UPDATE` locks the row until the transaction ends. A second writer waits, then reads the committed value, so no two documents get the same number. If the transaction rolls back, the increment is undone with it: the number is reused, not skipped.",
      check: {
        q: "A transaction took 482 from the counter and then rolled back. What does the next finalize get?",
        options: ["483", "482", "An error until someone resets the counter"],
        answer: 1,
        why: "The increment is part of the transaction, so the rollback undoes it: the counter is back at 481 and the next writer takes 482. That is the difference from a sequence.",
      },
      fields: {
        number_counters: "A tiny table: one row per series and year.",
        last_no: "The last number handed out in this series.",
        year: "Numbering starts again every year, so the year is part of the key.",
        "same transaction": "The number and the document commit or roll back together.",
        locked: "Other writers of this series wait here: that is the guarantee and the cost.",
      },
    },
    finalize: {
      short: "At finalize",
      title: "A number only when the document is issued",
      body: "Drafts no longer get a number: they have an internal id. The number is taken in the same transaction that changes the status from `draft` to `issued`.\n\nAccountants can create and delete as many drafts as they like, the register only ever sees issued documents. The last 60 gaps disappear.",
      fields: {
        finalize: "The single moment that turns a draft into a legal document.",
        RETURNING: "The new number, read back from the same statement.",
        issued: "From now on the document exists for the buyer and the auditor.",
        "status = 'draft'": "A second finalize of the same document changes nothing.",
        "no number": "A draft is only work in progress.",
      },
    },
    serial: {
      short: "One by one",
      title: "Everyone waits for one row",
      body: "At month end the load test runs 64 parallel finalizes on one series. With the sequence it did 900 per second. Now it does 80, and the slowest 1% wait 780 ms.\n\nThe reason is not CPU. The row stays locked from the counter `UPDATE` to `COMMIT`, and the counter is taken first: then 40 line rows, totals and a PDF hash are written while every other finalize of this series waits. One lock held for 12 ms allows at most 83 finalizes per second.",
      fields: {
        "one series": "The counter row is shared by every document of the series.",
        "taken first": "The lock starts early and lasts for everything that follows.",
        "lock held 12 ms": "The real limit: writers pass through one at a time.",
        "83 finalizes": "1 second divided by the lock time; more servers do not help.",
      },
    },
    short: {
      short: "Short lock",
      title: "Take the number last, do the heavy work outside",
      body: "Validation and totals move before `BEGIN`. Inside the transaction the lines are written first, the counter is taken last, right before `COMMIT`. The PDF, the signature and the e-mail come after the commit, from the issued document.\n\nThe lock now lasts 2.4 ms, one series does about 410 finalizes per second, and p99 waiting drops to 18 ms.",
      check: {
        q: "The PDF must show the number. Where should it be rendered?",
        options: [
          "Inside the transaction, before COMMIT, so the PDF and the number match",
          "After COMMIT, from the issued document; if rendering fails, retry rendering, the number stays",
          "Before taking the number, with a placeholder",
        ],
        answer: 1,
        why: "Rendering takes tens of milliseconds, and inside the transaction it would hold the lock for every other writer. After the commit the number is final, so a render can be retried any number of times without touching the counter.",
      },
      fields: {
        "before BEGIN": "Work that needs no lock is done before the transaction starts.",
        "the lock starts": "As late as possible.",
        COMMIT: "The lock ends with the transaction.",
        "after COMMIT": "Slow work outside the lock: it cannot slow other writers.",
      },
    },
    delete: {
      short: "Delete",
      title: "An issued invoice is deleted",
      body: "Invoice 000517 went to the wrong buyer. An accountant deletes it and issues a new one.\n\nThe register now jumps from 000516 to 000518. The auditor asks where 000517 is, and the buyer still has a copy of a document the seller says never existed.",
      fields: {
        DELETE: "Removes the document and the explanation together.",
        "wrong buyer": "A real reason, but it now lives only in someone's memory.",
        "where is 000517": "A gap the counter cannot prevent: it was made after issuing.",
        "no longer has": "Two sides, two different histories of the same number.",
      },
    },
    cancel: {
      short: "Cancel",
      title: "Cancel, never delete",
      body: "An issued document is cancelled: status `cancelled`, the time, the reason and a link to the document that replaces it. The application's database role has no `DELETE` on issued invoices at all.\n\nThe number 000517 stays in the register, marked cancelled. The auditor sees what happened and why, and the replacement has its own new number.",
      fields: {
        cancelled: "The document still exists, it just no longer counts.",
        cancel_reason: "The explanation is stored with the number.",
        replaced_by: "A link to the corrected document.",
        "no DELETE": "The database itself refuses to remove issued numbers.",
        register: "Every number appears once: issued or cancelled.",
      },
    },
    series: {
      short: "Branches",
      title: "A series per branch",
      body: "The company opens a branch office. Both offices issue invoices, and with one series they would wait for the same counter row.\n\nEach branch gets its own prefix and its own counter row: `HQ-2026-000517` and `BR2-2026-000045`. They never wait for each other, and the total rises to about 780 finalizes per second. Before doing this, check that the rules allow a separate series per branch.",
      fields: {
        series: "The counter key: one series, one sequence of numbers.",
        BR2: "The branch prefix, part of the printed number.",
        "one counter row": "Each branch has its own lock.",
        "never wait": "Contention is per series, not per company.",
        "rules allow": "Some rules require one continuous series per company.",
      },
    },
    rollover: {
      short: "New year",
      title: "Numbering starts again on 1 January",
      body: "Every series starts at 000001 in a new year. The rows for 2027 are created on 1 December, so that midnight on 1 January does not start with a race to insert them.\n\nThe year is taken from the issue time in the company's legal time zone, not from the server clock in UTC. An invoice issued at 00:10 on 1 January local time is still 31 December in UTC, and it belongs to 2027.",
      watch: "Store the issue time in UTC, but derive the year and the series in the one time zone the rules name.",
      fields: {
        year: "Part of the counter key: a new year is a new row.",
        "ON CONFLICT": "Running the job twice changes nothing.",
        "1 December": "Rows created in advance, outside the busiest moment.",
        "legal time zone": "The year the law sees, not the year the server sees.",
        "000001": "The first number of 2027.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Six rules for numbers the law requires to be continuous.\n\n1) Do not use a database sequence for them: it skips numbers by design. 2) Do not use MAX()+1: two writers read the same maximum. 3) Keep a counter row per series and year and take the number with `UPDATE ... RETURNING` in the same transaction as the document: a rollback reuses it. 4) Take the number at finalize, never at draft. 5) The row lock serializes writers: take the number last, keep heavy work outside, split by series where the rules allow. 6) Cancel instead of deleting, and roll the year over in the legal time zone with rows created in advance.",
    },
  },
  scenarios: {
    "same-ms": {
      label: "Same millisecond",
      steps: {
        "ms-wait": {
          short: "Two at once",
          title: "Two finalizes in the same millisecond",
          body: "Two accountants press \"Issue\" at 10:15:00.123, for the same series. T1's `UPDATE` takes the counter row and gets 482. T2's `UPDATE` reaches the same row and waits.\n\nT1 commits 2.1 ms later. T2 wakes up, re-reads the committed row and gets 483. Nobody sees an error, T2 just waited a little.",
          fields: {
            "row locked": "The first writer holds the row until its transaction ends.",
            "waits for T1": "The second writer is not refused, it queues.",
            "re-reads": "After the lock is released T2 sees the newest value.",
            "483": "The next number, never the same one.",
            "READ COMMITTED": "The default level: an UPDATE re-checks the newest row version.",
          },
        },
        "ms-rollback": {
          short: "Rollback",
          title: "The first one fails",
          body: "Same moment, but T1 takes 482 and then the buyer's tax id fails a check. T1 rolls back, and its increment rolls back with it.\n\nT2 was waiting on the row and gets 482. The register has no hole and nothing needs explaining.",
          check: {
            q: "With a sequence instead of the counter row, what would the register show here?",
            options: [
              "The same: 482 for T2's invoice",
              "A gap at 482, T2's invoice is 483",
              "Two invoices numbered 482",
            ],
            answer: 1,
            why: "A sequence value is gone once taken, rollback or not. T1 burned 482, T2 got 483, and the auditor would ask about 482.",
          },
          fields: {
            ROLLBACK: "The whole transaction is undone, the counter increment included.",
            "goes back to 481": "As if T1 had never asked.",
            "482": "Reused by the next writer: no gap.",
          },
        },
        "ms-retry": {
          short: "Retry",
          title: "Under a stricter isolation level, retry",
          body: "Some services run finalize under `REPEATABLE READ`. There T2 does not re-read the row: the database fails it with a serialization error, because T2's snapshot no longer matches the row.\n\nThe fix is to retry the whole transaction after a short random pause, at most three times. T2 gets 483 on the second try, no number is repeated or skipped.",
          fields: {
            "REPEATABLE READ": "The transaction sees one snapshot from its start.",
            "40001": "The standard code for \"try the transaction again\".",
            "whole transaction": "Begin again from the first statement, with a fresh snapshot.",
            "at most 3 tries": "Bounded, so an overload does not turn into a retry storm.",
            stale: "Everything read before the error may already be out of date.",
          },
        },
      },
    },
  },
};

export default text;
