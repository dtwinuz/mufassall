import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Project: Shaffof, sealed charity reports and a sourced zakat calculator",
  summary:
    "Shaffof (Uzbek for \"transparent\") is a Wonmor open-source project with two parts: a charity ledger whose monthly reports are folded into a Merkle root and timestamped, so nobody can quietly change them, and a zakat calculator that shows four madhhab methods side by side with their sources and gives no rulings. It never touches money. It is in planning: the home page and a concept demo with 16 fictional funds run real SHA-256 and RFC 9162 proofs, and the calculator stays unreleased until scholars review it in writing. This lesson covers the donor's, the fund's and the auditor's journeys, the Merkle design, its first security bug, and the pipeline.",
  learn: [
    "How a monthly Merkle root makes a published report tamper-evident, and how a donor proves their gift is inside it with only a receipt number",
    "Leaf encoding as a security decision: every shown field bound, an injective format, domain-separated hashing",
    "An append-only ledger where a mistake is fixed by a reversing entry, and why the seal proves \"unchanged\", never \"true\"",
    "A calculator built around sources, a scholar-review gate, and the shared static-site pipeline",
  ],
  nodes: {
    bank: "Fund's bank",
    fund: "Fund",
    ledger: "Append-only ledger",
    seal: "Monthly seal",
    report: "Public report",
    donor: "Donor",
    auditor: "Auditor",
    calc: "Zakat calculator",
    ots: "OpenTimestamps",
    site: "shaffof-site (Caddy)",
    gh: "GitHub",
    ci: "GitHub Actions",
    rel: "GitHub Releases",
  },
  metrics: {
    silent: "Edits that leave no trace",
    proof: "Hashes a donor needs",
    trust: "Parties to trust for a check",
    methods: "Methods compared side by side",
    crash: "Inputs that crash the page",
    inline: "Unsafe inline sources in the CSP",
  },
  steps: {
    what: {
      short: "What",
      title: "Shaffof: a report you can check, not just trust",
      body: "Today a charity fund publishes a PDF or a spreadsheet and you have to trust it; if one number changes later, nobody can tell. Shaffof keeps the fund's ledger and, every month, folds its entries into one Merkle root that is timestamped and published. Users it plans for: charity funds, mosque and mahalla committees, and their donors.\n\nMoney never passes through Shaffof: it stays in the fund's bank account. Status on 2026-11-19: **planning**, no hosted service and no partner fund. The home page computes this root from 8 fictional entries in your browser with WebCrypto; nothing is sent.",
      fields: {
        donation: "Income: a category, never a donor's name.",
        fee: "Even a 4 500 so'm bank fee is an entry: the report must add up.",
        root: "One SHA-256 hash that commits to all eight entries.",
        "no donor names": "A rule in the plan, not an option.",
      },
    },
    report: {
      short: "Report",
      title: "The donor opens a report: one changed amount shows at once",
      body: "A monthly report page shows the entries and the root that was published and sealed. The browser recomputes the root from the entries it is shown. If the fund later changes food parcels from 640 000 to 940 000 so'm, the recomputed root is a completely different hash and the page says so.\n\nWith a plain PDF the same edit leaves no trace. In the concept demo you can make that edit yourself and watch the root break.",
      check: {
        q: "A fund edits one amount after publishing and republishes the page. What does a donor's browser show?",
        options: [
          "Nothing: the page is the fund's own",
          "Mismatch: the root recomputed from the entries no longer equals the sealed, published root",
          "A warning only if the amount grew",
        ],
        answer: 1,
        why: "The published root was timestamped, so the fund cannot replace it with a new one without the date giving it away. Any edit to any field changes a leaf, the path above it and the root.",
      },
      fields: {
        "published root": "The sealed value from the day the month closed.",
        "current root": "Recomputed now from what the page shows.",
        Mismatch: "The demo's exact message when they differ.",
      },
    },
    receipt: {
      short: "Receipt",
      title: "\"Is my donation in the report?\" A receipt number and three hashes",
      body: "A donor types a receipt number, K-0003. The page returns the entry and an inclusion proof: three sibling hashes, each marked left or right. Hashing the entry and folding in the siblings in that order must give the published root. For 8 entries that is log2 8 = 3 hashes; for a million entries it would be 20.\n\nThe donor learns their gift is in the sealed report without anyone publishing names, and without downloading the whole ledger.",
      check: {
        q: "A fund has 1 000 000 entries this month. How many hashes does one donor's proof hold?",
        options: ["1 000 000", "About 20", "1 000"],
        answer: 1,
        why: "An inclusion proof has one sibling per tree level: ceil(log2 n). For a million leaves that is 20 hashes, 640 bytes, whatever the size of the ledger.",
      },
      fields: {
        entry: "Exactly the fields that were hashed: id, date, category, direction, amount.",
        proof: "Sibling hashes from the leaf up.",
        side: "Whether the sibling sits left (L) or right (R): it fixes the order of hashing.",
        root: "Must equal the published root, or the proof fails.",
      },
    },
    audit: {
      short: "Audit",
      title: "The auditor: plain JSON, checked without our server",
      body: "The demo's auditor mode shows that proof as plain JSON. An auditor can paste it into a file and check it with the same `merkle.js` the site uses, in Node, with no Shaffof server: the README gives the five lines. The steps are the leaf hash 48aba4b6..., then three combinations up to the root.\n\nChange one character, the amount 75000 to 75001, and the result is \"NOT included\". The only party left to trust is the timestamp on the root.",
      fields: {
        "merkle.js": "The same file the home page loads: one implementation for site and audit.",
        "proof.json": "Copied from auditor mode: entry, proof, root.",
        included: "The recomputed root equals the published one.",
        "NOT included": "One changed byte anywhere breaks it.",
      },
    },
    console: {
      short: "Console",
      title: "The fund: add entries, reverse mistakes, seal the month",
      body: "In the concept demo's fund console (login demo / demo) the treasurer adds entries with a category, an amount and an optional document hash, never a donor's name; income gets a receipt number automatically. There is no edit and no delete. A mistake, say a parcel entered twice, is fixed with a reversing entry that points to it, and both rows stay visible in the report.\n\n\"Close and seal the month\" folds all open entries into one root and sends it to OpenTimestamps; after that the month accepts nothing new.",
      fields: {
        correction: "A T- entry in the opposite direction, linked to the row it fixes.",
        "no edit button": "Append-only in the UI, and planned in the database too.",
        seal: "Closing the month: one root, then a timestamp.",
      },
    },
    zakat: {
      short: "Zakat",
      title: "The calculator: four methods side by side, each with its source",
      body: "The concept calculator takes cash, bank, gold, worn jewellery, trade goods, receivables and debts due within 12 months, and shows four columns at once. Only two differences are coded, the two the research notes document with a source: whether worn jewellery counts, and whether near-term debts are deducted. Nisab is 85 g of gold or 595 g of silver (NZF also cites 87.48 g / 612.36 g); prices are samples.\n\nOn the sample input the due amount ranges from 1 409 500 to 2 592 500 so'm. It runs in the browser and stores nothing. It is **not** reviewed by scholars, gives no ruling, and will not be released until a written review is positive.",
      check: {
        q: "Same input, but the Hanafi column shows 103.7 million net and the others 56-64 million. Why?",
        options: [
          "A rounding difference",
          "The Hanafi column counts the 28 g of worn jewellery (47.32 million at the sample price); the others exempt it",
          "The Hanafi column uses the gold nisab",
        ],
        answer: 1,
        why: "The research notes record that in the Hanafi school all jewellery is counted, while the others exempt jewellery that is regularly worn. Showing the columns side by side, with the reason on each row, is the point: the calculator explains differences instead of choosing one.",
      },
      fields: {
        nisab: "The threshold. The demo compares against silver by default; gold is a switch.",
        Hanafi: "Counts all jewellery and deducts near-term debts.",
        Shafi: "Exempts worn jewellery; deducts no debts in this model.",
        Maliki: "Exempts worn jewellery; deducts near-term debts.",
        Hanbali: "Same two rules as Maliki here, so the same figure.",
      },
    },
    encoding: {
      short: "Leaf",
      title: "What goes into a leaf is a security decision",
      body: "Each entry is encoded as the JSON array `[id, date, cat, dir, amount]` before hashing. Every field the report shows, the direction included, is therefore bound to the root, and JSON quoting makes the encoding injective: two different entries can never produce the same bytes.\n\n`serialize()` also refuses what the ledger cannot hold: a field that is not a string, or an amount that is not a non-negative safe integer. Money is counted in whole so'm, never in floating point.",
      fields: {
        dir: "Income or spending. Without it a donation could become an expense unnoticed.",
        amount: "An integer number of so'm, at most 2^53 - 1.",
        "0x00": "The leaf prefix, as in RFC 9162.",
      },
    },
    tree: {
      short: "Tree",
      title: "The tree: domain separation and no duplicated leaf",
      body: "Inner nodes are `SHA-256(0x01 || left || right)`, leaves use `0x00`. The test suite shows the classic forgery, presenting an inner node as a leaf, working against plain SHA-256 and failing against this tree.\n\nAn odd-sized tree splits at the largest power of two below n instead of copying its last leaf, so `[a,b,c]` and `[a,b,c,c]` have different roots: no CVE-2012-2459-style ambiguity. The empty tree is the SHA-256 of nothing, and roots for sizes 1 to 8 match the published RFC 6962 vectors.",
      check: {
        q: "Why not pad an odd level by copying the last node, as some Merkle trees do?",
        options: [
          "Copying is slower",
          "Then [a,b,c] and [a,b,c,c] share a root, so one report could be shown with an extra duplicated entry and still match",
          "RFC 9162 forbids odd trees",
        ],
        answer: 1,
        why: "Duplicating the last node makes two different lists hash to the same root, the bug behind CVE-2012-2459 in Bitcoin. Splitting at a power of two gives every list its own root.",
      },
      fields: {
        "0x01": "Inner-node prefix: a node can never pass as a leaf.",
        split: "RFC 9162 rule for trees whose size is not a power of two.",
        "empty tree": "Defined, not a crash: an early version recursed forever (finding F2).",
        path: "Out-of-range or non-integer indices throw instead of returning another leaf's path (F3).",
      },
    },
    seal: {
      short: "Seal",
      title: "Sealing the root in time",
      body: "When a month closes, its root is planned to go through the shared core of the sister project Muhr to public OpenTimestamps calendars and, hours later, into a Bitcoin block. The report page shows that timeline: month closed, root sent to a calendar (retried on another if one fails), confirmed by a block. Shaffof holds no BTC; the calendars pay the fees.\n\nThe report can be downloaded as JSON with the fund, the month, the root, the hashing rule and every entry, so anyone can rebuild the tree from scratch.",
      check: {
        q: "A month's root is confirmed in a Bitcoin block. What does that prove?",
        options: [
          "That every entry is true",
          "That this exact list of entries existed at that time and has not changed since",
          "That the money reached the families",
        ],
        answer: 1,
        why: "A seal proves integrity and time, not truth. A fund could seal a false entry. That is why the plan says to compare the report with the bank statement, and the site says the same in all three languages.",
      },
      fields: {
        fund: "Which fund published the report.",
        month: "The period this root seals.",
        rfc: "The hashing rule, written into the file so a verifier needs no guessing.",
        entries: "All entries, in order: enough to rebuild the tree.",
        Muhr: "The sister project whose log and anchoring core Shaffof reuses.",
      },
    },
    limits: {
      short: "Limits",
      title: "What Shaffof will never do",
      body: "The plan lists its non-goals before any code. No money: Shaffof never collects, holds or moves funds. No crypto payments and no token: sealing only ties a hash to a time. No donor names, no rankings, no \"most generous\" table: whether even anonymous public reports risk riya (showing off in charity) is a question put to scholars. No fatwas.\n\nAnd the seal is honest about its limit: it shows the report has not changed since it was published, not that it is true. Comparing with the bank statement stays the auditor's job.",
      fields: {
        money: "Keeps the project out of payment and fundraising regulation.",
        names: "Privacy and riya: names never appear; in the demo, new receipt numbers are random.",
        fatwa: "The calculator shows methods and sources; the choice stays with the user and their scholar.",
        truth: "Integrity is not accuracy.",
      },
    },
    stack: {
      short: "Stack",
      title: "The planned stack, and why",
      body: "The ledger is planned on .NET with PostgreSQL, with UPDATE and DELETE rights revoked so append-only is enforced by the database. Merkle hashing follows RFC 9162; a later Merkle sum tree would also let anyone check the totals, not just the entries. Anchoring reuses Muhr's core, so Shaffof needs no blockchain code of its own.\n\nThe calculator is a static offline web app that stores nothing; a Telegram bot will offer `/zakot` and receipt checks. Order: Muhr first, then Sanad, then Shaffof, once the scholars' review is back. The calculator and small funds are free; a share of donations is ruled out forever.",
      fields: {
        ledger: "Append-only by database rights, not only by code.",
        "sum tree": "Each node also carries the sum below it, so totals become provable.",
        calculator: "Offline and storage-free: nothing to leak.",
        order: "Shared core first; Shaffof reuses it.",
      },
    },
    pipeline: {
      short: "Pipeline",
      title: "The pipeline: the same gates as its sisters, and a stricter checker",
      body: "Shaffof shares the Wonmor pipeline: a `build` job on every pull request (site checker, REUSE, ESLint with zero warnings, unit and fast-check property tests, Chromium end-to-end tests under the production CSP, a combined coverage gate) and a forced-command deploy on `main` with atomic symlink swap, live SHA check, smoke test and rollback.\n\nIts `check-site` went one step further when `unsafe-inline` was dropped from the CSP: it also fails on style attributes in markup built by scripts, and on an SVG `<style>` whose SHA-256 is not listed in the CSP, so the favicon's one allowed style cannot drift.",
      fields: {
        "check-site": "Static checks before anything is published.",
        sha256: "The favicon's dark-mode style is allowed by its exact hash, and the checker keeps them in sync.",
        "fast-check": "Random-input property tests; they found a real bug (see the branch).",
        rollback: "Automatic when the post-deploy checks fail.",
      },
    },
    release: {
      short: "Release",
      title: "Releases and evidence",
      body: "Releases from `v0.1.0` are archives of the home page only: built twice and compared byte for byte, with SHA256SUMS and Sigstore provenance that anyone can verify with `gh attestation verify`. They are not a product release, and the README says so.\n\nShaffof holds the OpenSSF Best Practices silver badge (project 16670) and runs Scorecard every week; its site scores A+ on Mozilla Observatory and SSL Labs.",
      fields: {
        cmp: "Reproducibility check: two builds must be identical.",
        Sigstore: "Provenance signed by the workflow's identity.",
        "16670": "The project's OpenSSF Best Practices entry.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "1) Shaffof never touches money; it keeps an append-only ledger and seals a Merkle root every month. 2) A donor's browser recomputes the root, so any later edit shows as a mismatch. 3) A receipt number gives an inclusion proof of log2 n hashes, checkable with the same merkle.js in Node, without our server. 4) Mistakes are fixed by reversing entries; nothing is edited or deleted. 5) Leaves encode every shown field as a JSON array; prefixes 0x00 and 0x01 and a power-of-two split close the classic Merkle traps. 6) The seal proves \"unchanged since\", never \"true\". 7) The zakat calculator compares four methods with sources, gives no ruling, and waits for a written scholar review. 8) The pipeline is shared with Muhr and Sanad: tested, rollback-safe, reproducible, OpenSSF silver.",
    },
  },
  scenarios: {
    direction: {
      label: "Missing direction",
      steps: {
        "dir-gap": {
          short: "Gap",
          title: "A donation could become an expense with the same root",
          body: "The security review on 2026-11-14 found finding F1 in the first demo. Leaves were built as `id|date|cat|amount`. The direction, income or spending, was not in it: turning a 1 200 000 so'm donation into a 1 200 000 so'm expense kept the same leaf and the same root, contradicting the page's own claim that any change shows.\n\nWorse, a `|` join is not injective: `\"A|2026\", \"x\"` and `\"A\", \"2026|x\"` both become `A|2026|x`.",
          check: {
            q: "What is the general rule this bug broke?",
            options: [
              "Use a longer hash",
              "Hash every field the reader relies on, in an encoding where different inputs can never give the same bytes",
              "Sort the entries before hashing",
            ],
            answer: 1,
            why: "A Merkle tree protects exactly the bytes you put in. A field shown but not hashed is unprotected, and an ambiguous encoding lets two different records share one hash.",
          },
          fields: {
            direction: "Shown on the page, missing from the hash.",
            "same root": "The edit was invisible to the proof.",
            "one encoding": "Two different entries, identical bytes.",
          },
        },
        "dir-fix": {
          short: "Fix",
          title: "A JSON array of every shown field",
          body: "Entries are now encoded as `[id, date, cat, dir, amount]` with JSON quoting, so the direction is bound and no two entries share an encoding. Non-string fields and amounts that are not non-negative safe integers are rejected.\n\nTests guard it: \"entry encoding\" checks the exact bytes and that flipping in/out changes them, and \"tampering is detected\" changes the amount, the direction, the id, a sibling and a side, and expects the proof to fail each time.",
          fields: {
            dir: "Now inside the leaf.",
            injective: "Different inputs, different bytes, always.",
            "tampering is detected": "The test that edits the entry and the proof and expects every check to fail.",
          },
        },
      },
    },
    "no-text": {
      label: "Fuzzing finds a crash",
      steps: {
        "fuzz-hit": {
          short: "Crash",
          title: "Random input breaks the amount field",
          body: "To lift the OpenSSF Scorecard \"Fuzzing\" score, the project added fast-check property tests that throw hundreds of random values at the pure functions. One found a counterexample for `parseAmount`: an array holding an object whose `toString` is not a function. `String()` on it throws a TypeError, so the home-page demo's amount parser would crash instead of treating the input as empty.\n\nNo user types that into a form, but the function's contract was \"anything in, digits out\", and it broke that contract.",
          fields: {
            counterexample: "The smallest failing input fast-check shrank it to.",
            TypeError: "String() cannot turn this value into text.",
          },
        },
        "fuzz-fix": {
          short: "Fix",
          title: "Treat a value with no text form as empty, and keep the test",
          body: "Commit 6ee4e30 (merged with PR #11 on 2026-11-14) wraps the conversion in the home-page demo's `demo-core.js` in try/catch and adds the counterexample as a fixed regression test. Muhr's hash comparison had the same `String(raw)` shape and got the same fix, recorded in its changelog.\n\nThe lesson for the pipeline: property tests found a real edge case that hand-written examples had missed, in code already under a line-coverage gate. High coverage shows which lines ran, not which inputs were tried.",
          fields: {
            try: "The conversion can no longer throw.",
            "regression test": "The exact counterexample, now a permanent test.",
          },
        },
      },
    },
    "favicon": {
      label: "The favicon and the CSP",
      steps: {
        "csp-gap": {
          short: "Gap",
          title: "Two footer styles kept the whole CSP loose",
          body: "The first CSP allowed `style-src 'unsafe-inline'` only because the footer had two `style` attributes; the assurance case listed it as a residual risk (issue #7). Moving those two to classes looked like the whole job.\n\nIt was not: with `style-src 'self'` alone, the favicon lost its stroke, because the SVG keeps a small `<style>` block that switches its colours for dark mode. A strict CSP silently broke a file nobody thinks of as code.",
          fields: {
            "unsafe-inline": "One permission that would let any injected style run.",
            "favicon": "An SVG with its own <style>: blocked by a strict CSP like any inline style.",
          },
        },
        "csp-fix": {
          short: "Fix",
          title: "Allow the favicon by hash, and make drift fail the build",
          body: "PR #23 moved the footer styles to `site.css` and allowed exactly the favicon's style block by its SHA-256. A hash breaks the moment the block changes, so `check-site` now hashes every SVG `<style>` and fails if the CSP does not list it, printing the hash to add.\n\nThe PR's negative test edits the favicon and watches the checker fail with that message; under the new CSP the favicon keeps its colour and the console has zero errors.",
          fields: {
            "sha256": "Allows one exact block, not inline styles in general.",
            "check-site": "Recomputes the hash on every run, so the CSP and the favicon cannot drift apart.",
            "0 console errors": "Checked in local Chromium under the production CSP.",
          },
        },
      },
    },
  },
};

export default text;
