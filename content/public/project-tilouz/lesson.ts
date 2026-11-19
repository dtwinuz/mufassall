import { defineLesson } from "@mufassall/scene-schema";

/**
 * Tilo (wonmortech/tilouz, public; code Apache-2.0, docs CC BY 4.0): a non-profit, Deaf-led platform
 * between Deaf, hard-of-hearing, non-speaking and hearing people. What exists: research docs, the
 * presentation site tilo.wonmor.io, the test PWA at /app/ (captions, situation cards, video message,
 * emergency card), a concept demo, scheduled Telegram posts. What is a plan: video relay with human
 * interpreters, ASR router, sign dictionary and dataset (docs/06b, 06c). Sources: README, site/app/*,
 * deploy/*, .github/workflows/*, tools/*, docs/06_Platforma_rejasi, git log, PRs #19-#21.
 */
export default defineLesson({
  slug: "project-tilouz",
  level: "intermediate",
  minutes: 15,
  tier: "public",
  metrics: [
    { id: "offline", unit: "%", better: "up" },
    { id: "server", unit: "", better: "down" },
    { id: "nolink", unit: "", better: "down" },
    { id: "stuck", unit: "", better: "down" },
    { id: "unlicensed", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "what",
      kind: "case",
      nodes: {
        deaf: { kind: "actor", at: [0, 2] },
        app: { kind: "client", at: [5, 5] },
      },
      edges: { use: { from: "deaf", to: "app", rate: 2, mode: "call" } },
      metrics: { server: 0 },
      focus: ["deaf", "app"],
      exchange: {
        edge: "use",
        request: {
          format: "text",
          head: "GET https://tilo.wonmor.io/app/   (test app, works on the phone)",
          body: "Yuzma-yuz suhbat   face-to-face: speech becomes big captions, typed reply is read aloud\nVaziyat kartalari  situation cards: clinic, bank, taxi, police, mahalla\nVideo xabar        record and send a sign-language video\nFavqulodda karta   101, 102, 103, 112 and an \"I am Deaf\" card\n-- nothing is sent to a Tilo server and nothing is stored there",
        },
        marks: ["Yuzma-yuz suhbat", "Vaziyat kartalari", "Video xabar", "Favqulodda karta", "nothing is sent"],
      },
    },
    {
      id: "talk",
      kind: "case",
      nodes: {
        hearing: { kind: "actor", at: [0, 9] },
        stt: { kind: "external", at: [10, 1] },
      },
      edges: {
        speak: { from: "hearing", to: "app", rate: 2 },
        rec: { from: "app", to: "stt", rate: 2, mode: "call" },
      },
      focus: ["hearing", "app", "stt"],
      exchange: {
        edge: "rec",
        request: {
          format: "text",
          head: "site/app/app.js, face-to-face captions",
          body: "const SR = window.SpeechRecognition || window.webkitSpeechRecognition;\nrec.lang = 'uz-UZ' or 'ru-RU';  rec.continuous = true;  rec.interimResults = true;\nfinal result  -> a big caption line; tap it to correct a word\ninterim       -> grey line under it, replaced as the phrase settles\nreply typed by the Deaf person -> SpeechSynthesisUtterance, rate 0.95",
        },
        response: {
          format: "text",
          head: "before the first start: a consent dialog (cfg.sttOk)",
          body: "\"Many browsers send the audio to their vendor's server (for example Google).\nNo audio and no text is sent to the Tilo server.\"\nDon't agree? -> writing mode: the hearing person types on the phone",
        },
        marks: ["SpeechRecognition", "interimResults", "tap it to correct", "SpeechSynthesisUtterance", "sttOk", "writing mode"],
      },
    },
    {
      id: "cards",
      kind: "case",
      focus: ["deaf", "app"],
      exchange: {
        edge: "use",
        request: {
          format: "json",
          head: "GET /app/data/cards.json",
          body: `{
  "version": 1,
  "status": "draft",
  "sets": [
    {
      "id": "clinic",
      "title": { "uz": "Shifoxona", "ru": "..." },
      "cards": [
        { "id": "general.deaf", "uz": "Men karman. Iltimos, yozib yoki imo-ishora bilan gapiring.", "ru": "..." }
      ]
    }
  ]
}`,
        },
        marks: ["status", "sets", "title", "cards", "uz"],
      },
    },
    {
      id: "video",
      kind: "case",
      focus: ["deaf", "app"],
      exchange: {
        edge: "use",
        request: {
          format: "text",
          head: "Video xabar and Favqulodda karta, all on the device",
          body: "getUserMedia({ video })      front camera; the preview is mirrored, the recording is not\nMediaRecorder                a WebM clip, size and length shown, kept only on this phone\nnavigator.share(file)        hand it to Telegram or any app; no share API -> Save\nSOS card                     \"Men karman\" + 101 102 103 112, an address kept only in localStorage\nwarning                      no text or video channel to 112 was found yet",
        },
        marks: ["getUserMedia", "MediaRecorder", "navigator.share", "localStorage", "no text or video channel"],
      },
    },
    {
      id: "privacy",
      kind: "fix",
      nodes: { web: { kind: "service", at: [11, 6] } },
      edges: { get: { from: "app", to: "web", rate: 1, mode: "call" } },
      focus: ["app", "web"],
      exchange: {
        edge: "get",
        request: { format: "http", head: "GET /app/ HTTP/1.1", headers: [["Host", "tilo.wonmor.io"]] },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [
            ["Content-Security-Policy", "default-src 'self'; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'"],
            ["Permissions-Policy", "camera=(self), microphone=(self), geolocation=()"],
            ["Cache-Control", "no-cache"],
            ["Referrer-Policy", "strict-origin-when-cross-origin"],
          ],
        },
        marks: ["Content-Security-Policy", "Permissions-Policy", "Cache-Control"],
      },
    },
    {
      id: "offline",
      kind: "fix",
      nodes: { sw: { kind: "cache", at: [9, 10] } },
      edges: { shell: { from: "app", to: "sw", rate: 1 } },
      metrics: { offline: 100 },
      focus: ["app", "sw"],
      exchange: {
        edge: "shell",
        request: {
          format: "text",
          head: "site/app/sw.js, cache tilo-app-v1",
          body: "SHELL   /app/, app.css, app.js, translit.js, data/cards.json, manifest, icon, 4 fonts\nfetch   network first; on success refresh the cached copy\noffline fall back to the cached copy (ignoreSearch)\nscope   only GET, only same origin, only paths in SHELL\nnever   anything the user made: videos, captions and the address are not cached here",
        },
        marks: ["SHELL", "network first", "fall back", "only paths in SHELL", "never"],
      },
    },
    {
      id: "script",
      kind: "case",
      focus: ["app"],
      exchange: {
        edge: "use",
        request: {
          format: "text",
          head: "site/app/translit.js: one Uzbek text, three interface languages",
          body: "uz    Latin, written by hand\nuzc   Cyrillic, generated from the Latin by rules: o' -> u-breve, g' -> g-stroke, sh, ch, yo, yu, ya, ye\nru    Russian, written by hand\nrule  e at the start of a word or after a vowel -> e-reversed, otherwise e\nrule  ts before i + y/o -> ts letter (politsiya, stantsiya)\nsafe  {mb}, {s} placeholders are hidden before transliteration and restored after\ngap   loanwords like sirk are left to human review",
        },
        marks: ["uzc", "by rules", "politsiya", "placeholders", "human review"],
      },
    },
    {
      id: "plan",
      kind: "case",
      nodes: { vri: { kind: "service", at: [5, 11] } },
      edges: { call: { from: "app", to: "vri", rate: 1, mode: "call" } },
      focus: ["app", "vri"],
      exchange: {
        edge: "call",
        request: {
          format: "text",
          head: "docs/06b: the planned interpreter call (not built yet)",
          body: "Deaf user -> gateway   \"call an interpreter\" with an anonymous session token\ndispatcher             queue place and estimated wait, every 15 s; outside hours -> booking\ninterpreter            full-screen alert, accepts\ndispatcher -> Jitsi    room with lobby on, recording off; JWT for both\nhearing person         joins by QR through the lobby\nstatistics             {minutes, wait, situation, region}, no personal data",
        },
        marks: ["anonymous session token", "every 15 s", "recording off", "lobby", "no personal data"],
      },
    },
    {
      id: "dataset",
      kind: "case",
      nodes: { data: { kind: "storage", at: [9, 12] } },
      edges: { consent: { from: "vri", to: "data", rate: 1 } },
      focus: ["vri", "data"],
      exchange: {
        edge: "consent",
        request: {
          format: "text",
          head: "docs/06c: the open Uzbek Sign Language dataset (plan)",
          body: "D0  50 signs x 10 signers, protocol test\nD1  300 core signs x 30-50 signers  -> release 1\nD2  2 000 signs                    -> release 2 + baseline model\nconsent  L0 participation, L1 show in the app, L2 open dataset, L3 our training, L4 named partners\n         each layer can be withdrawn on its own; pose data is not anonymous, the text says so\nlicence  open video and pose CC BY-SA 4.0 (recommended), tools Apache-2.0, never NC",
        },
        marks: ["D1", "consent", "withdrawn on its own", "not anonymous", "CC BY-SA 4.0"],
      },
    },
    {
      id: "ci",
      kind: "case",
      nodes: { ci: { kind: "worker", at: [12, 9] } },
      edges: { check: { from: "ci", to: "web", rate: 1 } },
      focus: ["ci"],
      exchange: {
        edge: "check",
        request: {
          format: "text",
          head: "pull request checks",
          body: "ci.yml        node tools/check-site.mjs: required pages, broken links, inline <script>,\n              third-party origins, IPv4 addresses, phone numbers, tokens\n              REUSE compliance (every file has a licence)\n              Playwright smoke test of the concept demo: every route, no console errors\ndco.yml       every commit needs \"Signed-off-by: Name <email>\"\nscorecard.yml OpenSSF Scorecard on main",
        },
        response: {
          format: "text",
          head: "dco.yml, a commit without sign-off",
          body: "::error::commit 3f1a... has no 'Signed-off-by: Name <email>' line (use git commit -s)\nFix: git rebase --signoff origin/main && git push --force-with-lease",
        },
        marks: ["check-site.mjs", "REUSE", "Playwright", "Signed-off-by", "Scorecard"],
      },
    },
    {
      id: "deploy",
      kind: "fix",
      focus: ["ci", "web"],
      exchange: {
        edge: "check",
        request: {
          format: "text",
          head: ".github/workflows/deploy.yml  (push to main touching site/ or deploy/Caddyfile)",
          body: "check-site -> site/version.txt = commit SHA\ntar site + Caddyfile | ssh (key bound to bin/receive, host key pinned) \"deploy <sha>\"\nserver: unpack to releases/<sha>, caddy validate, swap releases/current, caddy reload\nCI: wait until /version.txt shows the SHA, smoke test paths and headers\nfailure after shipping -> rollback to the previous release",
        },
        response: {
          format: "text",
          head: "deploy/docker-compose.yml",
          body: "image caddy:2-alpine, container tilo-site\n./conf -> /etc/caddy (read-only), ./releases -> /srv/releases (read-only)\nreached through the shared edge proxy of dtwin.uz, which terminates TLS",
        },
        marks: ["version.txt", "bin/receive", "caddy validate", "releases/current", "rollback", "read-only"],
      },
    },
    {
      id: "telegram",
      kind: "case",
      nodes: { tg: { kind: "external", at: [12, 12] } },
      edges: { post: { from: "ci", to: "tg", rate: 1, mode: "call" } },
      focus: ["ci", "tg"],
      exchange: {
        edge: "post",
        request: {
          format: "json",
          head: "POST https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/sendMessage",
          headers: [["content-type", "application/json"]],
          body: `{
  "chat_id": "@tiloapp",
  "text": "<b>Toshkentda 800 kishiga bitta tarjimon</b> ... Manba: Gazeta.uz",
  "parse_mode": "HTML",
  "link_preview_options": { "is_disabled": true }
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{ "ok": true, "result": { "message_id": 42 } }`,
        },
        marks: ["chat_id", "text", "parse_mode", "ok"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "hidden-app",
      from: "deploy",
      steps: [
        {
          id: "hidden-bug",
          kind: "problem",
          metrics: { nolink: 25 },
          focus: ["web", "app"],
          exchange: {
            edge: "get",
            request: {
              format: "text",
              head: "tilo.wonmor.io on a desktop browser, the day /app/ shipped",
              body: "the site runs as a slide deck: 26 slides\nthe footer (with links) is hidden in deck mode\nthe call to action with the /app/ link is only on the last slide\n-- the new test app was practically unreachable from a desktop",
            },
            marks: ["26 slides", "footer", "last slide", "unreachable"],
          },
        },
        {
          id: "hidden-fix",
          kind: "fix",
          metrics: { nolink: 0 },
          focus: ["web"],
          exchange: {
            edge: "get",
            request: {
              format: "text",
              head: "PR #20: fix(site): app button in the top bar, reachable on desktop",
              body: "an always visible app button in both top bars (deck view and story view)\nin uz, ru and en pages\nunder 400 px: icon only, with an aria-label\n4 files, 8 lines added",
            },
            marks: ["both top bars", "uz, ru and en", "aria-label"],
          },
        },
      ],
    },
    {
      id: "actions-off",
      from: "ci",
      steps: [
        {
          id: "off-bug",
          kind: "problem",
          metrics: { stuck: 1 },
          focus: ["ci"],
          exchange: {
            edge: "check",
            request: {
              format: "text",
              head: "PR #18, opened from an account with GitHub Actions disabled",
              body: "ci        startup_failure\ndco       startup_failure\ntried     close and reopen, an empty commit, workflow_dispatch: still nothing runs\nand       a merge by that account would not start the deploy either",
            },
            marks: ["startup_failure", "empty commit", "workflow_dispatch", "deploy"],
          },
        },
        {
          id: "off-fix",
          kind: "fix",
          metrics: { stuck: 0 },
          focus: ["ci", "web"],
          exchange: {
            edge: "check",
            request: {
              format: "text",
              head: "the working rule since then",
              body: "open the PR and squash-merge it from a maintainer account that has Actions\napprove from a second maintainer (one approval required)\nevery commit still carries Signed-off-by\nPRs #19, #20 and #21 went through this way",
            },
            marks: ["squash-merge", "second maintainer", "Signed-off-by", "went through this way"],
          },
        },
      ],
    },
    {
      id: "reuse-lint",
      from: "ci",
      steps: [
        {
          id: "reuse-bug",
          kind: "problem",
          metrics: { unlicensed: 133 },
          focus: ["ci"],
          exchange: {
            edge: "check",
            request: {
              format: "text",
              head: "reuse lint, before PR #2",
              body: "brand/README.md: artwork CC-BY-4.0, brand code Apache-2.0, fonts OFL-1.1\nREUSE.toml: no rule for brand/ or tools/deck\nresult: 133 files without licence information -> the check fails",
            },
            marks: ["brand/README.md", "REUSE.toml", "133 files"],
          },
        },
        {
          id: "reuse-fix",
          kind: "fix",
          metrics: { unlicensed: 0 },
          focus: ["ci"],
          exchange: {
            edge: "check",
            request: {
              format: "text",
              head: "PR #2: make the repo REUSE-compliant",
              body: "REUSE.toml mirrors the rules brand/README.md already stated\ntools/deck annotated\nLICENSES/LicenseRef-GSAP-Standard.txt points to the upstream GSAP licence\nreuse lint: 433/433 files compliant",
            },
            marks: ["mirrors the rules", "LicenseRef-GSAP-Standard", "433/433"],
          },
        },
      ],
    },
  ],
});
