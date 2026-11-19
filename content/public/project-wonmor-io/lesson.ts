import { defineLesson } from "@mufassall/scene-schema";

/**
 * Project lesson: wonmor.io and the wonmortech organisation around it. A static Astro site in
 * three languages, edited through a git-based CMS, built and checked on every pull request,
 * shipped by GitHub Actions to a forced-command receiver that swaps a release symlink and rolls
 * back on a failed smoke test. Satellites: design tokens, brand files, the planned fund and the
 * org profile. Every number comes from the repositories (README, workflows, deploy/, tools/,
 * commit messages of PRs #13, #15, #19, #21, #23, #27). Scenarios: a theme that did not stick
 * because an unversioned boot script was cached for a day, and home-page numbers that a public
 * reader could not reproduce.
 */
export default defineLesson({
  slug: "project-wonmor-io",
  level: "intermediate",
  minutes: 16,
  tier: "public",
  metrics: [
    { id: "committed", unit: "", better: "down" },
    { id: "pages", unit: "", better: "up" },
    { id: "demos", unit: "", better: "up" },
    { id: "prchecks", unit: "", better: "up" },
    { id: "stale", unit: "h", better: "down" },
    { id: "claims", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "intro",
      kind: "case",
      nodes: {
        visitor: { kind: "client", at: [0, 2] },
        edge: { kind: "lb", at: [4, 2] },
        site: { kind: "service", at: [8, 2] },
      },
      edges: {
        open: { from: "visitor", to: "edge", rate: 2, mode: "call" },
        pass: { from: "edge", to: "site", rate: 2, mode: "call" },
      },
      metrics: { committed: 851, pages: 243, demos: 0, prchecks: 0, stale: 0, claims: 0 },
      focus: ["visitor", "edge", "site"],
      exchange: {
        edge: "open",
        request: {
          format: "http",
          head: "GET / HTTP/1.1",
          headers: [
            ["Host", "wonmor.io"],
            ["Accept-Language", "uz-UZ,uz;q=0.9,en;q=0.8"],
          ],
        },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [
            ["Content-Type", "text/html; charset=utf-8"],
            ["Cache-Control", "no-cache"],
            ["Content-Security-Policy", "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; ... connect-src 'self'; frame-ancestors 'none'; ..."],
            ["Referrer-Policy", "strict-origin-when-cross-origin"],
          ],
        },
        marks: ["Host", "Accept-Language", "Cache-Control", "Content-Security-Policy", "Referrer-Policy"],
      },
    },
    {
      id: "reader",
      kind: "case",
      focus: ["visitor", "site"],
      exchange: {
        edge: "open",
        request: {
          format: "text",
          head: "public/js/boot.js runs in <head>, before the first paint",
          body: "localStorage   wm-theme = ink        one of 9: light dark ink blueprint cobalt contrast paper dots glass\nlocalStorage   wm-lang  = uz         a saved language choice\nsessionStorage wm-in    = 1          set on the first page of a visit: no redirects while browsing\nnavigator.languages = [uz-UZ, en]    used only on the very first visit to the bare /\n-- / opens /uz/ ; a deep English page only offers Uzbek in a banner\n-- search: /pagefind/pagefind.js, an index built at deploy time, no search server",
        },
        marks: ["wm-theme", "wm-lang", "wm-in", "navigator.languages", "pagefind"],
      },
    },
    {
      id: "editor",
      kind: "case",
      nodes: {
        writer: { kind: "actor", at: [0, 8] },
        cms: { kind: "client", at: [4, 8] },
        repo: { kind: "external", at: [8, 8] },
      },
      edges: {
        edit: { from: "writer", to: "cms", rate: 1, mode: "call" },
        commit: { from: "cms", to: "repo", rate: 1, mode: "call" },
      },
      focus: ["writer", "cms", "repo"],
      exchange: {
        edge: "commit",
        request: {
          format: "text",
          head: "public/admin/config.yml  (Sveltia CMS at /admin)",
          body: "backend: github\nrepo: wonmortech/wonmor.io\nbranch: main\ncommit_messages.update: \"content: update {{collection}} {{slug}}\"\ncollections: news_en news_uz news_ru  research_en research_uz research_ru  docs_en docs_uz docs_ru\nsign-in: a fine-grained GitHub token, this repository only, Contents: read and write\n-- every Save is one commit to main; the Deploy workflow builds and publishes it",
        },
        marks: ["backend", "branch", "commit_messages.update", "collections", "sign-in"],
      },
    },
    {
      id: "content",
      kind: "case",
      focus: ["cms", "repo"],
      exchange: {
        edge: "commit",
        request: {
          format: "text",
          head: "src/content/news/introducing-bitg-0-4/en.md",
          body: "---\ntitle: \"bitg 0.4: your own dictionary, feedback from the app and verified updates\"\ndate: 2026-11-13\ncategory: product\nproduct: bitg\nsource:\n  - https://github.com/dtwinuz/bitg/releases/tag/v0.4.0\n---\n-- schema in src/content.config.ts: source is z.array(z.string()).min(1)\n-- a post without a source fails the build; planned work never goes into news",
        },
        marks: ["category", "source", "min(1)", "planned"],
      },
    },
    {
      id: "build",
      kind: "case",
      nodes: {
        ci: { kind: "worker", at: [12, 8] },
      },
      edges: {
        check: { from: "repo", to: "ci", rate: 1, mode: "async" },
      },
      focus: ["repo", "ci"],
      exchange: {
        edge: "check",
        request: {
          format: "text",
          head: "npm run build",
          body: "astro build                -> site/  (en at /, uz at /uz/, ru at /ru/; trailingSlash: always)\nnode tools/copy-cms.mjs    -> site/admin/sveltia-cms.js from node_modules, pinned version\npagefind --site site       -> site/pagefind/  (static search index, WebAssembly in the browser)\nnode tools/check-site.mjs  -> no inline <script>, no private address, no token, no broken link\nnode tools/check-links.mjs -> every link resolves\nnode tools/check-art.mjs   -> no two posts on one page share an illustration",
        },
        marks: ["astro build", "copy-cms.mjs", "pagefind", "check-site.mjs", "check-art.mjs"],
      },
    },
    {
      id: "gates",
      kind: "case",
      focus: ["ci"],
      exchange: {
        edge: "check",
        request: {
          format: "text",
          head: "tools/check-site.mjs  (exits 1 on any hit, the build fails)",
          body: "inline <script> without src     -> \"inline <script> blocked by CSP\"   the site ships script-src 'self'\n10.x / 172.16-31.x / 192.168.x  -> \"private IP address\"\nghp_ github_pat_ glpat- xoxb-    -> \"token-like string\"\n-----BEGIN ... PRIVATE KEY-----  -> \"private key\"\nWM_FORBIDDEN=<regex> (env)       -> extra strings the owner never wants published\nsite/admin/sveltia-cms.js        -> skipped: the pinned third-party bundle",
        },
        marks: ["inline <script> blocked by CSP", "private IP address", "token-like string", "WM_FORBIDDEN"],
      },
    },
    {
      id: "satellites",
      kind: "case",
      nodes: {
        tokens: { kind: "storage", at: [12, 4] },
        brand: { kind: "storage", at: [12, 0] },
      },
      edges: {
        style: { from: "tokens", to: "repo", rate: 1 },
        mark: { from: "brand", to: "repo", rate: 1 },
      },
      focus: ["tokens", "brand", "repo"],
      exchange: {
        edge: "mark",
        request: {
          format: "json",
          head: "wonmortech/brand: colors.json",
          body: `{
  "source": "https://wonmor.io/brand/",
  "colors": [
    { "id": "wonmor-blue", "hex": "#2969FF", "role": "The mark, always" },
    { "id": "paper", "hex": "#FAF9F5", "role": "The warm page colour" }
  ],
  "mark": { "leftVOpacity": 0.65, "rightVOpacity": 1 }
}`,
        },
        response: {
          format: "text",
          head: "wonmortech/design-system: @wonmor/tokens 0.1.0",
          body: "--theme-background-primary: var(--gray-050)   /* #faf9f5 */\n--theme-foreground-primary: var(--gray-950)   /* #141413 */\n--radius-card: 16px     --ease-out-quart: cubic-bezier(.165, .84, .44, 1)\n-- components use only --theme-*: .theme-slate swaps them on any subtree\n-- not on npm yet: npm install github:wonmortech/design-system",
        },
        marks: ["source", "hex", "leftVOpacity", "--theme-background-primary", ".theme-slate"],
      },
    },
    {
      id: "pr-ci",
      kind: "fix",
      nodes: { brand: null, tokens: null },
      metrics: { prchecks: 1 },
      focus: ["repo", "ci"],
      exchange: {
        edge: "check",
        request: {
          format: "text",
          head: ".github/workflows/ci.yml  (on: pull_request, merge_group)",
          body: "permissions: contents: read\nconcurrency: ci-<PR number>, cancel-in-progress: true\nactions/checkout@3d3c42e5...  # v7.0.1, pinned by commit SHA\n  persist-credentials: false\nnpm ci --no-audit --no-fund && npm run build\n-- ruleset on main: pull request, squash only, linear history, check \"build\" required\n-- Dependabot monthly and grouped; CODEOWNERS * @wonmortech/core; Scorecard weekly",
        },
        marks: ["permissions", "concurrency", "persist-credentials", "ruleset", "Dependabot"],
      },
    },
    {
      id: "old-deploy",
      kind: "problem",
      nodes: { site: { state: "slow" } },
      edges: {
        ship: { from: "repo", to: "site", flow: "fail", rate: 1 },
      },
      focus: ["repo", "site"],
      exchange: {
        edge: "ship",
        request: {
          format: "text",
          head: "the first deploy script, before PR #15",
          body: "npm run build && git add site/ && git commit    the built site lived in git: 851 files\nssh root@<server> \"tar -x ... && docker compose up -d --force-recreate\"\n-- a root shell on the server for every deploy\n-- the container was recreated each time: a short gap with no answer\n-- a pull request had no automatic check; a diff could swell to 14 000 lines of build output",
        },
        marks: ["851 files", "root", "--force-recreate", "no automatic check"],
      },
    },
    {
      id: "receive",
      kind: "fix",
      nodes: {
        site: { state: "ok" },
        rel: { kind: "storage", at: [12, 2] },
      },
      edges: {
        ship: { from: "ci", to: "site", flow: "request", rate: 1, mode: "call" },
        swap: { from: "site", to: "rel", rate: 1 },
      },
      metrics: { committed: 0 },
      focus: ["ci", "site", "rel"],
      exchange: {
        edge: "ship",
        request: {
          format: "text",
          head: "tar -czf - site -C deploy Caddyfile | ssh -i deploy_key root@*** \"deploy f0473de7d17a291968458a7f49bf7100a439ea7d\"",
          body: "authorized_keys on the server: restrict,command=\"/opt/wonmor-site/bin/receive\" <key>\nreceive.sh: the sha must be 40 hex chars; the archive must hold site/index.html and a Caddyfile\n            site/version.txt must equal the sha; links and special files are refused; at most 300 MB\nunpack to releases/<sha>; ln -sfn <sha> .current.tmp; mv -Tf .current.tmp current\na changed Caddyfile: caddy validate first, then caddy reload; if reload fails, swap back\nkeep the 5 newest releases plus the previous one",
        },
        response: {
          format: "text",
          head: "live: f0473de7d17a291968458a7f49bf7100a439ea7d",
        },
        marks: ["command=", "version.txt", "300 MB", "mv -Tf", "caddy validate", "5 newest"],
      },
    },
    {
      id: "verify",
      kind: "fix",
      edges: {
        probe: { from: "ci", to: "edge", rate: 1, mode: "call" },
      },
      focus: ["ci", "edge", "site", "rel"],
      exchange: {
        edge: "probe",
        request: {
          format: "text",
          head: ".github/workflows/deploy.yml after Ship",
          body: "curl -fsS https://wonmor.io/version.txt   up to 20 tries, 3 s apart, until it equals GITHUB_SHA\nsmoke: 200 on / /uz/ /ru/ /news/ /research/ /engineering/ /changelog/ /products/ /search/ /admin/\n       /rss.xml /changelog.xml /sitemap-index.xml /robots.txt /pagefind/pagefind.js /admin/sveltia-cms.js\n       404 on /this-page-does-not-exist/\n       the CSP of / still contains connect-src 'self';\nany failure after a successful Ship: ssh ... rollback  (the same forced command)",
        },
        marks: ["version.txt", "GITHUB_SHA", "404", "connect-src", "rollback"],
      },
    },
    {
      id: "lighthouse",
      kind: "fix",
      nodes: {
        lh: { kind: "worker", at: [12, 12] },
      },
      edges: {
        audit: { from: "ci", to: "lh", rate: 1, mode: "async" },
      },
      focus: ["ci", "lh"],
      exchange: {
        edge: "audit",
        request: {
          format: "json",
          head: "lighthouserc.json  (on every push to main, @lhci/cli 0.15.1)",
          body: `{
  "numberOfRuns": 3,
  "categories:performance": ["error", { "minScore": 0.85, "aggregationMethod": "median-run" }],
  "categories:accessibility": ["error", { "minScore": 1 }],
  "categories:best-practices": ["error", { "minScore": 1 }],
  "categories:seo": ["error", { "minScore": 1 }]
}`,
        },
        response: {
          format: "text",
          head: "6 pages: / /news/ /news/introducing-bitg-0-4/ /research/ /products/ /company/",
          body: "reports uploaded as an artifact for 14 days\nCaddy cache: pages and feeds no-cache; /assets/* (content-hashed) one year, immutable",
        },
        marks: ["numberOfRuns", "categories:performance", "aggregationMethod", "categories:accessibility", "immutable"],
      },
    },
    {
      id: "demos",
      kind: "case",
      nodes: { lh: null },
      metrics: { demos: 24, pages: 256 },
      focus: ["visitor", "edge", "site", "rel"],
      exchange: {
        edge: "pass",
        request: {
          format: "text",
          head: "PR #27: /demo, live demos of the products on sample data",
          body: "public/demo/<slug>/   24 static builds made by the demo PRs of each product repository\n/demo/<slug>/<route>  without a file extension falls back to that demo's index.html\nits own CSP for /demo/<slug>/ only; X-Robots-Tag: noindex; Pagefind skips them\nthe token and private-key scan still reads every demo file: 1297 files\ncheck-site ok: 256 pages",
        },
        marks: ["24", "index.html", "noindex", "1297", "256 pages"],
      },
    },
    {
      id: "org",
      kind: "case",
      focus: ["repo", "ci"],
      exchange: {
        edge: "check",
        request: {
          format: "text",
          head: "github.com/wonmortech  (organisation settings)",
          body: ".github         profile README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY: the defaults for every repo\nteams          core, maintainers, contributors; CODEOWNERS points at core\nper repo       a ruleset on main; secret scanning with push protection; private vulnerability reports\nActions        only GitHub-owned and verified actions; GITHUB_TOKEN read-only by default\nopen-source-fund  PLANNED: criteria and a draft application template, no applications, no money promised\nproduct code   lives in the dtwinuz organisation; this one holds the site and shared material",
        },
        marks: [".github", "teams", "push protection", "GITHUB_TOKEN", "PLANNED"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "stale-theme",
      from: "reader",
      steps: [
        {
          id: "theme-lost",
          kind: "problem",
          edges: { open: { flow: "fail" } },
          metrics: { stale: 24 },
          focus: ["visitor", "site"],
          exchange: {
            edge: "open",
            request: {
              format: "http",
              head: "GET /js/boot.js HTTP/1.1",
              headers: [["Host", "wonmor.io"]],
            },
            response: {
              format: "http",
              head: "HTTP/1.1 200 OK  (served from the browser cache)",
              headers: [["Cache-Control", "public, max-age=86400"]],
              body: "-- the cached copy is from PR #10 and knows 5 themes: light dark ink blueprint cobalt\n-- PR #12 added contrast paper dots glass the same day: wm-theme = paper is ignored\n-- the page paints in the system theme, unlike the page where the theme was picked\n-- max-age=86400 on an unchanged URL: for 24 hours the browser does not ask",
            },
            marks: ["Cache-Control", "max-age=86400", "wm-theme"],
          },
        },
        {
          id: "theme-fix",
          kind: "fix",
          edges: { open: { flow: "request" } },
          metrics: { stale: 0 },
          focus: ["visitor", "site"],
          exchange: {
            edge: "open",
            request: {
              format: "text",
              head: "src/layouts/Base.astro  (PR #13)",
              body: "bootVersion = sha256(public/js/boot.js).slice(0, 10)\n<script is:inline src=\"/js/boot.js?v=<bootVersion>\"></script>\n-- a changed file gets a new URL, so no cached copy can answer for it\n-- header.ts re-applies the saved theme if an old boot.js ever skipped it\n-- nobody types a version by hand: the hash follows the content",
            },
            marks: ["sha256", "v=", "header.ts", "by hand"],
          },
        },
      ],
    },
    {
      id: "honest-numbers",
      from: "content",
      steps: [
        {
          id: "numbers-wrong",
          kind: "problem",
          metrics: { claims: 2 },
          focus: ["cms", "repo"],
          exchange: {
            edge: "commit",
            request: {
              format: "text",
              head: "home page, 2026-11-13: \"635 merged PRs · Public GitHub search\" and \"15 live products\"",
              body: "curl api.github.com/search/issues?q=org:dtwinuz+is:pr+is:merged        -> 130  (anonymous)\ngh api -X GET search/issues -f q=\"org:dtwinuz is:pr is:merged\"          -> 648  (owner)\n-- 635 counted private repositories, but the label promised a public search\n-- products.json listed 16 products, and only 4 of them were running\n-- both numbers were typed by hand into src/data/company.ts",
            },
            marks: ["130", "648", "private repositories", "by hand"],
          },
        },
        {
          id: "numbers-fix",
          kind: "fix",
          metrics: { claims: 0 },
          focus: ["cms", "repo"],
          exchange: {
            edge: "commit",
            request: {
              format: "json",
              head: "src/data/numbers.json  (written by node tools/count-numbers.mjs, PR #19)",
              body: `{
  "asOf": "2026-11-14",
  "org": "dtwinuz",
  "repos": 26,
  "mergedPRs": 659,
  "releases": 22
}`,
            },
            response: {
              format: "text",
              head: "rules",
              body: "the owner runs it with access to every repository and commits the JSON\nCI never runs it: a build without access would quietly publish smaller numbers\nthe product count comes from products.json, not from a typed number",
            },
            marks: ["asOf", "mergedPRs", "releases", "CI never runs it"],
          },
        },
      ],
    },
  ],
});
