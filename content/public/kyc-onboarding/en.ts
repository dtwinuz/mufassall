import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Customer verification (KYC)",
  summary:
    "A wallet app must know who its customers are before they move money: passport, selfie, a check by an external provider, sometimes a human reviewer. How to model the statuses, keep passport photos from leaking, survive a provider that is slow or answers twice, run a review queue on time, catch duplicates and sanctioned names, limit what an unverified account can do, and keep a trail of every decision for years.",
  learn: [
    "Application statuses from draft to approved, rejected or needs_more_info, and one table of allowed moves",
    "Documents in a private encrypted store with short-lived signed upload and view links",
    "Calling the provider with an idempotency key; callback first, polling as the safety net; a manual review queue with an SLA",
    "Sanctions/PEP screening and duplicates by keyed hash; tiered limits enforced on the server; re-verification, an audit trail and retention",
  ],
  nodes: {
    app: "Mobile app",
    api: "KYC service",
    db: "KYC database",
    docs: "Document storage",
    idp: "KYC provider",
    jobs: "Background jobs",
    reviewer: "Review panel",
    lists: "Sanctions lists",
    pay: "Payments",
  },
  metrics: {
    exposed: "Documents open to anyone",
    doubles: "Checks billed twice",
    late: "Reviews past the SLA",
    dups: "Duplicate accounts",
    cashout: "Withdrawals by unverified accounts",
    orphan: "Callbacks that found no application",
  },
  steps: {
    setup: {
      short: "Setup",
      title: "A new customer asks to be verified",
      body: "A wallet app lets people top up, pay and withdraw. The law requires knowing the customer first: the app sends a name, passport number, PINFL (the 14-digit personal number) and birth date, and the KYC service creates an application in `draft`. All data here is fake: `AA1234567`, `12345678901234`.\n\nAfter the first month the numbers are not good: a third of manual reviews wait more than their deadline, 40 people opened a second account for a second welcome bonus, and 120 withdrawals a day come from accounts nobody verified.",
      fields: {
        type: "Individual or company: a company also needs its registration and its owners.",
        passport: "Document number: a fake one here, sensitive personal data in real life.",
        pinfl: "The personal number stays the same for life, unlike a passport, so it is the better key for duplicates.",
        birth_date: "Needed to tell two people with the same name apart, in screening too.",
        application_id: "Our id for this verification, sent to the provider as a reference.",
        status: "Every application starts as a draft that only the customer can change.",
      },
    },
    states: {
      short: "States",
      title: "The application is a state machine",
      body: "Six statuses and a table of allowed moves. The provider may approve or reject alone, or ask for a person (`in_review`). A reviewer may approve, reject or ask for more (`needs_more_info`, for example a blurred photo); the customer then uploads again and the application goes back to `submitted`.\n\nEvery change goes through one function that checks the table and the `version` column, so a late callback or a second reviewer cannot move an application where it may not go.",
      check: {
        q: "A reviewer rejected kyc_3391 ten minutes ago. Now a late provider callback says \"approved\". What happens?",
        options: [
          "The application becomes approved: the provider has the last word",
          "Nothing changes: rejected -> approved is not in the table; the callback is logged and flagged",
          "The newest event wins, so it is approved",
        ],
        answer: 1,
        why: "Final statuses do not move. The table has no edge out of `rejected`, so the callback cannot change it; it is kept as evidence and someone can look at the disagreement. Without the table, the last message to arrive decides, which is a race.",
      },
      fields: {
        status: "One column, values from a closed list.",
        version: "Each change bumps it; an update for an old version changes 0 rows.",
        draft: "Only the customer edits it; nothing is sent anywhere yet.",
        in_review: "The provider was not sure: a person decides.",
        needs_more_info: "Not a rejection: the customer can fix it and send again.",
      },
    },
    "docs-leak": {
      short: "Leak",
      title: "Passport photos behind public links",
      body: "The app uploads photos straight to a bucket with public read, so it can show them back to the customer. Object names are application ids, and the ids go up one by one. The links never expire and need no login.\n\nA support agent pastes one link into a chat, and the chat ends up in a public group. Anyone who changes the number in the URL can download 18 000 passports and selfies.",
      watch: "A passport photo plus a selfie is everything needed to open an account in someone else's name.",
      fields: {
        "public read": "Anyone with the URL can download the file: no account, no check.",
        sequential: "Guessable names: one link gives away all the others.",
        "no expiry": "A link that leaks once leaks forever.",
        "18 000": "Every customer who ever uploaded a document.",
      },
    },
    "docs-secure": {
      short: "Private",
      title: "A private encrypted store and links that expire",
      body: "The bucket becomes private and encrypted with a key from the key service. To upload, the app asks the KYC service for a signed URL: one object, random name, 5 minutes, at most 10 MB, JPEG only. The file never passes through the API.\n\nReviewers see photos through signed links that live 60 s and are issued only to the reviewer role; each one is an audit entry. Documents open to anyone: zero.",
      check: {
        q: "A reviewer pastes a view link into a chat. What limits the damage?",
        options: [
          "Encryption of the bucket",
          "The 60-second lifetime and the audit entry that says who issued the link",
          "The random object name",
        ],
        answer: 1,
        why: "Encryption at rest protects disks and backups; a valid signed link is decrypted for whoever holds it. A random name stops guessing, not sharing. What limits a leaked link is how soon it dies, and the audit tells you whose habit to fix.",
      },
      fields: {
        kind: "Which document: front page, selfie video, company registration.",
        size_bytes: "Declared size; the signed URL refuses a bigger upload.",
        upload_url: "Random, single object: knowing it says nothing about other files.",
        signature: "Signed by the service: the URL works only as issued and only until it expires.",
        expires_in_s: "Five minutes to start the upload, then the link is useless.",
        max_bytes: "Storage enforces the limit, not the app.",
      },
    },
    double: {
      short: "Twice",
      title: "A provider timeout pays for two checks",
      body: "The KYC service sends the documents to the provider with a 10 s timeout. The provider is busy and answers after 12 s. The worker counts that as a failure and retries; the provider starts a second check.\n\nTwo checks are billed. One says approved, the other in_review because the selfie came out blurred in the second upload, and the final status depends on which callback arrives last. 11 applications a day.",
      watch: "No answer is not a failure. The first request may have worked.",
      fields: {
        "timeout 10 s": "Ours, not the provider's: it keeps working after we give up.",
        "no answer": "Unknown outcome, treated as a failure.",
        "new check": "The provider cannot tell a retry from a new request.",
        chk_B: "A second, paid, different result for the same person.",
        "which callback lands last": "A race decides the customer's status.",
      },
    },
    idem: {
      short: "Once",
      title: "An idempotency key, a callback, and polling as the net",
      body: "Every attempt gets an `Idempotency-Key` built from the application and the attempt number. A retry with the same key gets the same check back, marked as replayed, and is not billed again. The provider answers `202` at once and sends the result later to our callback URL, signed.\n\nIf no callback arrives in 15 minutes, a background job asks `GET /v1/checks/chk_A`. Callbacks are fast; polling catches the ones that got lost. Double checks: zero.",
      check: {
        q: "The customer gets needs_more_info, uploads a new selfie and the app submits again. Which key?",
        options: [
          "The same kyc_3391-attempt-1, it is the same application",
          "A new one, kyc_3391-attempt-2: it is a new check with new documents",
          "No key: retries are rare",
        ],
        answer: 1,
        why: "The key says \"this is the same request\". With the old key the provider would replay the old result, built on the blurred selfie. A new attempt means new documents and a new key; a retry of one attempt reuses its key.",
      },
      fields: {
        "Idempotency-Key": "Same attempt, same key: the provider returns the first check.",
        reference: "Our application id: callbacks are matched by it.",
        callback_url: "Where the provider posts the result; it is verified by signature.",
        "Idempotent-Replayed": "This answer is a replay of the first request, not a new check.",
        check_id: "The provider's id, stored for polling and support.",
      },
    },
    review: {
      short: "Review",
      title: "A review queue ordered by deadline",
      body: "18% of checks need a person: a low liveness score, a name that does not match the document. Reviewers used to open the newest first, so old cases waited, and 31% missed the 4 working hours promised.\n\nNow the queue is ordered by `due_at`. Taking a case sets `assigned_to` with a 15-minute lease, so two reviewers never work on one; an expired lease returns it to the queue. An alert fires at 75% of the SLA. Late reviews drop to 4%.",
      check: {
        q: "Two reviewers open the queue in the same second and both click kyc_3391. How do you make only one get it?",
        options: [
          "Refresh the queue more often",
          "Claim with one conditional UPDATE: set assigned_to only where it is empty or the lease has expired; 0 rows means someone else took it",
          "Let both review it and keep the first decision",
        ],
        answer: 1,
        why: "The database decides inside one statement, so exactly one claim changes the row. Refreshing makes the race shorter, not impossible. Two people reviewing the same case is wasted time and two decisions to reconcile.",
      },
      fields: {
        reason: "Why a person is needed: the reviewer starts from it.",
        due_at: "The SLA as a timestamp: the queue is sorted by it.",
        assigned_to: "Who works on it now; also who decided, later.",
        lease_until: "If the reviewer walks away, the case returns to the queue.",
        over_sla: "Already late: shown on top and counted on the dashboard.",
      },
    },
    risk: {
      short: "Risk",
      title: "Duplicates by keyed hash, sanctions and PEP lists",
      body: "Before approval, two checks. Duplicates: the service stores keyed hashes (HMAC) of the PINFL and the passport number and looks for an existing customer. The PINFL catches a person who comes back with a new passport. A match goes to a reviewer, not to auto-approval.\n\nScreening: name and birth date are matched against sanctions lists and politically exposed persons (PEP). A fuzzy score of 0.93 holds the application for a person. The lists change daily, so approved customers are re-screened every night. Duplicate accounts: zero.",
      check: {
        q: "Screening returns a 0.93 match for a very common name. What should the service do?",
        options: [
          "Reject at once: sanctions are serious",
          "Hold the application for a reviewer with the matched entry; reject only if the person really is on the list",
          "Approve: it is not a 100% match",
        ],
        answer: 1,
        why: "Fuzzy matching on names produces many false positives; rejecting them all loses honest customers, and ignoring them misses real ones. A person compares birth date, nationality and document with the list entry and writes down why.",
      },
      fields: {
        pinfl_ref: "Keyed hash of the personal number: lookups by equality, no raw PINFL in the index.",
        doc_ref: "The same for the passport number.",
        "HMAC-SHA256": "With a secret key, so a stolen table cannot be brute-forced back to numbers.",
        duplicate: "Same person, second account: a reviewer decides, no second bonus.",
        PEP: "Politically exposed person: allowed, but with enhanced checks.",
        "re-screened": "A customer can land on a list after approval.",
      },
    },
    limits: {
      short: "Tiers",
      title: "Limits before and after verification, enforced on the server",
      body: "The app hid the Withdraw button from unverified users, but an old app version and a few scripts called the API directly: 120 withdrawals a day. Now Payments asks the KYC service for limits on every money movement.\n\nUnverified: a balance up to 1 000 000 so'm, merchant payments, no withdrawals and no transfers to people. Verified: up to 100 000 000 so'm and 20 000 000 a month out. A refused withdrawal gets `403 kyc_required` with the next step. Unverified withdrawals: zero.",
      check: {
        q: "The app already hides Withdraw for unverified users. Why check on the server as well?",
        options: [
          "It is not needed if the app is up to date",
          "Old app versions and direct API calls skip the app's rules; only the server sees every request",
          "To show a nicer error message",
        ],
        answer: 1,
        why: "The client is not under your control: people run old versions, scripts and modified apps. A rule that protects money must sit where every request passes: in the service that moves the money.",
      },
      fields: {
        tier: "One word that every money service understands.",
        balance_max_uzs: "How much an unverified wallet may hold.",
        withdraw_month_uzs: "Zero: money cannot leave before we know who takes it.",
        p2p: "Transfers to other people are closed too: they are another way out.",
      },
    },
    reverify: {
      short: "Expiry",
      title: "Passports expire: verify again",
      body: "A verification is only as good as the document behind it. Every night a job finds approved customers whose passport expires within 30 days: 1 140 people. They get a push and an SMS 30, 14 and 3 days before.\n\nOn the expiry day, without a new document, the tier drops to unverified: the balance stays, withdrawals stop. A new passport opens a short application with only the document step, and the old decision stays in history.",
      check: {
        q: "Why not block the whole account on the expiry day?",
        options: [
          "Blocking everything is the safest choice",
          "The money is the customer's: stop the risky operations, keep payments and the balance until the document is renewed",
          "Expired passports do not matter",
        ],
        answer: 1,
        why: "An expired document is a reason to stop money from leaving, not to take it away. Dropping to the unverified tier reuses rules that already exist, and the customer has a clear way back.",
      },
      fields: {
        passport_expires: "Stored at approval, so the job can find upcoming expiries with an index.",
        "1 140": "Customers to remind this month.",
        "tier -> unverified": "The same limits as a new customer.",
        "balance stays": "Nothing is taken; only the way out closes.",
        "only the document step": "A renewal, not a new onboarding.",
      },
    },
    audit: {
      short: "Audit",
      title: "Every decision on record, every document with a deadline",
      body: "Every status change writes an append-only row: from, to, who (the reviewer's id or `provider`), why, and which checks and documents it was based on. Reviewers cannot edit or delete these rows, and a rejection by one reviewer can be reopened only by another.\n\nRetention is written down too: for approved customers, documents and decisions stay 5 years after the account closes, as anti-money-laundering rules usually demand. Rejected and abandoned applications lose their images after 90 days. The provider deletes its copy 30 days after the check.",
      check: {
        q: "In 2028 an auditor asks why kyc_3391 was approved. What must exist?",
        options: [
          "The provider's result, if it still has it",
          "The decision row with reviewer id, reason and evidence ids, and the documents kept under retention",
          "Application logs from that day",
        ],
        answer: 1,
        why: "Logs live for weeks and the provider deletes its copy. Only your own decision trail and the documents it points to, kept for the retention period, can answer years later.",
      },
      fields: {
        actor: "Who decided: a reviewer id, or provider for automatic decisions.",
        reason: "Written by the reviewer, in words a later reader understands.",
        evidence: "The checks and documents the decision relied on.",
        "5 years": "After the account closes, not after the check.",
        "90 days": "No reason to keep a stranger's passport after a rejection.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "Seven rules for verifying customers.\n\n1) Model the application as a state machine: draft, submitted, in_review, approved, rejected, needs_more_info, one table of moves, a version column. 2) Documents live in a private encrypted store; uploads and views go through signed links that die in minutes or seconds. 3) Call the provider with an idempotency key per attempt; take the callback, poll what never came back. 4) Run manual review by deadline, with claims that only one reviewer can win. 5) Screen sanctions and PEP lists at signup and every night; find duplicates by a keyed hash of the PINFL and the document. 6) Tie limits to the verification tier and enforce them in the service that moves money. 7) Re-verify before documents expire, write every decision to an append-only trail, and delete documents when their retention ends.",
    },
  },
  scenarios: {
    "early-callback": {
      label: "Callback too early",
      steps: {
        "cb-race": {
          short: "Too early",
          title: "The callback arrives before the transaction commits",
          body: "The submit handler opens a transaction, sets `submitted`, and calls the provider before it commits. The provider decides automatically in 190 ms and calls back. The callback handler cannot see the uncommitted row: 0 rows.\n\nIt answers 200 and drops the event. The transaction commits 190 ms later, and the application waits in `submitted` forever. 140 a day, almost all fast auto-approvals: the happiest customers wait the longest.",
          check: {
            q: "Why are almost all lost callbacks fast approvals?",
            options: [
              "The provider sends approvals with a bug",
              "Only an answer faster than the commit can arrive before the row is visible; slow reviews always come after",
              "Approvals are larger messages",
            ],
            answer: 1,
            why: "Under read committed, another transaction sees the row only after COMMIT. A result that takes hours lands long after; one that takes 190 ms lands inside the 400 ms transaction. The faster the provider, the worse the bug.",
          },
          fields: {
            BEGIN: "The row exists only inside this transaction until it commits.",
            "inside the transaction": "A network call inside a transaction: slow, and visible to the outside world too early.",
            "0 rows": "The callback handler cannot see uncommitted data.",
            "drops it": "200 tells the provider all is well, so it never retries.",
            COMMIT: "Too late: the only message with the result is gone.",
          },
        },
        "cb-fix": {
          short: "Commit first",
          title: "Commit first, match by our reference, never drop",
          body: "The handler now commits `submitted` together with an outbox row and returns. A worker reads the outbox and calls the provider with our `reference`. Callbacks look the application up by that reference, which is already committed when the provider hears of it.\n\nAn unknown reference is answered with 503, so the provider retries later instead of forgetting. Anything still submitted after 15 minutes is polled by the sweeper. Orphaned callbacks: zero.",
          fields: {
            COMMIT: "The application is visible before anyone outside learns about it.",
            outbox: "The call to the provider is a job saved in the same transaction: it cannot be lost or run early.",
            reference: "Our id, known before the call; the provider's check id is not needed to match.",
            "503": "\"Not now, try again\": the provider keeps the event and retries.",
            "never 200-and-drop": "A 200 must mean the result is stored.",
            sweeper: "The safety net for callbacks that never arrive at all.",
          },
        },
      },
    },
  },
};

export default text;
