import { defineLesson } from "@mufassall/scene-schema";

/**
 * Sanad (wonmortech/sanad, public, Apache-2.0): certificates and badges as W3C Verifiable Credentials 2.0
 * (Open Badges 3.0 compatible), verified offline. Status on 2026-11-19: planning. Real today: the home page
 * sanad.wonmor.io with an in-browser Ed25519 demo (site/assets/js/sanad-core.js), the concept demo at
 * wonmor.io/demo/sanad/ (real WebCrypto signatures; did:web, status server, PDF/QR and bot simulated), CI,
 * deploy with rollback, reproducible signed releases, OpenSSF. The credential JSON and verdicts below were
 * produced by running the repo's own sanad-core.js in Node 26 (Ed25519); keys are fresh on every run.
 */
export default defineLesson({
  slug: "project-sanad",
  level: "intermediate",
  minutes: 16,
  tier: "public",
  metrics: [
    { id: "forged", unit: "", better: "down" },
    { id: "net", unit: "", better: "down" },
    { id: "revoked", unit: "", better: "down" },
    { id: "rows", unit: "", better: "up" },
    { id: "inline", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "what",
      kind: "case",
      nodes: {
        issuer: { kind: "service", at: [4, 4] },
        holder: { kind: "client", at: [8, 4] },
        verifier: { kind: "client", at: [8, 8] },
      },
      edges: {
        deliver: { from: "issuer", to: "holder", rate: 1, mode: "async" },
        show: { from: "holder", to: "verifier", rate: 1, mode: "async" },
      },
      metrics: { forged: 0, net: 0 },
      focus: ["issuer", "holder", "verifier"],
      exchange: {
        edge: "deliver",
        request: {
          format: "json",
          head: "a signed credential from the home-page demo (sanad-core.js, Ed25519)",
          body: `{
  "@context": ["https://www.w3.org/ns/credentials/v2", "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json"],
  "type": ["VerifiableCredential", "OpenBadgeCredential"],
  "issuer": { "id": "did:web:markaz.example", "type": ["Profile"], "name": "Sample Training Centre" },
  "validFrom": "2026-10-30T00:00:00Z",
  "credentialSubject": {
    "type": ["AchievementSubject"], "name": "Sample Student",
    "achievement": { "type": ["Achievement"], "name": "Python fundamentals",
      "criteria": { "narrative": "72-hour course and a final project" } }
  },
  "credentialStatus": { "type": "BitstringStatusListEntry", "statusPurpose": "revocation",
    "statusListIndex": "7", "statusListCredential": "https://markaz.example/status/1" },
  "proof": {
    "type": "DataIntegrityProof",
    "cryptosuite": "eddsa-jcs-2022 (demo)",
    "created": "2026-10-30T09:00:00Z",
    "verificationMethod": "did:web:markaz.example#key-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "u54busEn3OOzFT6_xuDI6VfZlGkNUjvhGs0cZNJyCF5r0BuLOgRfmWflaPgcwJZv70sa9swCx_XvVA9DWmzDrCQ"
  }
}`,
        },
        marks: ["issuer", "validFrom", "credentialSubject", "credentialStatus", "proof", "verificationMethod", "proofValue"],
      },
    },
    {
      id: "issue",
      kind: "case",
      nodes: {
        centre: { kind: "actor", at: [0, 4] },
        keys: { kind: "storage", at: [4, 0] },
      },
      edges: {
        upload: { from: "centre", to: "issuer", rate: 1, mode: "call" },
        sign: { from: "issuer", to: "keys", rate: 2, mode: "call" },
      },
      metrics: { rows: 8 },
      focus: ["centre", "issuer", "keys"],
      exchange: {
        edge: "upload",
        request: {
          format: "text",
          head: "concept demo, Issue page: the sample CSV (12 rows, errors on purpose)",
          body: "ism,kurs,sana,baho\nMadina Yusupova,python,<2 days ago>,a'lo\n,python,<2 days ago>,a'lo\nBehruz Rahimov,pyton,<2 days ago>,yaxshi\nLaylo Qodirova,python,2026-13-40,a'lo\nJavlon Xolmatov,python,<in 9 days>,yaxshi\n... 7 more valid rows",
        },
        response: {
          format: "text",
          head: "preview: 8 ready, 4 rejected -> button \"8 tasini imzolash\" (sign 8)",
          body: "line 7   ism yo'q                (no name)\nline 8   kurs topilmadi: pyton   (unknown course id)\nline 9   sana noto'g'ri           (impossible date)\nline 12  sana kelajakda           (date in the future)\n-- each valid row: one credential, a status-list bit, key did:web:ilmyoli.example#key-1",
        },
        marks: ["ism", "kurs", "sana", "baho", "8 ready", "status-list bit"],
      },
    },
    {
      id: "hold",
      kind: "case",
      focus: ["holder"],
      exchange: {
        edge: "show",
        request: {
          format: "text",
          head: "what the graduate keeps (docs/PLAN.md)",
          body: "PDF       printable certificate, no coat of arms, no word \"diploma\"\nQR        the credential itself; if it does not fit, the VC is attached to the PDF and the QR holds its hash\nfile      the same JSON, for any VC 2.0 verifier\naccount   none: nothing to log into, nothing that expires with a website",
        },
        marks: ["PDF", "QR", "file", "account"],
      },
    },
    {
      id: "verify",
      kind: "case",
      nodes: {
        didweb: { kind: "external", at: [12, 4] },
        status: { kind: "storage", at: [12, 8] },
      },
      edges: {
        resolve: { from: "verifier", to: "didweb", rate: 1, mode: "call" },
        lookup: { from: "verifier", to: "status", rate: 1, mode: "call" },
      },
      metrics: { net: 1 },
      focus: ["holder", "verifier", "didweb", "status"],
      exchange: {
        edge: "show",
        request: {
          format: "text",
          head: "employer sends a photo of the QR to the bot, or opens the web verifier",
          body: "1 format         W3C VC 2.0 · OpenBadgeCredential\n2 canonical      701 bytes · sha-256 583889cc...1c64754\n3 signature      Ed25519 matches · did:web:markaz.example#key-1   (key from the local cache)\n4 trusted list   did:web:markaz.example is on it\n5 validity       from 2026-10-30, no end date\n6 revocation     status list bit #7 = 0   (the only online step, optional)",
        },
        response: { format: "text", head: "Genuine: signature matches, issuer known, not revoked" },
        marks: ["canonical", "signature", "trusted list", "revocation", "Genuine"],
      },
    },
    {
      id: "sign",
      kind: "case",
      focus: ["issuer", "keys"],
      exchange: {
        edge: "sign",
        request: {
          format: "text",
          head: "the bytes that are signed (sanad-core.js, modelled on eddsa-jcs-2022)",
          body: "canon(x)  = JSON with sorted keys, no whitespace; undefined, NaN, functions are rejected\noptions   = proof without proofValue  (type, cryptosuite, created, verificationMethod, proofPurpose)\ninput     = SHA-256(canon(options)) || SHA-256(canon(credential without proof))   64 bytes\nsig       = Ed25519(issuer private key, input)   (ECDSA P-256 if the browser lacks Ed25519)",
        },
        response: {
          format: "text",
          head: "proofValue = \"u\" + base64url(sig)",
          body: "u = multibase prefix for base64url without padding; a verifier refuses anything else",
        },
        marks: ["canon", "options", "input", "Ed25519", "multibase"],
      },
    },
    {
      id: "trust",
      kind: "case",
      focus: ["verifier", "didweb"],
      exchange: {
        edge: "resolve",
        request: {
          format: "json",
          head: "a forger signs a copy with its own key, under a lookalike domain",
          body: `{
  "issuer": { "id": "did:web:rnarkaz.example", "name": "Sample Training Centre" },
  "proof": { "verificationMethod": "did:web:rnarkaz.example#key-1" }
}`,
        },
        response: {
          format: "json",
          head: "verify() result, real run",
          body: `{ "sigOk": true, "trusted": false, "verdict": "fake" }`,
        },
        marks: ["id", "name", "sigOk", "trusted", "verdict"],
      },
    },
    {
      id: "revoke",
      kind: "case",
      edges: { publish: { from: "issuer", to: "status", rate: 1, mode: "async" } },
      metrics: { revoked: 0 },
      focus: ["issuer", "status", "verifier"],
      exchange: {
        edge: "lookup",
        request: {
          format: "json",
          head: "credentialStatus in the certificate -> GET https://markaz.example/status/1",
          body: `{ "statusPurpose": "revocation", "statusListIndex": "7" }`,
        },
        response: {
          format: "text",
          head: "Bitstring Status List: 131 072 bits, about 16 KB compressed, the whole list at once",
          body: "bit #7 = 1 -> Revoked: the signature is still genuine, the issuer withdrew it\n-- the verifier downloads all bits, so the issuer cannot tell which certificate was checked\n-- a malformed or unknown index counts as revoked (fail closed)",
        },
        marks: ["statusPurpose", "statusListIndex", "Revoked", "fail closed"],
      },
    },
    {
      id: "keys",
      kind: "case",
      edges: { didpub: { from: "issuer", to: "didweb", rate: 1, mode: "async" } },
      focus: ["issuer", "keys", "didweb"],
      exchange: {
        edge: "didpub",
        request: {
          format: "json",
          head: "https://ilmyoli.example/.well-known/did.json after one rotation (concept demo)",
          body: `{
  "id": "did:web:ilmyoli.example",
  "verificationMethod": [
    { "id": "did:web:ilmyoli.example#key-0", "type": "Multikey", "publicKeyMultibase": "z6Mk...(demo)" },
    { "id": "did:web:ilmyoli.example#key-1", "type": "Multikey", "publicKeyMultibase": "z6Mk...(demo)" }
  ],
  "assertionMethod": ["did:web:ilmyoli.example#key-1"]
}`,
        },
        marks: ["verificationMethod", "publicKeyMultibase", "assertionMethod"],
      },
    },
    {
      id: "stack",
      kind: "case",
      focus: ["issuer", "keys"],
      exchange: {
        edge: "sign",
        request: {
          format: "text",
          head: "planned stack (docs/PLAN.md) and the reason for each piece",
          body: "standards  VC 2.0, Data Integrity, Bitstring Status List, Open Badges 3.0: valid without Sanad\nissuer     .NET 10 API; walt.id (Apache-2.0, Docker REST) or digitalbazaar/vc (BSD-3) in the browser\nkeys       OpenBao: the private key never leaves it; rotation and revocation from a small panel\nidentity   did:web: the key sits on the centre's own domain\nbot        Telegram, reads the QR from a photo, uz / ru / en\nanchor     issue date sealed through Muhr, optional",
        },
        marks: ["standards", "walt.id", "OpenBao", "did:web", "anchor"],
      },
    },
    {
      id: "site",
      kind: "case",
      nodes: {
        centre: null,
        issuer: null,
        keys: null,
        holder: null,
        didweb: null,
        status: null,
        site: { kind: "service", at: [8, 4] },
      },
      edges: { visit: { from: "verifier", to: "site", rate: 2, mode: "call" } },
      focus: ["verifier", "site"],
      exchange: {
        edge: "visit",
        request: { format: "http", head: "GET / HTTP/1.1", headers: [["Host", "sanad.wonmor.io"]] },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [
            [
              "Content-Security-Policy",
              "default-src 'self'; script-src 'self'; style-src 'self' 'sha256-y8K55UD19BmUb/68u/uDinnnnZwD4JjBVgr61zWsTLw='; img-src 'self' data:; frame-ancestors 'none'",
            ],
            ["Cache-Control", "no-cache"],
            ["X-Content-Type-Options", "nosniff"],
          ],
        },
        marks: ["Content-Security-Policy", "Cache-Control"],
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
          head: "pull request -> build job (Ubuntu, Node 24, actions pinned by SHA)",
          body: "check-site   links, inline script or style, third-party origins, IPs, tokens\nREUSE        SPDX header in every file\nlint         ESLint, warnings fail\ntest         unit + fast-check properties + Chromium e2e, incl. no WebCrypto and no Ed25519\ncoverage     every site/**/*.js: 90 % lines and functions, 80 % branches\ndemo smoke   21 concept-demo checks under the production CSP",
        },
        marks: ["check-site", "fast-check", "coverage", "demo smoke"],
      },
    },
    {
      id: "deploy",
      kind: "case",
      nodes: { rel: { kind: "storage", at: [8, 0] } },
      edges: {
        ship: { from: "ci", to: "site", rate: 1, mode: "async" },
        publishrel: { from: "ci", to: "rel", rate: 1, mode: "async" },
      },
      focus: ["ci", "site", "rel"],
      exchange: {
        edge: "ship",
        request: {
          format: "text",
          head: "push to main: the same pipeline as Muhr and Shaffof",
          headers: [["DEPLOY_SSH_KEY", "***"]],
          body: "check-site -> version.txt = sha -> tar | ssh (forced command: receive)\nreceive: releases/<sha>, atomic symlink swap, keep 5\nverify /version.txt, smoke pages + 404 + CSP header, else rollback\ntag v*: archive built twice + cmp, SHA256SUMS, Sigstore provenance",
        },
        response: { format: "text", head: "gh attestation verify sanad-site-0.1.0.tar.gz -R wonmortech/sanad" },
        marks: ["receive", "atomic symlink swap", "rollback", "Sigstore"],
        masked: ["DEPLOY_SSH_KEY"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "unsigned-options",
      from: "sign",
      steps: [
        {
          id: "opt-gap",
          kind: "problem",
          metrics: { forged: 1 },
          focus: ["issuer", "verifier"],
          exchange: {
            edge: "show",
            request: {
              format: "json",
              head: "security review 2026-11-14, finding 1: the first demo signed only the credential",
              body: `{
  "proof": {
    "created": "2019-01-01T00:00:00Z",
    "verificationMethod": "did:web:markaz.example#key-1",
    "proofValue": "u54busEn3OOz..."
  }
}`,
            },
            response: { format: "text", head: "verdict: Genuine   (created was edited, the signature did not cover it)" },
            marks: ["created", "proofValue", "Genuine"],
          },
        },
        {
          id: "opt-fix",
          kind: "fix",
          metrics: { forged: 0 },
          focus: ["issuer", "verifier"],
          exchange: {
            edge: "show",
            request: {
              format: "text",
              head: "fix: the proof options are signed too",
              body: "input = SHA-256(canon(proof minus proofValue)) || SHA-256(canon(credential))\nverifier also requires type = DataIntegrityProof and proofPurpose = assertionMethod\n-- edit created, cryptosuite or the key id: verdict Forged",
            },
            marks: ["proof minus proofValue", "proofPurpose", "Forged"],
          },
        },
      ],
    },
    {
      id: "fail-open",
      from: "revoke",
      steps: [
        {
          id: "open-hole",
          kind: "problem",
          metrics: { revoked: 1 },
          edges: { lookup: { flow: "fail" } },
          focus: ["verifier", "status"],
          exchange: {
            edge: "lookup",
            request: {
              format: "json",
              head: "security review, finding 4: the revocation lookup failed open",
              body: `{ "statusListIndex": "7abc" }`,
            },
            response: {
              format: "text",
              head: "parseInt(\"7abc\") = 7; an index missing from the list meant \"not revoked\"",
              body: "-- a typo, a truncated list or an index past the end: the certificate passes",
            },
            marks: ["statusListIndex", "parseInt", "not revoked"],
          },
        },
        {
          id: "open-fix",
          kind: "fix",
          metrics: { revoked: 0 },
          edges: { lookup: { flow: "request" } },
          focus: ["verifier", "status"],
          exchange: {
            edge: "lookup",
            request: {
              format: "text",
              head: "isRevoked(statusBits, status): fail closed",
              body: "if (typeof i !== 'string' || !/^(0|[1-9][0-9]*)$/.test(i) || !has(statusBits, i)) return true;\nreturn statusBits[i] !== 0;\n-- only a plain decimal index present in the list can say \"not revoked\"",
            },
            marks: ["fail closed", "return true"],
          },
        },
      ],
    },
    {
      id: "inline-style",
      from: "site",
      steps: [
        {
          id: "style-gap",
          kind: "problem",
          metrics: { inline: 1 },
          focus: ["verifier", "site"],
          exchange: {
            edge: "visit",
            request: {
              format: "text",
              head: "deploy/Caddyfile before PR #22 (issue #7, a residual risk in docs/ASSURANCE.md)",
              body: "style-src 'self' 'unsafe-inline'\n-- needed by 5 style attributes on each home page\n-- and by sanad-core.js, which built the step icon with style=\"position:absolute\"",
            },
            response: {
              format: "text",
              head: "trial: the strict CSP with the old sanad-core.js",
              body: "5 console errors per page: refused to apply inline style\n-- tighten the header first and the demo breaks",
            },
            marks: ["unsafe-inline", "sanad-core.js", "5 console errors"],
          },
        },
        {
          id: "style-fix",
          kind: "fix",
          metrics: { inline: 0 },
          focus: ["verifier", "site"],
          exchange: {
            edge: "visit",
            request: {
              format: "text",
              head: "PR #22 and #23, 2026-11-14",
              body: "style attributes -> classes in sanad.css (.traveller, .src--meta, .steps .st .i-x ...)\nstyle-src 'self' 'sha256-y8K55UD19BmUb/68u/uDinnnnZwD4JjBVgr61zWsTLw='   (favicon <style>)\ncheck-site fails on: a style attribute or <style> in a page, style in script-built markup,\nsetAttribute('style', ...), an SVG <style> whose hash is not in the CSP",
            },
            response: {
              format: "text",
              head: "proof in the PR",
              body: "computed styles before and after: identical on /, /en/, /ru/\nconsole under the new CSP: 0 errors; 43 unit + 29 e2e + coverage gate: pass\ncheck-site against the old sanad-core.js: fails, as it should",
            },
            marks: ["sha256", "check-site", "0 errors"],
          },
        },
      ],
    },
  ],
});
