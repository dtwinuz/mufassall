import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Transactions",
  summary:
    "A wallet app moves money between two accounts. What breaks without a transaction, what breaks even with one when two servers write at once, and which isolation level or lock fixes each case.",
  learn: [
    "Why two `UPDATE`s without `BEGIN`/`COMMIT` can lose money",
    "Dirty read, lost update and write skew, on real interleavings",
    "What `READ COMMITTED`, `REPEATABLE READ` and `SERIALIZABLE` protect from",
    "`SELECT ... FOR UPDATE` versus an optimistic `version` column",
  ],
  nodes: {
    app: "Wallet app",
    api: "API 1",
    api2: "API 2",
    db: "Database",
    report: "Report job",
    fraud: "Fraud check",
  },
  metrics: {
    broken: "Wrong balances",
    p95: "Transfer p95",
    retries: "Retries",
  },
  steps: {
    transfer: {
      short: "Transfer",
      title: "A transfer is two writes",
      body: "A user sends 50 000 from account `acc_42` to `acc_77`. The API runs two statements: take from one, add to the other.\n\nEach statement commits on its own (autocommit). Most of the time both succeed and nobody notices the gap between them.",
      check: {
        q: "The API process is killed right after the first `UPDATE` returns. What is left in the database?",
        options: [
          "Nothing changed: the database undoes the half transfer",
          "Both changes: the second `UPDATE` is replayed later",
          "acc_42 lost 50 000, and acc_77 never got it",
        ],
        answer: 2,
        why: "With autocommit the first `UPDATE` was saved for good the moment it returned. The credit was never sent, and nothing in the database says a transfer was in progress, so the 50 000 is simply gone.",
      },
      fields: {
        acc_42: "The sender. The first statement takes the money here.",
        acc_77: "The receiver. The second statement adds the money here.",
        "UPDATE 1": "One row changed. Each statement is already saved for good the moment it returns.",
      },
    },
    "half-done": {
      short: "Half done",
      title: "The server dies between the two writes",
      body: "The first `UPDATE` is saved. Then the API process is killed: out of memory, a deploy, a power cut. The second `UPDATE` never reaches the database.\n\n50 000 left `acc_42` and arrived nowhere. Nothing in the database says that a transfer was in progress.",
      watch: "Any step can be the last one your process runs. Code between two writes is a gap where money disappears.",
      fields: {
        killed: "The process stopped between the statements. No `catch` block runs in this case.",
        "never sent": "The credit is lost. The database has no idea it was supposed to come.",
      },
    },
    atomic: {
      short: "Atomic",
      title: "`BEGIN` ... `COMMIT`: all or nothing",
      body: "Both statements now run inside one transaction. Until `COMMIT` the changes are only a draft; if the connection drops, the database throws the draft away.\n\nThis is the **A** in ACID, atomicity. The **D**, durability, is the other half: once `COMMIT` returns, the change survives a crash.",
      fields: {
        BEGIN: "Opens the transaction. The following statements are one unit.",
        COMMIT: "Saves everything at once. A crash before this line leaves both accounts as they were.",
      },
    },
    rules: {
      short: "Rules",
      title: "The database guards the rules",
      body: "A bug tries to take 900 000 from an account that holds 200 000. A `CHECK` constraint on the table says a balance can never go below zero.\n\nThe statement fails and the whole transaction rolls back. This is the **C**, consistency: every commit moves the data from one valid state to another.",
      watch: "A rule checked only in application code is a rule that one forgotten code path will break.",
      fields: {
        balance_nonneg: "A `CHECK (balance >= 0)` constraint. The database enforces it for every writer, not just this API.",
        ROLLBACK: "The transaction is cancelled. Nothing from it is saved.",
      },
    },
    "dirty-read": {
      short: "Dirty read",
      title: "Reading someone else's draft",
      body: "A nightly report sums all balances. At the same moment a transfer has taken from `acc_42` but not yet added to `acc_77`. At the lowest isolation level the report sees this draft.\n\nThe total is 50 000 short, and if the transfer rolls back, the report used money that never existed. `READ COMMITTED`, the default in PostgreSQL, Oracle and SQL Server, never shows uncommitted rows. PostgreSQL does not allow dirty reads at all: it runs `READ UNCOMMITTED` as `READ COMMITTED`.",
      check: {
        q: "Two servers pay 50 000 and 30 000 from acc_42 (200 000): each reads, subtracts in code, writes back. Balance?",
        options: [
          "120 000: `READ COMMITTED` makes the second wait",
          "170 000: the second write overwrites the first",
          "An error: the database rejects the second write",
        ],
        answer: 1,
        why: "Both read 200 000 before either committed. The 30 000 payment writes 170 000 over the 150 000, so 50 000 is taken from the user but missing from the balance. `READ COMMITTED` does not stop this.",
      },
      fields: {
        "READ UNCOMMITTED": "The weakest level: reads see other transactions' unsaved changes. Few databases even allow it.",
        SUM: "The report reads every row, including the one in the middle of a transfer.",
        expected: "The real total. The difference is the transfer caught half way.",
      },
    },
    "lost-update": {
      short: "Lost update",
      title: "Two servers, one balance",
      body: "Traffic grew and there are now two API servers. Two payments from `acc_42` arrive together. Each reads the balance, subtracts in code and writes the new number back.\n\nBoth read 200 000. The second write overwrites the first, and one payment is lost. Each transaction was correct on its own; `READ COMMITTED` does not stop this.",
      watch: "Read, compute in code, write back: this pattern loses updates unless something makes the second reader wait.",
      fields: {
        "READ COMMITTED": "The default level. It hides drafts but lets two transactions read the same old value.",
        T1: "The first payment, 50 000.",
        T2: "The second payment, 30 000. It writes a number computed from a value that is already stale.",
        expected: "200 000 minus both payments. 50 000 was taken from the user and is missing from the balance.",
      },
    },
    "for-update": {
      short: "FOR UPDATE",
      title: "Lock the row while you read it",
      body: "The read now takes a row lock: `SELECT ... FOR UPDATE`. A second transaction that wants the same row waits until the first commits, then reads the fresh value.\n\nThis is **pessimistic** locking: assume a conflict and queue everyone up front. Cheap when transactions are short.",
      watch: "For a plain debit even simpler works: `SET balance = balance - 50000 WHERE balance >= 50000` in one statement, no read needed.",
      check: {
        q: "A fraud check (300 ms to 2 s) is called between `FOR UPDATE` and the write. What happens under load?",
        options: [
          "Payments to busy accounts queue up; p95 jumps",
          "Nothing: the lock lasts only a few milliseconds",
          "The database aborts it with a deadlock error",
        ],
        answer: 0,
        why: "The row stays locked for the whole external call. Other payments to the same account wait behind it, connections pile up and transfer p95 jumps to 1.4 s.",
      },
      fields: {
        "FOR UPDATE": "Locks the selected rows until this transaction ends. Others can still read, but cannot lock or change them.",
        waits: "The second payment blocks here. It never sees the old balance.",
        "120000": "The correct result: both payments are applied.",
      },
    },
    "lock-wait": {
      short: "Lock wait",
      title: "A lock held across a network call",
      body: "A fraud check is added in the middle of the transfer: lock the row, call an external service, then write. The call takes 300 ms, sometimes 2 s.\n\nAll that time the row stays locked. Every other payment to a popular account queues behind it, connections pile up and p95 jumps to 1.4 s.",
      watch: "Never wait for the network, a user or a file inside an open transaction that holds locks.",
      fields: {
        "still waiting": "The database logs a transaction that has waited a full second for a row lock.",
        "4118": "The transaction holding the lock. It is waiting for the fraud service, not for the database.",
      },
    },
    version: {
      short: "Version",
      title: "Optimistic: check the version at write time",
      body: "The row now has a `version` column. The API reads without a lock, calls the fraud check, then writes only if the version is still the one it read.\n\nIf someone changed the row meanwhile, zero rows match. The API reads again and retries. No lock is held during the slow call, so p95 falls back.",
      watch: "Optimistic locking pays off when conflicts are rare. On a very hot row most attempts fail and retries burn more than a lock would.",
      fields: {
        version: "A counter raised by every write. The `WHERE` makes the write conditional on it.",
        "UPDATE 0": "No row matched: another transaction got there first. Nothing was overwritten.",
        "re-read": "Read the fresh balance and version, check again, try the write again.",
      },
    },
    "write-skew": {
      short: "Write skew",
      title: "Two checks pass, the rule breaks",
      body: "A new rule: a user may withdraw at most 100 000 a day. Each withdrawal sums today's rows, checks the limit and inserts a new row. The level is `REPEATABLE READ`: each transaction sees a frozen snapshot.\n\nTwo withdrawals run together. Each sees 40 000, each adds 50 000, and each is right in its own snapshot. They touch different rows, so no lock and no version catches it.",
      watch: "Write skew happens when the rule spans several rows but each transaction writes only one of them.",
      fields: {
        "REPEATABLE READ": "A snapshot for the whole transaction. It stops lost updates on one row, not conflicts across rows.",
        SUM: "Both transactions read the same total, without the other's new row.",
        INSERT: "Each adds its own new row. There is no shared row to lock.",
        result: "40 000 over the daily limit, though every check passed.",
      },
    },
    serializable: {
      short: "Serializable",
      title: "`SERIALIZABLE`: as if one at a time",
      body: "The withdrawal now runs at `SERIALIZABLE`. The database tracks what each transaction read and wrote. If the result could not happen in any one-by-one order, it aborts one of them.\n\nThe aborted one gets error `40001` and the API runs the whole transaction again. Now it sees 90 000 and refuses. The price: some retries and extra work in the database.",
      watch: "Retry the whole transaction from the first read, not just the last statement, and cap the number of attempts.",
      fields: {
        SERIALIZABLE: "The strictest level: the outcome equals some serial order of the transactions.",
        "40001": "Serialization failure. Not a bug: the expected signal to retry.",
        retry: "From `BEGIN` again. The second attempt reads the other withdrawal and stops at the limit.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Five rules for writing money.\n\n1) Several writes that belong together go in one transaction. 2) Rules live in the database as constraints. 3) Read-then-write needs `FOR UPDATE`, a `version` check or a single atomic statement. 4) Do not hold locks across network calls. 5) Rules across several rows need `SERIALIZABLE`, and every `40001` gets a full retry.",
    },
  },
};

export default text;
