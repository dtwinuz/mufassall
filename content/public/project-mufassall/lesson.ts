import { defineLesson } from "@mufassall/scene-schema";

/**
 * mufassall (github.com/dtwinuz/mufassall, mufassall.dtwin.uz): this course itself. A pnpm
 * monorepo: scene format, player, lesson content, an Astro static site, a dependency-free Node
 * API with a Telegram bot, CI with leak-guard and hash-based CSP, a forced-command SSH deploy with
 * atomic releases and automatic rollback, all built in agent-orchestrated rounds. Numbers come
 * from the repository, its PR descriptions and its git history (17-19 Nov 2026).
 */
export default defineLesson({
  slug: "project-mufassall",
  level: "intermediate",
  minutes: 20,
  tier: "public",
  metrics: [
    { id: "lessons", unit: "", better: "up" },
    { id: "tests", unit: "", better: "up" },
    { id: "js", unit: "KB", better: "down" },
    { id: "alerts", unit: "", better: "down" },
    { id: "leaks", unit: "", better: "down" },
    { id: "cls", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "setup",
      kind: "case",
      nodes: {
        reader: { kind: "actor", at: [0, 6] },
        browser: { kind: "client", at: [3, 6] },
        edge: { kind: "lb", at: [6, 6] },
        site: { kind: "cdn", at: [9, 6] },
      },
      edges: {
        read: { from: "reader", to: "browser", rate: 3, mode: "call" },
        get: { from: "browser", to: "edge", rate: 3, mode: "call" },
        fwd: { from: "edge", to: "site", rate: 3, mode: "call" },
      },
      metrics: { lessons: 82, tests: 1711, js: 24, alerts: 0, leaks: 0, cls: 0.001 },
      focus: ["reader", "browser", "site"],
      exchange: {
        edge: "get",
        request: {
          format: "text",
          head: "https://mufassall.dtwin.uz   (static pages, uz / ru / en)",
          body: "/uz/                    course map: 82 lessons in 11 sections\n/uz/l/callbacks/        one lesson: live scene, steps, metrics, the real request\n/uz/lab/                draw your own diagram and put load on it\n/uz/review/             the lessons' questions again, spaced over days\n/uz/test/business/      10 questions per section, 70 % to pass\n/uz/me/                 your progress, export and import\n/uz/author/             write a lesson or a system of your own\n/ru/  /en/              the same course in Russian and English",
        },
        marks: ["82 lessons", "/uz/l/callbacks/", "/uz/lab/", "/uz/review/", "70 %", "/uz/me/", "/uz/author/"],
      },
    },
    {
      id: "lesson",
      kind: "case",
      edges: { read: { flow: "request" }, get: { flow: "ack" } },
      focus: ["reader", "browser"],
      exchange: {
        edge: "read",
        request: {
          format: "text",
          head: "one step of a lesson, as the reader sees it",
          body: "scene      blocks on an isometric grid, packets moving along the lines\nkind       problem / fix / case / recap, and what changed since the last step\nmetrics    six tiles, green when better, red when worse\nwire       the real request on one line, numbered fields explained below\ncheck      \"what happens next?\" answered before the next step\nscenario   a switcher for another ending: the incident, the late provider\nwhat-if    sliders on some lessons: change a number, see the outcome",
        },
        marks: ["isometric", "what changed", "metrics", "wire", "check", "scenario", "what-if"],
      },
    },
    {
      id: "practice",
      kind: "case",
      nodes: { local: { kind: "db", at: [3, 2] } },
      edges: { store: { from: "browser", to: "local", rate: 2, mode: "call" } },
      focus: ["browser", "local"],
      exchange: {
        edge: "store",
        request: {
          format: "text",
          head: "what the course keeps, only in this browser (localStorage)",
          body: "mufassall:v1:progress   lesson -> furthest step reached\nmufassall:v1:checks     first answer to each question: right or not\nmufassall:v2:review     id -> { s, d, due, last, reps, lapses, st }   FSRS-5 schedule\nmufassall:v1:tests      best section test score and its date\nmufassall:v1:days       the days you learned something (streak)\nno account, no server copy: /me exports a file or a transfer code",
        },
        marks: ["progress", "checks", "FSRS-5", "tests", "streak", "no account"],
      },
    },
    {
      id: "author",
      kind: "case",
      edges: { store: { flow: "request" } },
      focus: ["browser", "local"],
      exchange: {
        edge: "store",
        request: {
          format: "json",
          head: "billing.mufassall.json   (export from /my/, imported only by the reader's own hand)",
          body: `{
  "format": "mufassall.systems",
  "v": 1,
  "exported": "2026-11-19T09:00:00Z",
  "systems": [
    { "title": "Billing pipeline", "source": "gitlab-ci", "draft": { "steps": ["..."] } }
  ]
}`,
        },
        marks: ["format", "v", "systems", "source", "draft"],
      },
    },
    {
      id: "schema",
      kind: "case",
      nodes: {
        repo: { kind: "storage", at: [3, 10] },
        ci: { kind: "worker", at: [6, 10] },
      },
      edges: { push: { from: "repo", to: "ci", rate: 2, mode: "async" }, store: { rate: 0 } },
      focus: ["repo", "ci"],
      exchange: {
        edge: "push",
        request: {
          format: "text",
          head: "content/public/<slug>/lesson.ts + uz.ts, ru.ts, en.ts",
          body: "defineLesson({ slug, level, minutes, tier: \"public\", metrics, steps, scenarios })\nstep       { id, kind, nodes?, edges?, metrics?, focus?, exchange? }   only what changes\nresolve()  folds the patches into one full scene per step\ndiff()     says what changed, the player shows it\nvalidate   zod, strict, only at build and test time (subpath ./validate)\ntexts      LessonText<typeof lesson>: a missing node name or step text is a type error",
        },
        marks: ["defineLesson", "only what changes", "resolve()", "diff()", "./validate", "LessonText"],
      },
    },
    {
      id: "engine",
      kind: "case",
      edges: { get: { flow: "request" }, fwd: { flow: "request" } },
      focus: ["browser"],
      exchange: {
        edge: "get",
        request: {
          format: "text",
          head: "packages/scene-engine, as shipped to the browser",
          body: "components   written against React, served as Preact through compat aliases\nmotion       CSS transitions and a small tween, no animation library\nscene        SVG, 2:1 isometric tiles of 64x32, load bars placed clear of labels\nwire         annotate(): hand-written linear scanners, no backtracking regex\nlab          sim.ts (rho = lambda / C) and des.ts (seeded discrete-event simulation)\nheavy parts  video.ts, the yaml parser for CI import: loaded with dynamic import() on first use",
        },
        marks: ["Preact", "no animation library", "2:1 isometric", "linear scanners", "des.ts", "dynamic import()"],
      },
    },
    {
      id: "site",
      kind: "case",
      edges: { push: { flow: "request" } },
      focus: ["ci", "site"],
      exchange: {
        edge: "push",
        request: {
          format: "text",
          head: "pnpm build   (Astro, output: static)",
          body: "pnpm gen                registry.ts from the lesson folders that have all four files\nastro build             /uz/ /ru/ /en/: one page per language and lesson, trailing slash\nog images               1200x630 per lesson (satori + resvg)\nsearch.json, review.json, test/<section>.json   per language\nsw.js                   offline: lessons, Lab, glossary, review\npostbuild ok: 564 pages in sitemap, inline script hashes written to the Caddyfile",
        },
        marks: ["pnpm gen", "astro build", "og images", "search.json", "sw.js", "564 pages", "inline script hashes"],
      },
    },
    {
      id: "api",
      kind: "case",
      nodes: {
        api: { kind: "service", at: [9, 2] },
        tg: { kind: "external", at: [12, 2] },
      },
      edges: {
        apiq: { from: "edge", to: "api", rate: 1, mode: "call" },
        bot: { from: "api", to: "tg", rate: 1, mode: "async" },
        push: { rate: 0 },
      },
      focus: ["edge", "api", "tg"],
      exchange: {
        edge: "apiq",
        request: {
          format: "json",
          head: "POST https://mufassall.dtwin.uz/api/feedback",
          headers: [["Content-Type", "application/json"]],
          body: `{
  "lesson": "callbacks",
  "step": "retry",
  "lang": "uz",
  "kind": "unclear",
  "text": "Nega 30 soniya?"
}`,
        },
        response: { format: "http", head: "HTTP/1.1 204 No Content" },
        marks: ["lesson", "step", "kind", "text", "204 No Content"],
      },
    },
    {
      id: "security",
      kind: "fix",
      edges: { get: { flow: "request" } },
      focus: ["browser", "edge", "site"],
      exchange: {
        edge: "get",
        request: { format: "http", head: "GET /uz/l/callbacks/ HTTP/1.1", headers: [["Host", "mufassall.dtwin.uz"]] },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [
            ["Content-Security-Policy", "default-src 'self'; script-src 'self' 'sha256-…' 'sha256-…'; connect-src 'self'; frame-ancestors 'none'; object-src 'none'"],
            ["Cache-Control", "no-cache"],
            ["X-Content-Type-Options", "nosniff"],
            ["Cross-Origin-Opener-Policy", "same-origin"],
          ],
        },
        marks: ["Content-Security-Policy", "Cache-Control", "X-Content-Type-Options", "Cross-Origin-Opener-Policy"],
      },
    },
    {
      id: "ci",
      kind: "case",
      edges: { push: { flow: "request", rate: 2 }, apiq: { rate: 0 }, bot: { rate: 0 } },
      focus: ["repo", "ci"],
      exchange: {
        edge: "push",
        request: {
          format: "text",
          head: ".github/workflows/ci.yml   (every push to main and every pull request)",
          body: "pnpm install --frozen-lockfile\npnpm typecheck                  every package, lesson texts against their scenes\npnpm test                       1711 vitest tests at Round 11\nnode --test apps/api/*.test.mjs\npnpm check:i18n                 every UI string in uz, ru, en; no Cyrillic in uz and en\npnpm build\npnpm check:leaks                leak-guard over apps/web/dist, plus private patterns from a secret\nCodeQL default setup, Dependabot monthly (grouped, 7-day cooldown), actions pinned by SHA",
        },
        marks: ["--frozen-lockfile", "typecheck", "1711", "check:i18n", "check:leaks", "CodeQL", "pinned by SHA"],
      },
    },
    {
      id: "deploy",
      kind: "case",
      edges: { ship: { from: "ci", to: "site", rate: 2, mode: "async" }, push: { rate: 1 } },
      focus: ["ci", "site"],
      exchange: {
        edge: "ship",
        request: {
          format: "text",
          head: "deploy.yml on main:  tar site/ + Caddyfile | ssh root@*** \"deploy <sha>\"",
          body: "authorized_keys    restrict,command=\"/opt/mufassall-site/bin/receive\"   the key can do nothing else\nreceive            flock; archive <= 300 MB; site/index.html, Caddyfile, version.txt == sha\n                   no links or special files in the archive\n                   releases/<sha>, then ln -sfn + mv -T: atomic swap of releases/current\n                   new Caddyfile? caddy validate, then reload; reload fails -> swap back\nverify             https://mufassall.dtwin.uz/version.txt == sha\nsmoke              64 URLs must answer 200, an unknown page 404, the CSP header present\nfailure            ssh ... rollback: current -> PREVIOUS",
        },
        marks: ["restrict,command", "flock", "version.txt == sha", "atomic swap", "caddy validate", "64 URLs", "rollback"],
      },
    },
    {
      id: "rounds",
      kind: "case",
      nodes: { agents: { kind: "worker", at: [0, 10] } },
      edges: { commit: { from: "agents", to: "repo", rate: 2, mode: "async" }, ship: { rate: 1 } },
      focus: ["agents", "repo"],
      exchange: {
        edge: "commit",
        request: {
          format: "text",
          head: "git log --oneline main   (17-19 Nov 2026)",
          body: "517eb57  Foundation: scene format, player, first lesson, uz/ru/en site\n5838f38  Deploy: static release to mufassall.dtwin.uz with hash-based CSP\n6908ec9  F1: haqiqiy so'rov qatlami + To'lov shlyuzi darsi\nb1725b3  feat: full course (42 lessons, 10 sections) and Lab diagram editor\n895f397  Round 2: lighter player, search, offline, Lab simulation\n848e887  Round 8: PlantUML export, BPMN import, MCP server, 4 new lessons\n037ac7a  Round 10: time-based lab simulation, 4 new lessons\n188ea92  Round 11: my systems library, pipeline and Mermaid import\none round = one brief, parallel agents in their own folders, one squash PR",
        },
        marks: ["Foundation", "hash-based CSP", "42 lessons", "Round 2", "MCP server", "Round 11", "one squash PR"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "layout-shift",
      from: "site",
      steps: [
        {
          id: "shift",
          kind: "problem",
          metrics: { cls: 0.124 },
          focus: ["browser", "site"],
          exchange: {
            edge: "get",
            request: {
              format: "text",
              head: "npx lighthouse@12.8.2 https://mufassall.dtwin.uz/uz/me/   (mobile)",
              body: "Performance 96   CLS 0.124   (limit 0.1)\nlayout-shifts: main#main > div.me > section.me-card   0.124\n/en/author/: footer.site-foot   0.078\ncause: both cards hidden in the HTML, me.js decides after the first paint",
            },
            marks: ["CLS 0.124", "layout-shifts", "footer.site-foot", "after the first paint"],
          },
        },
        {
          id: "settle",
          kind: "fix",
          metrics: { cls: 0.001 },
          focus: ["browser", "site"],
          exchange: {
            edge: "get",
            request: {
              format: "text",
              head: "Round 9 fix, measured again",
              body: "/me      a small inline script picks the right card before the first paint\n         its sha256 lands in the CSP by itself (postbuild)\n/author  the editor skeleton reserves min-height: 110vh\n/uz/me/       Performance 98, CLS 0.001\n/en/author/   Performance 98, CLS 0.002",
            },
            marks: ["inline script", "postbuild", "min-height: 110vh", "CLS 0.001"],
          },
        },
      ],
    },
    {
      id: "leak-caught",
      from: "ci",
      steps: [
        {
          id: "hit",
          kind: "problem",
          edges: { push: { flow: "fail" } },
          metrics: { leaks: 1 },
          focus: ["ci"],
          exchange: {
            edge: "push",
            request: {
              format: "text",
              head: "pnpm check:leaks   (Round 7, a new secrets-management lesson)",
              body: "apps/web/dist/uz/l/secrets-management/index.html: private IPv4 in an example host address\nprocess exits 1, the build is red, nothing is deployed\nthe address was an example, but the rule cannot know that",
            },
            marks: ["private IPv4", "exits 1", "an example"],
          },
        },
        {
          id: "doc-range",
          kind: "fix",
          edges: { push: { flow: "request" } },
          metrics: { leaks: 0 },
          focus: ["ci"],
          exchange: {
            edge: "push",
            request: {
              format: "text",
              head: "the fix: use addresses that can never be real",
              body: "example host   198.51.100.17   (RFC 5737 documentation range)\nleak-guard     private ranges always fail; 192.0.2/24, 198.51.100/24, 203.0.113/24 may appear with a port\nresult         leak-guard ok, the lesson ships",
            },
            marks: ["198.51.100.17", "RFC 5737", "leak-guard ok"],
          },
        },
      ],
    },
    {
      id: "preact",
      from: "engine",
      steps: [
        {
          id: "heavy",
          kind: "problem",
          metrics: { js: 135 },
          focus: ["browser"],
          exchange: {
            edge: "get",
            request: {
              format: "text",
              head: "lesson page before Round 2 (gzip)",
              body: "react + react-dom   the player's components\nmotion library      enter / exit animations of blocks and packets\ntotal               about 135 KB of JavaScript for one lesson page\na phone on a slow network parses all of it before the first step can move",
            },
            marks: ["react-dom", "motion library", "135 KB"],
          },
        },
        {
          id: "aliases",
          kind: "problem",
          focus: ["browser", "site"],
          exchange: {
            edge: "fwd",
            request: {
              format: "text",
              head: "swapping in Preact compat: what broke first",
              body: "pnpm strict layout   packages/scene-engine could not see preact/compat\n                     fix: absolute aliases react -> preact/compat in astro.config\nSVG attributes       tabIndex rendered wrong on SVG nodes\n                     fix: lowercase tabindex, as the DOM expects",
            },
            marks: ["pnpm strict", "absolute aliases", "tabindex"],
          },
        },
        {
          id: "light",
          kind: "fix",
          metrics: { js: 24 },
          focus: ["browser"],
          exchange: {
            edge: "get",
            request: {
              format: "text",
              head: "lesson page after Round 2 (gzip)",
              body: "components   unchanged source, Preact at runtime\nmotion       CSS transitions + a small tween function\ntotal        about 24 KB of JavaScript\nRound 3      Lighthouse on a lesson: accessibility, best practices, SEO 100",
            },
            marks: ["unchanged source", "small tween", "24 KB", "Lighthouse"],
          },
        },
      ],
    },
    {
      id: "redos",
      from: "ci",
      steps: [
        {
          id: "flagged",
          kind: "problem",
          edges: { push: { flow: "fail" } },
          metrics: { alerts: 1 },
          focus: ["ci"],
          exchange: {
            edge: "push",
            request: {
              format: "text",
              head: "CodeQL on the pull request: js/polynomial-redos",
              body: "F1 (wire.ts)     a regular expression that finds marks in a message could backtrack\nRound 11         store.ts trimmed trailing dashes with /-+$/: also flagged\nwhy it matters   a crafted lesson or imported file could make the browser hang\nthe PR check is red until the alert is gone",
            },
            marks: ["js/polynomial-redos", "wire.ts", "/-+$/", "hang"],
          },
        },
        {
          id: "scanner",
          kind: "fix",
          edges: { push: { flow: "request" } },
          metrics: { alerts: 0 },
          focus: ["ci"],
          exchange: {
            edge: "push",
            request: {
              format: "text",
              head: "the fix: plain code instead of a pattern",
              body: "wire.ts    annotate() walks the text once with indexOf and a cursor\nstore.ts   edfb2dc \"trim trailing dashes without a regex\": a loop from the end\nresult     work grows linearly with input; CodeQL check green",
            },
            marks: ["indexOf", "edfb2dc", "linearly"],
          },
        },
      ],
    },
  ],
});
