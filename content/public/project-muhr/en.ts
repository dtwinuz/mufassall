import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Project: Muhr, open timestamp proofs",
  summary:
    "Muhr (Uzbek for \"seal\") is a Wonmor open-source project that will prove a file existed on a given day and has not changed since: SHA-256 on your device, an open RFC 9162 Merkle log, and Bitcoin through OpenTimestamps. No coin, no custody. It is in planning: what runs today is the home page, a concept demo with real hashing and Merkle maths, and a full pipeline with tests, rollback and signed releases. This lesson walks through all of it, from the user's screens to the deploy key.",
  learn: [
    "What Muhr promises and refuses to promise: \"when\", never \"who\" or \"true\"",
    "The receipt: hash, log index, inclusion proof, tree head and an OpenTimestamps anchor, and how to check it without Muhr",
    "RFC 9162 Merkle maths: leaf and node prefixes, the split rule, inclusion and consistency proofs",
    "A static site pipeline built like a product: strict CSP, coverage gates, forced-command deploys with atomic rollback, reproducible releases with Sigstore provenance, OpenSSF evidence",
  ],
  nodes: {
    device: "Your device",
    api: "Muhr API (plan)",
    log: "Merkle log",
    ots: "OTS calendars",
    btc: "Bitcoin",
    verifier: "Verifier",
    site: "muhr-site (Caddy)",
    gh: "GitHub",
    ci: "GitHub Actions",
    rel: "GitHub Releases",
  },
  metrics: {
    sent: "Bytes of the file that leave the device",
    proof: "Hashes in the inclusion proof",
    trust: "Parties you must trust to check",
    rolled: "Good releases rolled back",
    wrong: "Wrong hashes shown",
    stuck: "Reads stuck on \"reading...\"",
  },
  steps: {
    what: {
      short: "What",
      title: "Muhr: a seal for files, and an honest status",
      body: "In Uzbekistan an EIMZO signature says who signed a document, but not reliably when; fake \"verification sites\" are a known problem. Muhr wants to add a date that anyone can check without trusting Muhr: hash the file, put the hash in an open log, anchor the log in Bitcoin. The users it plans for: people with signed contracts, authors of articles, open-source projects stamping their releases.\n\nStatus on 2026-11-19: **planning**. There is no API, log, CLI or bot yet. What is live is muhr.wonmor.io in Uzbek, English and Russian. Drop a file there and the page computes its SHA-256 locally and draws a draft receipt; the log and anchor fields say `soon`.",
      fields: {
        WebCrypto: "The browser's built-in crypto. A pure-JS fallback exists and both are tested against node:crypto.",
        muhr: "Receipt format version. `0-draft` means the format can still change.",
        hash: "Algorithm and value. Only these 32 bytes would ever reach the server.",
        log: "Where the hash will sit in the Merkle log. Not built yet, so `soon`.",
        anchors: "Where the log root is timestamped. OpenTimestamps, later.",
        created_local: "The browser's own clock. The page labels it as not a proof.",
      },
    },
    stamp: {
      short: "Stamp",
      title: "Stamping a file: a 32-byte request and a receipt",
      body: "The concept demo (wonmor.io/demo/muhr/) shows the planned flow on fictional data. You choose a file; it is hashed on your device and only the hash is sent to the planned `POST /stamp`. The API appends it to the log and answers at once with a receipt: the entry's index, the tree size, the tree head (root) and the inclusion proof that ties your hash to that root.\n\nThe receipt here is real maths: a 7-entry log built with the repo's `demo/merkle.js`, the sample contract at index 5, three sibling hashes. Until the root is anchored, you still trust the log operator: one party.",
      check: {
        q: "You stamp a 48 MB release installer. What does Muhr's server receive?",
        options: [
          "The file, encrypted",
          "Only the 32-byte SHA-256 of the file",
          "The file name and size, then the hash",
        ],
        answer: 1,
        why: "The file never leaves the device: no upload cost, nothing to leak, nothing to store. The file name goes into a receipt only if the user wants it. The API is planned to accept exactly 32 bytes, which also limits abuse.",
      },
      fields: {
        hash: "The only thing the request carries.",
        origin: "Which log this is. A verifier needs to know whose tree heads to trust.",
        index: "Position of the entry in the append-only log.",
        tree_size: "The size of the tree head this proof is against.",
        root: "The tree head: one hash that commits to all 7 entries.",
        inclusion_proof: "Sibling hashes from the leaf up to the root. log2(7) rounded up: 3.",
        ots: "The OpenTimestamps proof, base64. It grows when Bitcoin confirms.",
      },
    },
    states: {
      short: "States",
      title: "A receipt matures: from queued to Bitcoin",
      body: "A receipt is useful at once, but it becomes independent of Muhr only when the log root reaches Bitcoin. The demo's Receipts page tracks that per receipt: queued (waiting for the hourly batch), submitted, in a calendar, retried when one calendar times out, in Bitcoin, and \"upgrade\" when Bitcoin has confirmed but the `.ots` file on this device still holds only the calendar's promise.\n\nIn the demo the calendars and blocks are simulated; the states and their wording are the planned product.",
      fields: {
        queued: "Entry is in the log; the root of the next hourly batch will include it.",
        calendar: "A calendar promised to put the root into a Bitcoin transaction.",
        retry: "One of three calendars did not answer. Two are enough; the third is retried.",
        bitcoin: "The root is in a block: the date no longer depends on Muhr.",
        upgrade: "Fetch the completed .ots so the receipt carries the full path to the block.",
      },
    },
    verify: {
      short: "Verify",
      title: "Anyone can verify, even if Muhr disappears",
      body: "The verifier needs three things: the file, the receipt, and Bitcoin block headers. It recomputes the hash, the leaf hash, walks the inclusion path to the root, and checks the `.ots` path from that root to a block header. No Muhr server is involved, so trust drops to zero parties: the date rests on Bitcoin's proof of work.\n\nChange one digit of the sample contract (6 500 000 to 6 500 001 so'm) and the check stops at step 1: a different file has a different hash. The verifier is planned in the browser, as a CLI and in a Telegram bot.",
      check: {
        q: "Five years later Muhr's servers are gone. Can a court expert still check your receipt?",
        options: [
          "No, the log must answer the query",
          "Yes, with the file, the receipt, the open ots client and Bitcoin block headers",
          "Only if a copy of the whole log was saved",
        ],
        answer: 1,
        why: "That is the main design goal in PLAN.md: \"verify without us\". The receipt carries the inclusion proof and the .ots path; Bitcoin headers are public. The log's job is to make stamping cheap and auditable, not to be asked forever.",
      },
      fields: {
        leaf: "The 0x00 prefix marks this as a leaf, not an inner node.",
        path: "Three sibling hashes, combined in the order the index dictates.",
        FAIL: "One changed byte, a completely different hash: the check ends here.",
      },
    },
    tree: {
      short: "Merkle",
      title: "RFC 9162 maths: one prefix byte and a split rule",
      body: "The log follows Certificate Transparency v2 (RFC 9162). A leaf is `SHA-256(0x00 || entry)`, an inner node `SHA-256(0x01 || left || right)`. A tree of n leaves splits at the largest power of two below n, so 7 becomes 4 + 3 and no leaf is ever duplicated.\n\nTwo proofs come out of it. An inclusion proof says \"this entry is under this head\". A consistency proof says \"the head of size 4 is a prefix of the head of size 7\": the operator only appended, never rewrote. The demo computes both for any two published heads.",
      check: {
        q: "Why hash leaves with 0x00 and nodes with 0x01, instead of plain SHA-256 everywhere?",
        options: [
          "It makes hashing faster",
          "So an inner node (64 bytes of two child hashes) can never be presented as a leaf and pass a proof",
          "Bitcoin requires it",
        ],
        answer: 1,
        why: "Without domain separation, an attacker can take two child hashes, call their concatenation an \"entry\" and get a valid-looking proof for data nobody stamped (a second-preimage trick). Different prefixes make leaf and node hashes different worlds.",
      },
      fields: {
        "0x00": "Leaf prefix (domain separation).",
        "0x01": "Inner-node prefix.",
        split: "The RFC 9162 rule; trees of odd size never copy the last leaf.",
        consistency: "Proof that an older head is contained in a newer one: append-only, checked.",
      },
    },
    anchor: {
      short: "Anchor",
      title: "Anchoring: public calendars, never our own coins",
      body: "Every hour the log's root is planned to go to at least three public OpenTimestamps calendars. A calendar collects many roots, commits to them in one Bitcoin transaction and pays the fee itself; hours later the `.ots` file can be upgraded with the path to the block header.\n\nRunning its own calendar would mean buying and holding BTC, which the non-goals forbid: no token, no custody, no crypto payments. In v1 the roots are also planned for a second, independent log (Sigstore Rekor or another), so one failing calendar or chain is not a single point of failure.",
      check: {
        q: "Why will Muhr not run its own OpenTimestamps calendar?",
        options: [
          "Calendars are closed source",
          "It would have to buy and hold BTC to pay fees, and the project rules out any custody of crypto-assets",
          "Bitcoin does not allow new calendars",
        ],
        answer: 1,
        why: "A calendar pays Bitcoin fees. Using three public calendars gives the same proof with no coins on Muhr's side, which keeps the project out of crypto-asset business, a legal and reputational line drawn in PLAN.md.",
      },
      fields: {
        calendar: "A public server that batches roots into Bitcoin transactions.",
        upgrade: "Replacing the calendar's promise with the full path to a block.",
        "no own calendar": "A non-goal written down before any code.",
        Rekor: "Sigstore's public transparency log: a second witness for the roots.",
      },
    },
    limits: {
      short: "Limits",
      title: "When, not who: the limits are part of the product",
      body: "A receipt proves that these exact bytes existed no later than the block time. It does not prove who wrote them, that the content is true, or a notarised date, and every receipt and page will say so. That honesty is a requirement (R6 in the assurance case), because a seal that is over-read does harm.\n\nTwo special cases. A short secret (an idea, a password-like text) can be guessed from its hash, so the planned salted mode hashes `salt || data` and the salt stays with the user. An EIMZO-signed `.p7s` is displayed with its signer, but marked \"not cryptographically checked\" until an open verifier for those algorithms exists.",
      fields: {
        proves: "Existence no later than a time. Nothing about authorship or truth.",
        not: "Written on every receipt, so nobody presents it as more.",
        salted: "Prefix with a random salt: the hash no longer reveals a guessable text.",
        p7s: "A PKCS#7 signature file. Shown, never claimed as verified in the MVP.",
      },
    },
    stack: {
      short: "Stack",
      title: "The planned stack, and why each piece",
      body: "The CLI is planned in Rust and calls the existing `ots` client as a separate process, so its LGPL code is never linked into Apache-2.0 code. The API is .NET 10 with PostgreSQL; the log's database role loses UPDATE and DELETE rights, so append-only is enforced below the application. The log keeps the RFC 9162 format, with Tessera as the library candidate (an open question: Tessera in Go, or an own .NET implementation).\n\nThe verifier is a static page with WebCrypto that works offline; the bot is a plain Telegram bot, not a Mini App; the receipt format is a separate spec under CC BY 4.0, and a GitHub Action (MIT) will stamp releases. An 8-week MVP plan starts with dogfooding: stamping bitg releases and wonmor.io articles.",
      fields: {
        Rust: "A small, fast CLI; ots runs as a separate process for licence hygiene.",
        PostgreSQL: "The log; append-only enforced by revoked UPDATE and DELETE rights.",
        Tessera: "A transparency-log library candidate, still an open question.",
        WebCrypto: "Hashing in the browser: the file never leaves the device.",
        spec: "An open, versioned format, so other tools can read receipts.",
      },
    },
    site: {
      short: "Site",
      title: "The live site: static files under a strict CSP",
      body: "The product is not built, but its home page is engineered like one. `site/` is plain HTML, CSS and three small scripts with self-hosted fonts: no build step, no cookies, no analytics, no third-party requests. Caddy in the `muhr-site` container serves it behind the shared edge proxy of dtwin.uz, which terminates TLS.\n\nThe CSP is `default-src 'self'` with no `unsafe-inline` at all, so even a successful injection could not run a script. Files are revalidated (`no-cache`, cheap 304s) because names are not content-hashed; fonts are cached for 30 days.",
      fields: {
        "Content-Security-Policy": "Only the site's own scripts, styles, fonts and images; no framing.",
        "Permissions-Policy": "Camera, microphone and location switched off for the page.",
        "Cache-Control": "Revalidate every time: a new deploy is seen at once.",
      },
    },
    ci: {
      short: "CI",
      title: "CI: every pull request passes the same gates",
      body: "Nothing reaches `main` without a pull request; the ruleset requires the `build` and `dco` checks, one approval and a code owner, with no bypass. The `build` job is one Ubuntu runner on Node 24 with every action pinned by commit SHA.\n\nIt runs `check-site` (broken links, inline scripts or styles, third-party origins, IP addresses, tokens, private keys), the REUSE licence check, ESLint with zero warnings, unit tests and Chromium end-to-end tests under the production CSP, a combined coverage gate (90 % lines, 80 % branches over every site script) and a smoke test of every demo screen.",
      fields: {
        "check-site": "A dependency-free Node script: what the CSP would block, and what must never be published.",
        REUSE: "Every file states its copyright and licence (SPDX), checked by reuse lint.",
        lint: "ESLint; a single warning fails the job.",
        coverage: "Browser coverage merged with unit coverage, gated in CI.",
        dco: "A separate workflow: every commit needs a Signed-off-by line.",
      },
    },
    deploy: {
      short: "Deploy",
      title: "Deploy: a key that can only publish, and an atomic swap",
      body: "A push to `main` that touches the site runs `deploy.yml`: check the site, write the commit SHA to `version.txt`, stream a tarball of `site/` and the Caddyfile over SSH. The host key is pinned. On the server the key is bound to one script with `restrict,command=`, so it cannot open a shell.\n\n`receive` checks that `version.txt` matches the SHA, rejects links and special files, validates a changed Caddyfile, moves the release to `releases/<sha>` and swaps the `current` symlink atomically: no request is dropped. CI then waits until `/version.txt` returns the SHA, smoke-tests pages, 404 and the CSP header, and on failure calls `rollback`.",
      check: {
        q: "The CI deploy key leaks. What can an attacker do with it?",
        options: [
          "Get a root shell on the server",
          "Publish or roll back a static release of this site, nothing else",
          "Change the Docker containers",
        ],
        answer: 1,
        why: "The forced command runs only `receive`, which accepts deploy, rollback and status. docker-compose.yml and the receiver itself are server-managed (bootstrap is an admin action), so CI can publish files but not change containers. Defacement stays possible, and the assurance case lists it as a residual risk.",
      },
      fields: {
        DEPLOY_HOST: "Repository secret; never printed.",
        DEPLOY_SSH_KEY: "Repository secret; deleted from the runner after the job.",
        restrict: "authorized_keys option: no shell, no forwarding, only the forced command.",
        receive: "The server-side script: deploy <sha>, rollback, status. Locked with flock.",
        "atomic swap": "ln + mv -T replaces the symlink in one step; Caddy keeps serving.",
        verify: "The live site must report the pushed SHA before the job succeeds.",
        smoke: "Real HTTP requests to the public domain after the swap.",
        rollback: "current points back to PREVIOUS; 5 releases are kept on disk.",
      },
    },
    release: {
      short: "Release",
      title: "Releases: byte-identical, with signed provenance",
      body: "A tag `v*` builds an archive of the site twice with fixed ordering, the commit time as mtime, numeric owners and `gzip -n`, then compares the two byte for byte: if the build is not reproducible, the release fails. The job writes `SHA256SUMS` and signs build provenance with Sigstore through GitHub attestations.\n\nAnyone can then check that `muhr-site-0.1.0.tar.gz` was built by this repository's workflow from a given commit, without trusting the person who uploaded it. Release notes are cut from CHANGELOG.md (Keep a Changelog format).",
      fields: {
        "byte-identical": "Two builds, one cmp: the archive depends only on the commit.",
        SHA256SUMS: "Checksums for a simple download check.",
        Sigstore: "Keyless signing tied to the workflow's identity.",
        attestation: "gh attestation verify checks who built the file and from what.",
      },
    },
    openssf: {
      short: "OpenSSF",
      title: "Evidence outside the code: OpenSSF and friends",
      body: "OpenSSF Scorecard runs every Monday and on `main` and publishes results for the README badge. The project holds the OpenSSF Best Practices badge (project 16668): passing first, then silver once GOVERNANCE.md named two independent owners, the founder and a technical maintainer. Gold needs a bus factor above one and real outside contributors, which the project does not claim yet.\n\nAround that: CodeQL and secret scanning, monthly grouped Dependabot updates, a security assurance case with a line-by-line review, Mozilla Observatory A+ and SSL Labs A+, and good first issues for newcomers.",
      fields: {
        scorecard: "Automated supply-chain checks: pinned actions, branch protection, token permissions.",
        bestpractices: "A self-assessed but public questionnaire; silver needs access continuity.",
        dependabot: "Dev dependencies only: the site itself has none.",
        headers: "External graders for the HTTP headers and the TLS setup.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "1) Muhr will prove when a file existed, never who wrote it or that it is true, and it says so on every receipt. 2) Only a 32-byte hash leaves the device. 3) An RFC 9162 log gives inclusion and consistency proofs; prefixes 0x00 and 0x01 stop a node posing as a leaf. 4) Roots go to three public OpenTimestamps calendars and into Bitcoin: no coin, no custody. 5) A receipt is verifiable with the file, the receipt and block headers, without Muhr. 6) The live site already ships like a product: strict CSP, coverage-gated CI, forced-command deploy with atomic swap, verification and rollback, reproducible releases with Sigstore provenance, OpenSSF silver. 7) Status is honest: planning, with a concept demo whose maths is real.",
    },
  },
  scenarios: {
    "smoke-flake": {
      label: "Flaky smoke test",
      steps: {
        "flake-hit": {
          short: "Rollback",
          title: "A healthy release is rolled back twice",
          body: "On 2026-11-14 two deploy runs in a row failed their smoke test. The first page returned 200, then the next request died on the runner's side: curl exit 35 (TLS handshake), then exit 56 (connection cut). The smoke test had no retry and no timeout, so the workflow treated the blip as a broken site and rolled back automatically.\n\nThe site was fine: direct requests to the server at that moment returned 200 five times out of five in about 0.02 s.",
          check: {
            q: "The rollback worked exactly as designed. What was actually wrong?",
            options: [
              "The new release was broken",
              "The check: one transient network error on the runner was read as a site failure",
              "The atomic swap",
            ],
            answer: 1,
            why: "A post-deploy check must tell \"the site is broken\" from \"my network hiccuped\". Without retries, every runner blip costs a rollback and a re-run.",
          },
          fields: {
            "exit 35": "curl could not finish the TLS handshake.",
            "exit 56": "curl failed while receiving data.",
            rollback: "Triggered because the smoke step failed after a successful ship.",
            "5 of 5": "Proof the server was healthy: the fault was on the path, not the site.",
          },
        },
        "flake-fix": {
          short: "Retry",
          title: "Retry transient errors, keep real answers",
          body: "PR #10 gave every smoke and version-check request `--retry 4 --retry-all-errors --retry-delay 3`, a 10 s connect timeout and a 30 s cap per try. A real outage still fails after the retries; a blip no longer does.\n\nThe 404 check stays without `-f`: a 404 is the expected answer there, not an error to retry. The same fix went to Sanad and Shaffof, which share the pipeline. If a run still fails on the network, `gh run rerun` is enough.",
          fields: {
            "--retry-all-errors": "Retry on connection errors too, not only on HTTP 5xx.",
            "--max-time": "Each try is capped, so a hang cannot stall the job.",
            "404": "An expected status is a result: never retried, never ignored.",
          },
        },
      },
    },
    "stale-read": {
      label: "Two files fast",
      steps: {
        race: {
          short: "Race",
          title: "The page shows the hash of the wrong file",
          body: "The line-by-line security review on 2026-11-14 found finding F5. Choose a large file and then, at once, a small one: the small one is hashed first and shown, then the large one finishes and overwrites the screen. The page now shows a hash for a file the user no longer has selected.\n\nFor a tool whose whole promise is \"this hash is this file\", a wrong hash on screen is an integrity bug (requirement R2), even with no attacker involved.",
          fields: {
            F5: "Severity low, but it touches the product's core claim.",
            overwrites: "The slower, older read finishes last and wins.",
          },
        },
        "race-fix": {
          short: "Sequence",
          title: "Tag every read, drop the stale ones",
          body: "Each hashing run takes a number from a counter. When it finishes, it compares its number with the current one; if a newer run has started, the result is thrown away. Only the last choice ever reaches the screen.\n\nAn end-to-end test now chooses two files quickly and asserts that the second hash wins. The same review also replaced every `innerHTML` in the site scripts with `textContent`.",
          fields: {
            "sequence number": "A counter shared by all reads: the newest one wins.",
            stale: "A result for an input the user already replaced.",
          },
        },
      },
    },
    "read-fail": {
      label: "Unreadable file",
      steps: {
        "stuck-hit": {
          short: "Stuck",
          title: "A file that cannot be read left the page waiting forever",
          body: "Finding F4 of the same review: the page read a chosen file with `arrayBuffer()` and handled only success. If the browser could not read it, for example because the file was moved or access was lost after it was picked, the promise was rejected with no handler.\n\nThe console got an unhandled rejection, and the label stayed at \"reading...\" with no hint that anything had gone wrong. A user could keep waiting, or trust the hash still shown from an earlier input.",
          fields: {
            "F4": "Low severity, robustness: no wrong result, but a silent failure.",
            "unhandled promise rejection": "An error nobody catches: visible only in developer tools.",
            "forever": "No timeout and no error message.",
          },
        },
        "stuck-fix": {
          short: "Fix",
          title: "The error path says what happened, in the page language",
          body: "The read now has a rejection handler. It checks the same sequence number as the race fix, so a failure of an old read cannot overwrite a newer one, and then shows \"could not read the file\" in Uzbek, Russian or English.\n\nAn end-to-end test makes `arrayBuffer()` reject on purpose and asserts three things: the message appears, the hash of the earlier text stays, and the console has no errors.",
          fields: {
            "readFail": "The UI string key; every language has its own text.",
            "could not read the file": "What the user sees instead of an endless \"reading...\".",
            "console errors": "The e2e test fails on any console error, not only on the wrong text.",
          },
        },
      },
    },
  },
};

export default text;
