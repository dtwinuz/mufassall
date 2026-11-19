import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Project: Sanad, certificates that carry their own signature",
  summary:
    "Sanad is a Wonmor open-source project for course certificates, badges and references issued as W3C Verifiable Credentials 2.0 (Open Badges 3.0 compatible) and checked offline, through a Telegram bot or a web page. A QR code is only an address; a signature is proof wherever it is checked. Sanad is in planning: the home page has a real Ed25519 demo, a concept demo shows the issuer console and the verifier, and the pipeline already ships with tests, rollback and signed releases. This lesson covers the journeys of the centre, the graduate and the employer, the cryptography, and the pipeline.",
  learn: [
    "Why a QR code pointing to a \"verification site\" proves nothing, and what a signed credential changes",
    "The credential JSON: issuer, subject, status entry and a Data Integrity proof, and exactly which bytes are signed",
    "Offline verification: canonical form, Ed25519, a cached did:web key, a trust list against lookalike domains, revocation through a Bitstring Status List",
    "Key rotation, fail-closed checks, and the static-site pipeline shared with Muhr and Shaffof",
  ],
  nodes: {
    issuer: "Sanad issuer (plan)",
    holder: "Graduate",
    verifier: "Employer / bot",
    centre: "Training centre",
    keys: "Key vault",
    didweb: "did:web document",
    status: "Status list",
    site: "sanad-site (Caddy)",
    gh: "GitHub",
    ci: "GitHub Actions",
    rel: "GitHub Releases",
  },
  metrics: {
    forged: "Forgeries shown as genuine",
    net: "Network calls needed to verify",
    revoked: "Revoked shown as valid",
    rows: "CSV rows signed",
    inline: "Unsafe inline sources in the CSP",
  },
  steps: {
    what: {
      short: "What",
      title: "Sanad: a certificate you can check without trusting a website",
      body: "In July 2024 forgers in Uzbekistan built a lookalike \"verification site\" and pointed fake QR codes at it (gov.uz, 2024-07-08). A page that says \"valid\" proves nothing. Sanad turns a certificate into a signed W3C Verifiable Credential: change one letter and the check fails, whoever runs it and wherever.\n\nStatus on 2026-11-19: **planning**, nothing issued yet. Who it is for: private training centres, IT courses, hackathons; never state diplomas or IDs. The JSON here is real: produced by the repo's own `sanad-core.js` with a fresh Ed25519 key.",
      fields: {
        issuer: "Who signed: a DID on the centre's own domain, plus a display name.",
        validFrom: "From when the credential is valid.",
        credentialSubject: "The graduate and the achievement: course name and criteria.",
        credentialStatus: "Where to check revocation: a list URL and this credential's bit index.",
        proof: "The Data Integrity proof: everything a verifier needs except the key itself.",
        verificationMethod: "Which key signed: the issuer's DID plus a key id.",
        proofValue: "The Ed25519 signature, multibase base64url.",
      },
    },
    issue: {
      short: "Issue",
      title: "The centre: a CSV in, one signed credential per graduate out",
      body: "A training centre uploads its graduates as CSV: name, course id, date, grade. The concept demo's sample has 12 rows with four mistakes on purpose: an empty name, a misspelt course (`pyton`), an impossible date and a date in the future. The preview marks each with its line and the reason; the button signs only the 8 rows that are ready.\n\nEach credential is signed with the centre's active key and gets its own bit in the revocation list. The private key is planned to stay in OpenBao and never leave it.",
      check: {
        q: "4 of 12 rows have errors. What should the issuer do?",
        options: [
          "Refuse the whole file until it is perfect",
          "Sign the 8 valid rows and show each rejected row with its line number and reason",
          "Sign all 12 and let graduates complain",
        ],
        answer: 1,
        why: "A signed credential cannot be quietly fixed later: a wrong name means revoking and reissuing. So validation happens before signing, row by row, and the operator sees exactly what will be signed. Blocking the whole batch for one typo just delays 8 valid graduates.",
      },
      fields: {
        ism: "Name column (the demo's CSV headers are Uzbek). Required.",
        kurs: "Course id; must match a known achievement.",
        sana: "Issue date: a real date, not in the future.",
        baho: "Grade; empty for badges.",
        "8 ready": "Only these are signed; the four errors stay on screen.",
        "status-list bit": "Reserved at issue time so the credential can be revoked later.",
      },
    },
    hold: {
      short: "Hold",
      title: "The graduate: a PDF, a QR, a file, and no account",
      body: "The graduate gets a printable PDF with a QR code. The plan is to put the credential itself into the QR; whether it always fits is an open question to measure with a prototype, and the fallback is to attach the JSON to the PDF and put its hash in the QR.\n\nThere is no account to keep and no website that must stay alive: the certificate is valid as long as the signature is. The concept demo's holder view shows one graduate with three credentials.",
      fields: {
        PDF: "Printable. Templates avoid anything that imitates state documents.",
        QR: "Carries data, not an address to trust.",
        file: "Plain JSON: any VC 2.0 verifier can read it, not just Sanad.",
        account: "None. The graduate owns the proof.",
      },
    },
    verify: {
      short: "Verify",
      title: "The employer: a photo to the bot, a verdict in place",
      body: "An HR manager sends a photo of the QR to the Telegram bot or opens the web verifier. The check runs on the device: format, canonical form and SHA-256, the Ed25519 signature against the issuer's key from a local cache, the trust list, the validity dates. Only the revocation check goes online, and it is optional.\n\nThe result is one of three: **genuine**, **forged** (the signature does not match, or the key is not the issuer's) or **revoked**. The concept demo ships ten samples: genuine, name edited, hours edited, lookalike domain, revoked, expired, old key, another centre, unknown key and broken JSON.",
      check: {
        q: "The employer's phone has no internet. What can the bot still tell?",
        options: [
          "Nothing: verification needs the issuer's server",
          "Genuine or forged, from the cached key and trust list; only revocation stays unchecked",
          "Only whether the QR is readable",
        ],
        answer: 1,
        why: "The signature check needs only the bytes and the issuer's public key, both already on the device. Revocation is the one fact that changes after issue, so it alone needs a fresh list, and the verdict says when it was skipped.",
      },
      fields: {
        canonical: "Keys sorted, no whitespace: the same bytes the issuer signed.",
        signature: "Ed25519 over those bytes, with the cached did:web key.",
        "trusted list": "Is this DID one of the issuers the verifier knows?",
        revocation: "The status list bit; the only online step.",
        Genuine: "All checks passed.",
      },
    },
    sign: {
      short: "Sign",
      title: "Exactly which bytes are signed",
      body: "The demo models the `eddsa-jcs-2022` cryptosuite. The credential without its proof is turned into canonical JSON (sorted keys, no whitespace), and so are the proof options: everything in `proof` except `proofValue`. Each is hashed with SHA-256 and the two 32-byte hashes are concatenated; that 64-byte input is signed with Ed25519.\n\n`canon()` refuses anything JSON cannot carry exactly (undefined, functions, NaN, Infinity, class instances), so two different values can never canonicalise the same. Browsers without Ed25519 fall back to ECDSA P-256 and the page says so. The real product must use a conformant JCS implementation and the full cryptosuite.",
      check: {
        q: "Why sign canonical JSON instead of the JSON text as it was written?",
        options: [
          "Canonical JSON is shorter",
          "Key order and whitespace can change in transit (a QR encoder, a pretty-printer); canonical form gives the verifier the same bytes the issuer signed",
          "Ed25519 cannot sign text",
        ],
        answer: 1,
        why: "Two JSON texts can mean the same object and still differ byte for byte. Without canonicalisation a harmless re-format would break the signature. JCS (RFC 8785) defines one byte form for one value.",
      },
      fields: {
        canon: "JCS-like canonical JSON; anything ambiguous throws instead of being changed.",
        options: "Proof metadata: covering it stops someone editing the date or key id.",
        input: "64 bytes: hash of the options, then hash of the document.",
        Ed25519: "Small, fast signatures; supported by WebCrypto in modern browsers.",
        multibase: "The leading u tells the encoding; strict base64url only.",
      },
    },
    trust: {
      short: "Trust",
      title: "A valid signature from the wrong issuer is still a forgery",
      body: "A clever forger does not edit a credential; they sign their own copy with their own key, under a domain that looks right: `rnarkaz.example` for `markaz.example`, `ilmyo1i` with a digit one. The signature is mathematically valid.\n\nSo the verifier asks two more questions: does the signing key belong to the issuer named in the document, and is that issuer on the trust list? Here the answer is no, and the verdict is \"fake issuer\". The bot always shows the DID and the domain in full. Who maintains the trust list is still an open question in the plan.",
      check: {
        q: "The signature checks out, but the issuer is `did:web:rnarkaz.example`. What should the bot answer?",
        options: [
          "Genuine: the signature is valid",
          "Forged issuer: the key is valid but not on the trust list, and the lookalike name does not help",
          "Unknown, ask the centre by phone",
        ],
        answer: 1,
        why: "A signature proves which key signed, not that the key is the one you meant. Binding the key to the issuer's DID and checking that DID against a list of known issuers is what defeats lookalike domains.",
      },
      fields: {
        id: "The issuer DID: one letter away from the real one.",
        name: "Copied exactly: names prove nothing.",
        sigOk: "The maths is fine: the forger signed with their own key.",
        trusted: "This DID is not on the verifier's list.",
        verdict: "fake: shown as \"forged issuer\".",
      },
    },
    revoke: {
      short: "Revoke",
      title: "Revocation without telling the issuer who is checking",
      body: "Sometimes a credential must be withdrawn: a misspelt name (reissued), a refunded course, a copied final project. Each credential owns one bit in a W3C Bitstring Status List; revoking flips it to 1. The demo's list has 131 072 bits, about 16 KB compressed.\n\nThe verifier downloads the whole list, so the issuer never learns which certificate an employer looked at. A revoked credential still has a genuine signature, so the verdict is \"revoked\", not \"forged\". Any malformed or unknown index counts as revoked.",
      check: {
        q: "Why download the whole list instead of asking \"is #7 revoked?\"",
        options: [
          "It is faster",
          "So the issuer cannot see which credential is being checked, by whom and when",
          "The standard forbids single queries for performance",
        ],
        answer: 1,
        why: "A per-credential query would turn the issuer into a tracker of every job application. A 16 KB list hides the one bit in 131 072 that the verifier cares about; it can also be cached.",
      },
      fields: {
        statusPurpose: "This list is for revocation (suspension would be a separate list).",
        statusListIndex: "Which bit belongs to this credential. A string, parsed strictly.",
        Revoked: "Signature fine, issuer withdrew it.",
        "fail closed": "When in doubt the answer is \"revoked\", never \"valid\".",
      },
    },
    keys: {
      short: "Keys",
      title: "Key rotation: new key for new certificates, old ones still check",
      body: "The issuer's public keys are published at its own domain as a `did:web` document. In the concept demo the centre has signed with `key-0` and then `key-1`; pressing \"rotate\" retires the active key and creates the next.\n\nA retired key stays in the document, so certificates it signed years ago still verify; only the active key is listed for new assertions. A stolen key is handled the same way, plus revocation of what it signed, and the issue date can be sealed through Muhr so a later key thief cannot backdate.",
      fields: {
        verificationMethod: "All published keys, retired ones included.",
        publicKeyMultibase: "The public key itself, multibase encoded (shortened in the demo).",
        assertionMethod: "The key that may sign new credentials now.",
      },
    },
    stack: {
      short: "Stack",
      title: "The planned stack and why",
      body: "Open standards first: VC 2.0, Data Integrity, Bitstring Status List and Open Badges 3.0, so a credential stays verifiable even without Sanad. The issuer is planned as a .NET 10 API using walt.id (Apache-2.0, a Docker REST service) or digitalbazaar/vc (BSD-3-Clause) in the browser. Keys live in OpenBao and never leave it; identity is `did:web`, which needs nothing but the centre's domain.\n\nThe bot reads QR codes from photos in Uzbek, Russian and English. The MVP is 8 weeks after Muhr, with a pilot of contributor badges for Wonmor's own open repositories. Later: OpenID4VCI wallets and SD-JWT selective disclosure.",
      fields: {
        standards: "Interoperable formats: no lock-in to Sanad.",
        "walt.id": "An existing identity toolkit, run as a service, instead of hand-rolled crypto.",
        OpenBao: "An open-source secrets manager: the private key is used inside it.",
        "did:web": "Keys on the issuer's own domain, resolvable without a blockchain.",
        anchor: "Optional: the issue date sealed through Muhr's log.",
      },
    },
    site: {
      short: "Site",
      title: "The live site: a real signature demo under a strict CSP",
      body: "sanad.wonmor.io is static HTML, CSS and four small scripts with self-hosted fonts, no build step and no third-party requests, served by Caddy behind the shared edge proxy of dtwin.uz. The in-page demo generates non-extractable Ed25519 keys in the browser on every load: the private key cannot be read out, not even by the page.\n\nThe CSP allows no inline script or style. The only exception is the favicon's dark-mode `<style>`, allowed by its exact SHA-256 hash, and the site checker fails on any new inline style.",
      fields: {
        "Content-Security-Policy": "self only, plus one hashed style for the favicon.",
        "Cache-Control": "Revalidate on every load: a deploy shows up at once.",
      },
    },
    ci: {
      short: "CI",
      title: "CI: crypto code tested from every side",
      body: "Every pull request runs the `build` job: the site checker, REUSE, ESLint with warnings as errors, unit tests, fast-check property tests on random input, Chromium end-to-end tests under the production CSP, and a coverage gate over every site script (90 % lines and functions, 80 % branches). The e2e suite also runs the demo without WebCrypto and without Ed25519.\n\nThe concept demo adds a smoke test (21 checks). The ruleset requires the `build` and `dco` checks, one approval and a code owner; Dependabot groups updates monthly.",
      fields: {
        "check-site": "Fails on anything the CSP would block or that must never be published.",
        "fast-check": "Property tests on random input: canon stability, base64url round-trips, Ed25519 rejecting any changed byte.",
        coverage: "Browser and unit coverage merged, gated in CI.",
        "demo smoke": "Every demo screen loads under the production CSP with no console errors.",
      },
    },
    deploy: {
      short: "Deploy",
      title: "Deploy and release: the shared Wonmor pipeline",
      body: "Sanad uses the same pipeline as Muhr and Shaffof. A push to `main` checks the site, stamps the SHA into `version.txt` and streams a tarball over SSH to a key that can run only `receive`. The server keeps releases by SHA and swaps a symlink atomically, CI verifies the live SHA and smoke-tests, and a failure rolls back.\n\nA `v*` tag builds the archive twice and compares it byte for byte, writes SHA256SUMS and signs provenance with Sigstore. The project holds OpenSSF Best Practices silver (16669), Observatory A+ and SSL Labs A+.",
      fields: {
        DEPLOY_SSH_KEY: "Repository secret, bound on the server to one command.",
        receive: "Server-side: deploy <sha>, rollback, status.",
        "atomic symlink swap": "No request sees half a release.",
        rollback: "Automatic when the post-deploy checks fail.",
        Sigstore: "Provenance anyone can verify with gh attestation verify.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "1) A QR code is an address; a signature is proof. Sanad issues W3C VC 2.0 credentials (Open Badges 3.0) for private issuers only. 2) The centre uploads a CSV; rows are validated before signing, and each credential gets a status bit. 3) The graduate keeps a PDF, a QR and a file, with no account. 4) The verifier works offline: canonical form, Ed25519 with a cached did:web key, a trust list against lookalike domains; only revocation goes online. 5) The proof options are signed together with the document. 6) Revocation is a bitstring the verifier downloads whole, and every doubtful case fails closed. 7) Retired keys stay published so old certificates still verify. 8) Status is planning, with a real signature demo and a tested, rollback-safe pipeline.",
    },
  },
  scenarios: {
    "unsigned-options": {
      label: "Unsigned options",
      steps: {
        "opt-gap": {
          short: "Gap",
          title: "The date could be edited and still show \"Genuine\"",
          body: "The security review on 2026-11-14 found that the first demo signed only the credential. The proof options shown in the same JSON, `created`, `cryptosuite`, `proofPurpose`, `verificationMethod`, were not covered. Someone could, for example, move `created` back by years and the page still said \"Genuine\".\n\nIn the demo that was low risk; in a real verifier it would be a medium one, because the signing date and key id are exactly what a forger with an old leaked key wants to change.",
          check: {
            q: "Which part of a Data Integrity proof must the signature cover?",
            options: [
              "Only the credential; the proof is metadata",
              "The credential and every proof option except the signature value itself",
              "Only the proofValue",
            ],
            answer: 1,
            why: "Anything a verifier reads to decide must be signed, or it can be swapped. eddsa-jcs-2022 hashes the proof options and the document separately and signs both hashes.",
          },
          fields: {
            created: "Edited after signing; the old demo did not notice.",
            proofValue: "Unchanged: it never covered created.",
            Genuine: "A false verdict.",
          },
        },
        "opt-fix": {
          short: "Fix",
          title: "Sign the options too, and require the right purpose",
          body: "The signed input became `SHA-256(canon(options)) || SHA-256(canon(credential))`, the options being the proof without `proofValue`. The verifier also requires `type: DataIntegrityProof` and `proofPurpose: assertionMethod`.\n\nNow editing the date, the cryptosuite or the key id breaks the signature, and the page note in all three languages says what is covered. The same review made base64url decoding strict and added the `u` multibase check.",
          fields: {
            "proof minus proofValue": "The options: every field of the proof except the signature.",
            proofPurpose: "Must be assertionMethod: a key meant for login cannot sign certificates.",
            Forged: "The verdict for any edited option.",
          },
        },
      },
    },
    "fail-open": {
      label: "Fail open",
      steps: {
        "open-hole": {
          short: "Hole",
          title: "Unknown index meant \"not revoked\"",
          body: "Finding 4 of the same review: the revocation lookup failed open. An index missing from the list counted as \"not revoked\", and `parseInt` read `\"7abc\"` as 7. A typo, a truncated list or an index past the end would all let a certificate pass.\n\nThe index is inside the signed credential, so an outsider could not exploit it directly, but a buggy issuer could ship revocable-looking certificates that can never be revoked.",
          fields: {
            statusListIndex: "Should be a plain decimal string.",
            parseInt: "Stops at the first non-digit: \"7abc\" becomes 7 without complaint.",
            "not revoked": "The dangerous default.",
          },
        },
        "open-fix": {
          short: "Closed",
          title: "Only a clean, known index can say \"not revoked\"",
          body: "`isRevoked()` now accepts only a plain decimal index that exists in the list, checked as an own property; anything else returns \"revoked\". The rule is general: in a security check, the error path must give the safe answer.\n\nA unit test feeds it `7` as a number, `07`, `7abc`, `-7`, an index missing from the list and `__proto__`: every one must come back \"revoked\".",
          fields: {
            "fail closed": "Doubt means revoked.",
            "return true": "true = revoked: the safe answer for every malformed input.",
          },
        },
      },
    },
    "inline-style": {
      label: "Removing unsafe-inline",
      steps: {
        "style-gap": {
          short: "Gap",
          title: "One loose word in the CSP, and the demo depended on it",
          body: "The first CSP allowed `style-src 'unsafe-inline'`, listed as a residual risk in the assurance case and tracked as issue #7. Each home page had five `style` attributes, and the signature demo's `sanad-core.js` built a step icon with an inline style.\n\nSimply tightening the header was not an option: with the strict CSP and the old script, every page logged five errors and the demo lost its layout. The fix had to start in the markup.",
          fields: {
            "unsafe-inline": "Lets any injected style run: a foothold for CSS-based attacks if markup is ever injected.",
            "sanad-core.js": "The demo's logic: it built markup with a style attribute.",
            "5 console errors": "What the strict CSP produced on each page before the script was fixed.",
          },
        },
        "style-fix": {
          short: "Fix",
          title: "Move styles to classes, allow one hash, and teach the checker",
          body: "PR #22 moved every inline style into `sanad.css` classes and set `style-src 'self'` plus the SHA-256 of the favicon's dark-mode `<style>`, the only inline block left. PR #23 made `check-site` reject the pattern for good, including `setAttribute('style', ...)` in scripts.\n\nThe PR shows the evidence: computed styles identical before and after on all three language pages, zero console errors, the full test suite green, and the checker failing on the old script as intended.",
          fields: {
            "sha256": "Allows exactly the favicon's style block and nothing else.",
            "check-site": "Now fails on every way an inline style could return.",
            "0 errors": "Console under the new CSP, on every page.",
          },
        },
      },
    },
  },
};

export default text;
