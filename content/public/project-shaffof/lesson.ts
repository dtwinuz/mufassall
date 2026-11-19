import { defineLesson } from "@mufassall/scene-schema";

/**
 * Shaffof (wonmortech/shaffof, public, Apache-2.0): Merkle-sealed charity reports and a sourced zakat calculator.
 * Status on 2026-11-19: planning, no product, no partner fund. Real today: the home page shaffof.wonmor.io with a
 * WebCrypto Merkle demo (site/assets/js/merkle.js), the concept demo at wonmor.io/demo/shaffof/ (16 fictional
 * funds, real SHA-256 and RFC 9162 proofs, a concept zakat calculator in demo/zakat.js that is NOT reviewed by
 * scholars), CI, deploy with rollback, signed releases, OpenSSF. Every hash and zakat figure below was produced by
 * running the repo's own merkle.js and zakat.js on their built-in sample data.
 */
export default defineLesson({
  slug: "project-shaffof",
  level: "intermediate",
  minutes: 16,
  tier: "public",
  metrics: [
    { id: "silent", unit: "", better: "down" },
    { id: "proof", unit: "", better: "down" },
    { id: "trust", unit: "", better: "down" },
    { id: "methods", unit: "", better: "up" },
    { id: "crash", unit: "", better: "down" },
    { id: "inline", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "what",
      kind: "case",
      nodes: {
        bank: { kind: "external", at: [0, 0] },
        fund: { kind: "actor", at: [0, 4] },
        ledger: { kind: "db", at: [4, 4] },
        seal: { kind: "worker", at: [8, 4] },
        report: { kind: "service", at: [8, 8] },
      },
      edges: {
        statement: { from: "bank", to: "fund", rate: 1, mode: "async" },
        entry: { from: "fund", to: "ledger", rate: 2, mode: "call" },
        close: { from: "ledger", to: "seal", rate: 1 },
        publish: { from: "seal", to: "report", rate: 1, mode: "async" },
      },
      metrics: { silent: 0, trust: 1, crash: 0 },
      focus: ["fund", "ledger", "seal", "report"],
      exchange: {
        edge: "close",
        request: {
          format: "text",
          head: "the home-page sample ledger: a fictional fund, October 2026, so'm",
          body: "K-0001  2026-10-02  donation  in    250 000\nK-0002  2026-10-05  donation  in  1 200 000\nC-0001  2026-10-08  food      out   640 000\nK-0003  2026-10-12  donation  in     75 000\nC-0002  2026-10-15  medicine  out   410 000\nK-0004  2026-10-19  donation  in    500 000\nC-0003  2026-10-24  school    out   330 000\nC-0004  2026-10-31  fee       out     4 500",
        },
        response: {
          format: "text",
          head: "8 entries -> 1 Merkle root (WebCrypto SHA-256, RFC 9162)",
          body: "root = b1187bdb02bd2eba9838adc5839aebf96cd30b0f85d4fcdde87998998b3e1484\n-- no donor names: only number, date, category, direction, amount",
        },
        marks: ["donation", "fee", "root", "no donor names"],
      },
    },
    {
      id: "report",
      kind: "case",
      nodes: { donor: { kind: "client", at: [4, 12] } },
      edges: { open: { from: "donor", to: "report", rate: 1, mode: "call" } },
      metrics: { silent: 0 },
      focus: ["donor", "report"],
      exchange: {
        edge: "open",
        request: {
          format: "text",
          head: "the fund quietly changes one amount after publishing",
          body: "C-0001  food  out  640 000  ->  940 000",
        },
        response: {
          format: "text",
          head: "the page recomputes the root in the browser",
          body: "published root  b1187bdb...8b3e1484\ncurrent root    97fb0831...d428c9d3\nMismatch: the report changed after it was published",
        },
        marks: ["published root", "current root", "Mismatch"],
      },
    },
    {
      id: "receipt",
      kind: "case",
      metrics: { proof: 3 },
      focus: ["donor", "report"],
      exchange: {
        edge: "open",
        request: { format: "text", head: "donor: \"Is my donation in the report?\"  receipt number K-0003" },
        response: {
          format: "json",
          head: "the proof, as the demo's auditor mode shows it (real values)",
          body: `{
 "entry": { "id": "K-0003", "date": "2026-10-12", "cat": "donation", "dir": "in", "amount": 75000 },
 "proof": [
  { "hash": "9f5ce62a16c53b5208106d50520dc408631e5837bddbf6c244cfa719674757a8", "side": "L" },
  { "hash": "747e9b85143b105198fad95915b42c8bca0870b4dcae6e5496372866a6eb78e8", "side": "L" },
  { "hash": "f16a88aa5f91cddd7860d9659a7e5bebd0aa2460541a4e88f01809c5a7934593", "side": "R" }
 ],
 "root": "b1187bdb02bd2eba9838adc5839aebf96cd30b0f85d4fcdde87998998b3e1484"
}`,
        },
        marks: ["entry", "proof", "side", "root"],
      },
    },
    {
      id: "audit",
      kind: "case",
      nodes: { auditor: { kind: "client", at: [12, 12] } },
      edges: { check: { from: "auditor", to: "report", rate: 1, mode: "call" } },
      metrics: { trust: 0 },
      focus: ["auditor", "report"],
      exchange: {
        edge: "check",
        request: {
          format: "text",
          head: "README, \"Verify a proof yourself\": node verify.cjs",
          body: "const M = require('./site/assets/js/merkle.js');\nconst { entry, proof, root } = require('./proof.json');\nM.verify(entry, proof.map((p) => ({ side: p.side, hash: Buffer.from(p.hash, 'hex') })), root)",
        },
        response: {
          format: "text",
          head: "leaf 48aba4b6...ad8a2cfe -> e62d66b0... -> d891753f... -> b1187bdb...8b3e1484   included",
          body: "-- change \"amount\": 75000 to 75001 and run again: NOT included",
        },
        marks: ["merkle.js", "proof.json", "included", "NOT included"],
      },
    },
    {
      id: "console",
      kind: "case",
      focus: ["fund", "ledger"],
      exchange: {
        edge: "entry",
        request: {
          format: "text",
          head: "concept demo, fund console (login demo / demo): this month's journal",
          body: "#12  C-7K2D-Q9XA  food parcels                    - 450 000\n#13  C-M3TR-8BPL  food parcels                    - 450 000   typed twice by mistake\n#14  T-X5NC-2HVE  correction, fixes C-M3TR-8BPL    + 450 000\n-- ids are random (addEntry); no edit button, no delete button: both rows stay in the report",
        },
        response: {
          format: "text",
          head: "\"Close and seal the month\"",
          body: "all open entries -> one Merkle root -> OpenTimestamps; the sealed month accepts no new entries",
        },
        marks: ["correction", "no edit button", "seal"],
      },
    },
    {
      id: "zakat",
      kind: "case",
      nodes: { calc: { kind: "client", at: [0, 12] } },
      edges: { calcrun: { from: "donor", to: "calc", rate: 1, mode: "call" } },
      metrics: { methods: 4 },
      focus: ["donor", "calc"],
      exchange: {
        edge: "calcrun",
        request: {
          format: "text",
          head: "concept calculator (demo/zakat.js): the sample input, sample prices, silver nisab",
          body: "cash 6 500 000, bank 24 800 000, gold 12 g, worn jewellery 28 g, trade goods 9 000 000,\nreceivables 3 000 000, debts due within 12 months 7 200 000\nnisab = 595 g silver x 21 400 = 12 733 000 so'm   (sample price, not a real one)",
        },
        response: {
          format: "text",
          head: "four columns side by side, rate 2.5 %, \"no ruling, not reviewed by scholars\"",
          body: "Hanafi    jewellery counted, debts deducted   net 103 700 000   due 2 592 500\nShafi'i   jewellery exempt,  debts not deducted net 63 580 000   due 1 589 500\nMaliki    jewellery exempt,  debts deducted   net 56 380 000    due 1 409 500\nHanbali   jewellery exempt,  debts deducted   net 56 380 000    due 1 409 500",
        },
        marks: ["nisab", "Hanafi", "Shafi", "Maliki", "Hanbali"],
      },
    },
    {
      id: "encoding",
      kind: "case",
      focus: ["ledger", "seal"],
      exchange: {
        edge: "close",
        request: {
          format: "text",
          head: "serialize(entry) in site/assets/js/merkle.js",
          body: "JSON.stringify([id, date, cat, dir, amount])\n= [\"K-0003\",\"2026-10-12\",\"donation\",\"in\",75000]\nleaf = SHA-256(0x00 || those bytes) = 48aba4b661be543a646c24aecfd341b41e30165395aa90416200fa29ad8a2cfe",
        },
        response: {
          format: "text",
          head: "rejected before hashing",
          body: "a field that is not a string; an amount that is negative, fractional or above 2^53 - 1",
        },
        marks: ["dir", "amount", "0x00"],
      },
    },
    {
      id: "tree",
      kind: "case",
      focus: ["seal"],
      exchange: {
        edge: "close",
        request: {
          format: "text",
          head: "what the test suite proves about the tree (tests/unit/merkle.test.mjs)",
          body: "node = SHA-256(0x01 || left || right): an inner node offered as a leaf fails, while it passes on plain SHA-256\nsplit at the largest power of two below n: [a,b,c] and [a,b,c,c] have different roots\nempty tree = SHA-256 of nothing; roots for sizes 1 to 8 match the published RFC 6962 vectors\npath() refuses an index outside the tree; verify() refuses a side other than L or R",
        },
        marks: ["0x01", "split", "empty tree", "path"],
      },
    },
    {
      id: "seal",
      kind: "case",
      nodes: { ots: { kind: "external", at: [12, 4] } },
      edges: { anchor: { from: "seal", to: "ots", rate: 1, mode: "async" } },
      focus: ["seal", "ots", "report"],
      exchange: {
        edge: "anchor",
        request: {
          format: "json",
          head: "\"Download JSON\" on a monthly report page (concept demo)",
          body: `{
  "fund": "Mehr ko'prigi",
  "month": "2026-10",
  "root": "...",
  "rfc": "RFC 9162 leaf 0x00 / node 0x01",
  "entries": [ { "id": "K-0001", "date": "2026-10-02", "cat": "donation", "dir": "in", "amount": 250000 } ]
}`,
        },
        response: {
          format: "text",
          head: "seal timeline on the page",
          body: "month closed -> root sent to the OpenTimestamps calendar (retry on another if one fails) -> confirmed by a Bitcoin block\n-- planned through Muhr's shared core; Shaffof holds no BTC",
        },
        marks: ["fund", "month", "rfc", "entries", "Muhr"],
      },
    },
    {
      id: "limits",
      kind: "case",
      focus: ["bank", "fund", "report"],
      exchange: {
        edge: "statement",
        request: {
          format: "text",
          head: "what Shaffof will never do, written before any code (docs/PLAN.md)",
          body: "money      never collects, holds or moves it: payments use the fund's own bank account\ncrypto     no token, no crypto payments: sealing ties a hash to a time\nnames      no donor names, no rankings, no \"most generous\" table (riya is a question for scholars)\nfatwa      no rulings: the calculator ships only after a positive written scholar review\ntruth      the seal proves \"not changed since publication\", never \"true\": compare with the bank statement",
        },
        marks: ["money", "names", "fatwa", "truth"],
      },
    },
    {
      id: "stack",
      kind: "case",
      focus: ["ledger", "seal", "report"],
      exchange: {
        edge: "publish",
        request: {
          format: "text",
          head: "planned stack (docs/PLAN.md, first choice, may change)",
          body: "ledger      .NET + PostgreSQL, UPDATE and DELETE rights revoked, a fix is a reversing entry\nmerkle      RFC 9162 hashing; later a Merkle sum tree, so totals can be checked too\nanchor      Muhr's core: public OpenTimestamps calendars\ncalculator  static offline web app (PWA), stores nothing\nbot         Telegram: /zakot and receipt checks\norder       Muhr, then Sanad, then Shaffof once the scholar review is back",
        },
        marks: ["ledger", "sum tree", "calculator", "order"],
      },
    },
    {
      id: "pipeline",
      kind: "case",
      nodes: {
        bank: null,
        fund: null,
        ledger: null,
        seal: null,
        ots: null,
        auditor: null,
        calc: null,
        report: null,
        donor: null,
        site: { kind: "service", at: [8, 8] },
        gh: { kind: "external", at: [0, 0] },
        ci: { kind: "worker", at: [4, 0] },
      },
      edges: {
        pr: { from: "gh", to: "ci", rate: 1, mode: "async" },
        ship: { from: "ci", to: "site", rate: 1, mode: "async" },
      },
      focus: ["gh", "ci", "site"],
      exchange: {
        edge: "pr",
        request: {
          format: "text",
          head: "pull request -> build job; push to main -> deploy job",
          body: "check-site   links, IPs, tokens; inline script; style attributes, also in script-built markup;\n             an SVG <style> whose sha256 is missing from the CSP\ntests        unit + fast-check + Chromium e2e under the production CSP, combined coverage gate\ndeploy       version.txt -> tar | ssh forced command -> releases/<sha> -> atomic symlink -> verify -> smoke -> rollback",
        },
        marks: ["check-site", "sha256", "fast-check", "rollback"],
      },
    },
    {
      id: "release",
      kind: "case",
      nodes: { rel: { kind: "storage", at: [8, 0] } },
      edges: { publishrel: { from: "ci", to: "rel", rate: 1, mode: "async" } },
      focus: ["ci", "rel"],
      exchange: {
        edge: "publishrel",
        request: {
          format: "text",
          head: "tag v0.1.0 -> archive of the home page only, built twice, compared, signed",
          body: "cmp first second, SHA256SUMS, Sigstore provenance\ngh attestation verify shaffof-site-0.1.0.tar.gz -R wonmortech/shaffof\nOpenSSF Best Practices 16670 silver · Scorecard weekly · Observatory A+ · SSL Labs A+",
        },
        marks: ["cmp", "Sigstore", "16670"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "direction",
      from: "encoding",
      steps: [
        {
          id: "dir-gap",
          kind: "problem",
          metrics: { silent: 1 },
          focus: ["ledger", "seal"],
          exchange: {
            edge: "close",
            request: {
              format: "text",
              head: "security review 2026-11-14, finding F1: the first leaf encoding",
              body: "leaf data = id|date|cat|amount\nK-0002|2026-10-05|donation|1200000   income or spending? the direction is not in it\nturn the donation into an expense of the same amount -> same leaf, same root\n\"A|2026\" + \"x\"  and  \"A\" + \"2026|x\"  -> both A|2026|x: two entries, one encoding",
            },
            marks: ["direction", "same root", "one encoding"],
          },
        },
        {
          id: "dir-fix",
          kind: "fix",
          metrics: { silent: 0 },
          focus: ["ledger", "seal"],
          exchange: {
            edge: "close",
            request: {
              format: "text",
              head: "fix: encode the entry as a JSON array of every shown field",
              body: "[\"K-0002\",\"2026-10-05\",\"donation\",\"in\",1200000]\n-- dir is bound to the root, and JSON quoting makes the encoding injective\n-- tests: \"entry encoding\" and \"tampering is detected\"",
            },
            marks: ["dir", "injective", "tampering is detected"],
          },
        },
      ],
    },
    {
      id: "no-text",
      from: "report",
      steps: [
        {
          id: "fuzz-hit",
          kind: "problem",
          metrics: { crash: 1 },
          focus: ["donor", "report"],
          exchange: {
            edge: "open",
            request: {
              format: "text",
              head: "fast-check property test: parseAmount on random values",
              body: "counterexample: [[[{ toString: false }]]]\nString(raw) -> TypeError: Cannot convert object to primitive value\n-- the amount field threw instead of treating the value as empty",
            },
            marks: ["counterexample", "TypeError"],
          },
        },
        {
          id: "fuzz-fix",
          kind: "fix",
          metrics: { crash: 0 },
          focus: ["donor", "report"],
          exchange: {
            edge: "open",
            request: {
              format: "text",
              head: "commit 6ee4e30 (PR #11): parseAmount in demo-core.js treats a value with no text form as empty",
              body: "try { text = String(raw == null ? '' : raw); } catch (e) { text = ''; }\nregression test: parseAmount([[[{ toString: false }]]]) -> { digits: '', value: 0 }\n-- Muhr's hash comparison had the same shape and got the same fix",
            },
            marks: ["try", "regression test"],
          },
        },
      ],
    },
    {
      id: "favicon",
      from: "pipeline",
      steps: [
        {
          id: "csp-gap",
          kind: "problem",
          metrics: { inline: 1 },
          focus: ["ci", "site"],
          exchange: {
            edge: "ship",
            request: {
              format: "text",
              head: "deploy/Caddyfile before PR #23 (issue #7)",
              body: "style-src 'self' 'unsafe-inline'\n-- needed only by two style attributes in the footer\n-- trial with style-src 'self' alone: the favicon loses its stroke (its SVG <style> sets the dark-mode colours)",
            },
            marks: ["unsafe-inline", "favicon"],
          },
        },
        {
          id: "csp-fix",
          kind: "fix",
          metrics: { inline: 0 },
          focus: ["ci", "site"],
          exchange: {
            edge: "ship",
            request: {
              format: "text",
              head: "PR #23, 2026-11-14",
              body: "footer -> .foot .disc--by / .disc--note in site.css, pages regenerated\nstyle-src 'self' 'sha256-RYwkQgHwALGx47zriHLE6GtlFqcVg4KJBFOFEuM4Vng='",
            },
            response: {
              format: "text",
              head: "negative test: edit the favicon's <style>, run check-site",
              body: "site/favicon.svg: <style> is blocked by the CSP; add 'sha256-...' to style-src in deploy/Caddyfile\n-- local Chromium under the new CSP: favicon stroke rgb(30,104,80), 0 console errors",
            },
            marks: ["sha256", "check-site", "0 console errors"],
          },
        },
      ],
    },
  ],
});
