import { defineLesson } from "@mufassall/scene-schema";

/**
 * Muhr (wonmortech/muhr, public, Apache-2.0): open timestamp proofs for any file. Status on 2026-11-19:
 * planning. What exists and is shown as real: the home page muhr.wonmor.io (SHA-256 in the browser and a draft
 * receipt), the concept demo (real SHA-256 and RFC 9162 maths, simulated calendars and Bitcoin), CI, deploy with
 * rollback, reproducible signed releases and the OpenSSF work. The API, log, CLI, bot and Action are the plan in
 * docs/PLAN.md and are always called planned. Hashes below were computed with the repo's own demo/merkle.js on
 * its sample contract text, in a 7-entry log.
 */
export default defineLesson({
  slug: "project-muhr",
  level: "intermediate",
  minutes: 16,
  tier: "public",
  metrics: [
    { id: "sent", unit: "B", better: "down" },
    { id: "proof", unit: "", better: "down" },
    { id: "trust", unit: "", better: "down" },
    { id: "rolled", unit: "", better: "down" },
    { id: "wrong", unit: "", better: "down" },
    { id: "stuck", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "what",
      kind: "case",
      nodes: {
        device: { kind: "client", at: [0, 5] },
        api: { kind: "service", at: [4, 5] },
        log: { kind: "db", at: [8, 5] },
      },
      edges: {
        stamp: { from: "device", to: "api", rate: 1, mode: "call" },
        append: { from: "api", to: "log", rate: 1 },
      },
      metrics: { sent: 0, wrong: 0, stuck: 0 },
      focus: ["device"],
      exchange: {
        edge: "stamp",
        request: {
          format: "text",
          head: "muhr.wonmor.io, in the browser: Ijara-shartnomasi-Chilonzor-14.txt (sample)",
          body: "WebCrypto SHA-256 on this device, nothing is uploaded\nsha-256 = 4645e2043f012f0bbd624bfefa5d2868400b6cde0270f43b107fa01fc6560690",
        },
        response: {
          format: "json",
          head: "draft receipt drawn by the page (site/assets/core.js)",
          body: `{
  "muhr": "0-draft",
  "hash": { "alg": "sha-256", "value": "4645e204...6560690" },
  "log": { "type": "rfc9162", "status": "soon" },
  "anchors": [ { "type": "opentimestamps", "status": "soon" } ],
  "created_local": "2026-11-19T10:42:00"
}`,
        },
        marks: ["WebCrypto", "muhr", "hash", "log", "anchors", "created_local"],
      },
    },
    {
      id: "stamp",
      kind: "case",
      metrics: { sent: 32, proof: 3, trust: 1 },
      focus: ["device", "api", "log"],
      exchange: {
        edge: "stamp",
        request: {
          format: "json",
          head: "POST /stamp   (planned API, docs/PLAN.md)",
          body: `{ "hash": "4645e2043f012f0bbd624bfefa5d2868400b6cde0270f43b107fa01fc6560690" }`,
        },
        response: {
          format: "json",
          head: "receipt.muhr.json, v0 draft (concept demo)",
          body: `{
  "muhr": "0-draft",
  "hash": { "alg": "sha-256", "value": "4645e204...6560690" },
  "log": {
    "type": "rfc9162",
    "origin": "demo.muhr.example/log",
    "index": 5,
    "tree_size": 7,
    "root": "e6208de09de6...2cef8d3100ca0c3f",
    "inclusion_proof": ["9a33cea5...4f877983", "af37d92e...6e34b35c96", "83a15238...b6b68a8c"]
  },
  "anchors": [{ "type": "opentimestamps", "status": "pending", "ots": "AE9wZW5UaW1lc3RhbXBz..." }]
}`,
        },
        marks: ["hash", "origin", "index", "tree_size", "root", "inclusion_proof", "ots"],
      },
    },
    {
      id: "states",
      kind: "case",
      nodes: {
        ots: { kind: "external", at: [12, 5] },
        btc: { kind: "external", at: [12, 9] },
      },
      edges: {
        anchor: { from: "log", to: "ots", rate: 1, mode: "async" },
        block: { from: "ots", to: "btc", rate: 1, mode: "async" },
      },
      focus: ["log", "ots", "btc"],
      exchange: {
        edge: "anchor",
        request: {
          format: "text",
          head: "receipt states on the demo's Receipts page (demo/app.js)",
          body: "queued     in the log; its root goes out with the next hourly batch\nsubmitted  the root was just sent to 3 calendars\ncalendar   calendars accepted it, waiting for a Bitcoin block (usually 1-4 h)\nretry      one calendar did not answer; resent, the other two accepted\nbitcoin    the log root is confirmed by a Bitcoin block\nupgrade    Bitcoin has it, but the .ots on this device is still the old one",
        },
        marks: ["queued", "calendar", "retry", "bitcoin", "upgrade"],
      },
    },
    {
      id: "verify",
      kind: "case",
      nodes: { verifier: { kind: "client", at: [6, 10] } },
      edges: {
        give: { from: "device", to: "verifier", rate: 1, mode: "async" },
        headers: { from: "verifier", to: "btc", rate: 1, mode: "call" },
      },
      metrics: { trust: 0 },
      focus: ["device", "verifier", "btc"],
      exchange: {
        edge: "give",
        request: {
          format: "text",
          head: "offline check: the file + receipt.muhr.json + a Bitcoin block header",
          body: "1  sha-256(file)              = 4645e204...6560690   equals hash.value\n2  leaf = sha-256(0x00 || h)   = ba47f0db...8af64d31\n3  path: index 5 of 7, 3 sibling hashes  -> e6208de0...0ca0c3f   equals log.root\n4  .ots: root -> calendar -> Bitcoin block header (simulated in the demo)",
        },
        response: {
          format: "text",
          head: "the same file with one digit changed: 6 500 000 -> 6 500 001 so'm",
          body: "1  sha-256(file) = 543e9e48...324e736b   FAIL at step 1, nothing else is checked",
        },
        marks: ["leaf", "path", "FAIL"],
      },
    },
    {
      id: "tree",
      kind: "case",
      focus: ["api", "log"],
      exchange: {
        edge: "append",
        request: {
          format: "text",
          head: "RFC 9162 maths in demo/merkle.js",
          body: "leaf hash = SHA-256(0x00 || entry)\nnode hash = SHA-256(0x01 || left || right)\nsplit at the largest power of two below n: 7 -> 4 + 3, the last leaf is never copied\ntree head, size 4: 83a15238...b6b68a8c\ntree head, size 7: e6208de0...0ca0c3f",
        },
        response: {
          format: "text",
          head: "consistency proof 4 -> 7: [e8eebad4...0970c4944]",
          body: "verifyConsistency(4, 7, head4, head7, proof) = true\n-- the first 4 entries are still inside the 7-entry tree: nothing was rewritten",
        },
        marks: ["0x00", "0x01", "split", "consistency"],
      },
    },
    {
      id: "anchor",
      kind: "case",
      focus: ["log", "ots", "btc"],
      exchange: {
        edge: "block",
        request: {
          format: "text",
          head: "planned: every hour the log root goes to at least 3 public OpenTimestamps calendars",
          body: "calendar   aggregates many roots into one Bitcoin transaction, pays the fee itself\nupgrade    hours later the .ots gains the path to a block header\nno own calendar: that would mean buying and holding BTC\nv1: roots also go to a second log (Sigstore Rekor or another)",
        },
        marks: ["calendar", "upgrade", "no own calendar", "Rekor"],
      },
    },
    {
      id: "limits",
      kind: "case",
      focus: ["device", "verifier"],
      exchange: {
        edge: "give",
        request: {
          format: "text",
          head: "what a receipt proves, and what it never will",
          body: "proves   these exact bytes existed no later than the block time\nnot      who wrote them, that the content is true, a notarised date\nsalted   short secrets: sha-256(salt || data); the salt stays with you\np7s      an EIMZO signature is shown and marked \"not cryptographically checked\"",
        },
        marks: ["proves", "not", "salted", "p7s"],
      },
    },
    {
      id: "stack",
      kind: "case",
      focus: ["api", "log"],
      exchange: {
        edge: "append",
        request: {
          format: "text",
          head: "planned stack (docs/PLAN.md), each part with its reason",
          body: "CLI        Rust; calls the ots client as a separate process, so LGPL code is never linked\nAPI        .NET 10 + PostgreSQL; the log role has no UPDATE or DELETE rights\nlog        RFC 9162 format; library candidate: Tessera\nverifier   static HTML + WebCrypto, works offline\nbot        a plain Telegram bot, not a Mini App\nspec       .muhr.json under CC BY 4.0; muhr-action under MIT",
        },
        marks: ["Rust", "PostgreSQL", "Tessera", "WebCrypto", "spec"],
      },
    },
    {
      id: "site",
      kind: "case",
      nodes: {
        api: null,
        log: null,
        ots: null,
        btc: null,
        verifier: null,
        site: { kind: "service", at: [8, 5] },
      },
      edges: { visit: { from: "device", to: "site", rate: 2, mode: "call" } },
      focus: ["device", "site"],
      exchange: {
        edge: "visit",
        request: { format: "http", head: "GET / HTTP/1.1", headers: [["Host", "muhr.wonmor.io"]] },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [
            [
              "Content-Security-Policy",
              "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; frame-ancestors 'none'; object-src 'none'",
            ],
            ["Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()"],
            ["Cache-Control", "no-cache"],
            ["X-Content-Type-Options", "nosniff"],
            ["Cross-Origin-Opener-Policy", "same-origin"],
          ],
        },
        marks: ["Content-Security-Policy", "Permissions-Policy", "Cache-Control"],
      },
    },
    {
      id: "ci",
      kind: "case",
      nodes: {
        gh: { kind: "external", at: [0, 0] },
        ci: { kind: "worker", at: [4, 0] },
      },
      edges: { pr: { from: "gh", to: "ci", rate: 1, mode: "async" } },
      focus: ["gh", "ci"],
      exchange: {
        edge: "pr",
        request: {
          format: "text",
          head: "pull request -> required checks: build, dco, 1 approval, code owner",
          body: "check-site   broken links, inline <script>, style=, <style>, third-party origins, IPs, tokens\nREUSE        every file carries SPDX copyright and licence\nlint         ESLint, --max-warnings 0\ntest         unit + Chromium e2e, combined coverage gate 90 % lines, 80 % branches\ndemo smoke   every demo screen under the production CSP, 0 console errors\ndco          every commit has Signed-off-by",
        },
        marks: ["check-site", "REUSE", "lint", "coverage", "dco"],
      },
    },
    {
      id: "deploy",
      kind: "case",
      edges: { ship: { from: "ci", to: "site", rate: 1, mode: "async" } },
      focus: ["ci", "site"],
      exchange: {
        edge: "ship",
        request: {
          format: "text",
          head: "push to main -> deploy.yml: tar site + Caddyfile | ssh ... \"deploy $GITHUB_SHA\"",
          headers: [
            ["DEPLOY_HOST", "***"],
            ["DEPLOY_SSH_KEY", "***"],
          ],
          body: "authorized_keys: restrict,command=\".../bin/receive\"   the key can run nothing else\nreceive: version.txt == sha?  no links or special files?  Caddyfile valid?\nmv site releases/<sha>; ln -sfn + mv -T releases/current   (atomic swap, keep 5)",
        },
        response: {
          format: "text",
          head: "receive prints: live: <40-char sha>",
          body: "verify   /version.txt returns the pushed sha (20 tries)\nsmoke    / /en/ /ru/ /robots.txt /sitemap.xml /favicon.svg = 200, unknown path = 404, CSP header present\nfailure  -> ssh ... rollback: current points back to PREVIOUS",
        },
        marks: ["restrict", "receive", "atomic swap", "verify", "smoke", "rollback"],
        masked: ["DEPLOY_HOST", "DEPLOY_SSH_KEY"],
      },
    },
    {
      id: "release",
      kind: "case",
      nodes: { rel: { kind: "storage", at: [8, 0] } },
      edges: { publish: { from: "ci", to: "rel", rate: 1, mode: "async" } },
      focus: ["ci", "rel"],
      exchange: {
        edge: "publish",
        request: {
          format: "text",
          head: "tag v0.1.0 -> release.yml",
          body: "tar --sort=name --mtime=@<commit time> --owner=0 --group=0 ... | gzip -n -9   (built twice)\ncmp first second   -> byte-identical, or the job fails\nsha256sum > SHA256SUMS\nattest-build-provenance   Sigstore-signed provenance, bundle .intoto.jsonl",
        },
        response: {
          format: "text",
          head: "anyone, later:",
          body: "gh attestation verify muhr-site-0.1.0.tar.gz -R wonmortech/muhr\nsha256sum -c SHA256SUMS",
        },
        marks: ["byte-identical", "SHA256SUMS", "Sigstore", "attestation"],
      },
    },
    {
      id: "openssf",
      kind: "case",
      focus: ["gh", "ci", "site"],
      exchange: {
        edge: "pr",
        request: {
          format: "text",
          head: "the evidence trail outside the code",
          body: "scorecard     OpenSSF Scorecard every Monday 04:23 UTC and on main, SARIF to code scanning\nbestpractices project 16668: passing, then silver after GOVERNANCE named two independent owners\ndependabot    monthly, grouped npm updates\nheaders       Mozilla Observatory A+, SSL Labs A+\nissues        good first issue #13-#16 for outside contributors",
        },
        marks: ["scorecard", "bestpractices", "dependabot", "headers"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "smoke-flake",
      from: "deploy",
      steps: [
        {
          id: "flake-hit",
          kind: "problem",
          edges: { ship: { flow: "fail" } },
          metrics: { rolled: 2 },
          focus: ["ci", "site"],
          exchange: {
            edge: "ship",
            request: {
              format: "text",
              head: "two deploy runs in a row, 2026-11-14",
              body: "run 1   200 /    then GET /en/: TLS handshake cut   -> curl exit 35 -> smoke failed -> rollback\nrun 2   200 /    then the reply was cut mid-way    -> curl exit 56 -> smoke failed -> rollback\n-- no retry, no timeout: one hiccup of the runner's network failed a good release\n-- the same moment, straight to the server: 5 of 5 requests 200 in about 0.02 s",
            },
            marks: ["exit 35", "exit 56", "rollback", "5 of 5"],
          },
        },
        {
          id: "flake-fix",
          kind: "fix",
          edges: { ship: { flow: "request" } },
          metrics: { rolled: 0 },
          focus: ["ci", "site"],
          exchange: {
            edge: "ship",
            request: {
              format: "text",
              head: "PR #10: ci: retry smoke-test requests on transient network errors",
              body: "- curl -s -o /dev/null -w '%{http_code}' \"$SITE$p\"\n+ curl -s --retry 4 --retry-all-errors --retry-delay 3 --connect-timeout 10 --max-time 30 ...\n-- the 404 check keeps no -f: a 404 answer is a result, not a reason to retry",
            },
            marks: ["--retry-all-errors", "--max-time", "404"],
          },
        },
      ],
    },
    {
      id: "stale-read",
      from: "what",
      steps: [
        {
          id: "race",
          kind: "problem",
          metrics: { wrong: 1 },
          focus: ["device"],
          exchange: {
            edge: "stamp",
            request: {
              format: "text",
              head: "security review 2026-11-14, finding F5",
              body: "pick contract.pdf (big), then at once notes.txt (small)\nnotes.txt is read first -> its hash is shown\ncontract.pdf finishes later -> overwrites the screen\n-- the page now shows the hash of a file the user no longer selected",
            },
            marks: ["F5", "overwrites"],
          },
        },
        {
          id: "race-fix",
          kind: "fix",
          metrics: { wrong: 0 },
          focus: ["device"],
          exchange: {
            edge: "stamp",
            request: {
              format: "text",
              head: "fix: every read carries a sequence number",
              body: "var my = ++seq\nwindow.Muhr.sha256(bytesNow()).then(function (h) { if (my !== seq) return; ... paintReceipt(h) })\n-- a stale read is dropped; e2e: \"only the last of two quickly chosen files is used\"",
            },
            marks: ["sequence number", "stale"],
          },
        },
      ],
    },
    {
      id: "read-fail",
      from: "what",
      steps: [
        {
          id: "stuck-hit",
          kind: "problem",
          edges: { stamp: { flow: "fail" } },
          metrics: { stuck: 1 },
          focus: ["device"],
          exchange: {
            edge: "stamp",
            request: {
              format: "text",
              head: "security review 2026-11-14, finding F4: a file the browser cannot read",
              body: "file.arrayBuffer() -> rejected (e.g. NotReadableError: the file was moved after it was picked)\nno rejection handler -> unhandled promise rejection in the console\nlabel: gone.pdf · reading...   (forever)",
            },
            marks: ["F4", "unhandled promise rejection", "forever"],
          },
        },
        {
          id: "stuck-fix",
          kind: "fix",
          metrics: { stuck: 0 },
          focus: ["device"],
          exchange: {
            edge: "stamp",
            request: {
              format: "text",
              head: "fix in site/assets/app.js: the read has an error path too",
              body: "f.arrayBuffer().then(ok, function () {\n  if (my !== fileSeq) return\n  fname.textContent = f.name + ' · ' + T.readFail\n})",
            },
            response: {
              format: "text",
              head: "e2e: \"a file that cannot be read says so and keeps the previous hash\"",
              body: "gone.pdf · could not read the file\nhash of the earlier text stays on screen, console errors: []",
            },
            marks: ["readFail", "could not read the file", "console errors"],
          },
        },
      ],
    },
  ],
});
