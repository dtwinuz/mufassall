import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Project: wonmor.io and the wonmortech organisation",
  summary:
    "wonmor.io is the site of Wonmor, an independent, self-funded brand from Uzbekistan, in English, Uzbek and Russian. Around it sits the wonmortech organisation: design tokens, brand files, a planned open-source fund and the shared profile and policies. How a reader and an editor use the site, how a static Astro build is checked, and how GitHub Actions ships it to a server that can only accept a release, swap a symlink and roll back.",
  learn: [
    "How the repositories fit together: the site, @wonmor/tokens, brand, open-source-fund and .github, with product code kept in another organisation",
    "The reader side (languages, themes, static search) and the editor side (Sveltia CMS at /admin, one commit per save)",
    "Build-time gates: content schema with required sources, CSP and privacy scan, link and illustration checks, Lighthouse CI",
    "Deploy by a forced-command SSH key: releases/<sha>, an atomic symlink swap, version check, smoke test and automatic rollback",
  ],
  nodes: {
    visitor: "Visitor's browser",
    edge: "dtwin.uz edge proxy",
    site: "wonmor-site (Caddy)",
    writer: "Editor",
    cms: "Sveltia CMS /admin",
    repo: "Site repository",
    ci: "GitHub Actions",
    tokens: "design-system",
    brand: "brand",
    rel: "releases/",
    lh: "Lighthouse CI",
  },
  metrics: {
    committed: "Build files kept in git",
    pages: "Pages built",
    demos: "Live product demos",
    prchecks: "Required checks on a PR",
    stale: "Life of a stale boot script",
    claims: "Home numbers nobody can reproduce",
  },
  steps: {
    intro: {
      short: "What it is",
      title: "A studio site in three languages",
      body: "wonmor.io presents Wonmor: who builds the products, what each product is, news with sources, research posts and policy pages. English lives at `/`, Uzbek at `/uz/`, Russian at `/ru/`. Wonmor is a brand, not a company: one founder builds the products with AI agents, and every change goes through a pull request.\n\nThe site is fully static. A small Caddy container serves the built files and sits behind the shared edge proxy of dtwin.uz, which handles the domain and TLS. The CSP allows nothing from other origins, so the page loads no third-party script, font or tracker.",
      fields: {
        Host: "One domain, wonmor.io; www redirects to it at the edge.",
        "Accept-Language": "Used only on the first visit to the bare home page, to suggest Uzbek or Russian.",
        "Cache-Control": "Pages are revalidated on every load, so a deploy is visible at once.",
        "Content-Security-Policy": "Scripts only from the site itself; wasm-unsafe-eval is there for the Pagefind search index.",
        "Referrer-Policy": "Other sites learn only the origin, not the page a reader came from.",
      },
    },
    reader: {
      short: "Reader",
      title: "A reader: language, theme and search",
      body: "A small script in `<head>` runs before the first paint. It applies the saved theme (nine of them, from light and dark to high contrast and paper) so the page never flashes the wrong colours. On the first visit to the bare `/` it opens the browser's language; deep English pages only offer the other language in a banner, because search engines advise against redirecting them.\n\nSearch works without a server: Pagefind builds an index at deploy time and the browser queries it with WebAssembly. Every product page, news post and research post is a plain HTML page that also works without JavaScript.",
      check: {
        q: "A visitor from Tashkent with an Uzbek browser opens a link to an English research post from a chat. What happens?",
        options: [
          "The page is redirected to /uz/ automatically",
          "The English post opens and a banner offers the Uzbek version",
          "An error page asks to choose a language",
        ],
        answer: 1,
        why: "Only the bare home page follows the browser's language. A deep link is an explicit choice of a page, and silently redirecting it would also confuse search engines, so the site offers the other language instead of forcing it.",
      },
      fields: {
        "wm-theme": "The saved theme; without it the CSS follows the system light or dark setting.",
        "wm-lang": "The language the visitor picked or last read in.",
        "wm-in": "Marks a visit that is already inside the site, so browsing never triggers a redirect.",
        "navigator.languages": "Read once, on a first visit, when nothing is saved yet.",
        pagefind: "A static search index: nothing to host, nothing to keep running.",
      },
    },
    editor: {
      short: "Editor",
      title: "An editor: Sveltia CMS at /admin",
      body: "News and research are written in a browser at `/admin`, without touching code. Sveltia CMS talks straight to the GitHub API: the editor signs in with a fine-grained token limited to this one repository, and every Save becomes a commit to `main` with a readable message.\n\nEach language is its own collection, so a post has three files side by side: `<slug>/en.md`, `uz.md`, `ru.md`. There is no CMS server and no database to back up: the repository is the content store, with its full history. `/admin` has its own, wider CSP (it must reach api.github.com) and is never indexed or cached.",
      fields: {
        backend: "GitHub itself is the backend: commits are the save button.",
        branch: "Saves go to main; the ruleset lets this path through, and the build still guards it.",
        "commit_messages.update": "Every content edit is a readable commit in the history.",
        collections: "One collection per language and type, so translations stay paired by folder.",
        "sign-in": "No OAuth app and no server: a token scoped to this repository, kept by the editor.",
      },
    },
    content: {
      short: "Content",
      title: "Content with a schema: no source, no post",
      body: "Every collection has a schema in `src/content.config.ts`. A news post is a dated fact and must list at least one source: here, the release page of the product it announces. Research posts can carry a `reproduce` block (repository, commit, commands) so a reader can repeat the result.\n\nA save from the CMS that breaks the schema does not reach the site: the build fails and the deploy never starts. Work that is only planned is labelled Planned on product pages and never appears as news.",
      check: {
        q: "An editor saves a news post from /admin and forgets the sources. What happens?",
        options: [
          "The post goes live without sources",
          "The commit lands on main, the build fails on the schema, nothing is deployed",
          "The CMS deletes the post",
        ],
        answer: 1,
        why: "The CMS writes the commit, but the Deploy workflow runs the same build as CI, and `source` is `min(1)` in the schema. A failing build means the live site keeps the previous release.",
      },
      fields: {
        category: "One of five: announcements, product, research, engineering, company.",
        source: "Links to where the fact comes from: a release, a commit, a public page.",
        "min(1)": "At least one source: an empty list is a build error.",
        planned: "Plans have their own label on product pages; news is only what happened.",
      },
    },
    build: {
      short: "Build",
      title: "One build command, several gates",
      body: "`npm run build` is the same on a laptop, in CI and in the deploy job. Astro renders every page in three languages into `site/`. The pinned Sveltia CMS bundle is copied into `site/admin/` so `/admin` loads it from the site's own origin. Pagefind indexes the result.\n\nThen three scripts read the finished output, not the source: they check what will actually ship. Why Astro: content collections with typed schemas, zero JavaScript by default, and a static result that a plain file server can serve.",
      fields: {
        "astro build": "Static output only; no server rendering, no runtime to patch.",
        "copy-cms.mjs": "The CMS comes from npm at a pinned version, never from a CDN.",
        pagefind: "Runs after Astro, on the built HTML.",
        "check-site.mjs": "Reads every file in site/ for things that must never ship.",
        "check-art.mjs": "Each post has its own generated illustration; a repeat on one page fails.",
      },
    },
    gates: {
      short: "Gates",
      title: "check-site: CSP and privacy, read from the output",
      body: "The public site ships `script-src 'self'`, so any inline script would be blocked in the browser. Instead of finding that out in production, check-site fails the build on it. The same pass looks for private IP addresses, token-shaped strings and private keys in every HTML, JS, CSS, JSON and XML file.\n\nThe owner can add more forbidden strings through the `WM_FORBIDDEN` environment variable without writing them into the public repository.",
      fields: {
        "inline <script> blocked by CSP": "Caught at build time, not as a silent failure in a reader's browser.",
        "private IP address": "Addresses from internal networks never belong on a public page.",
        "token-like string": "GitHub, GitLab and Slack token prefixes.",
        WM_FORBIDDEN: "A regex passed from outside, so the list of secrets is not itself public.",
      },
    },
    satellites: {
      short: "Satellites",
      title: "Brand and design tokens live in their own repositories",
      body: "The brand repository holds the mark, lockups, colours and the 19.4-second brand film. The mark is two V's: the left one at 65% opacity, the right one solid, so it reads as two V's and as one W. Because the mark is the letter w, the lockup is the mark plus \"onmor\". The site generates its logo and icons from the same geometry file the film was rendered from.\n\nThe design-system repository packages the site's tokens as `@wonmor/tokens` 0.1.0: colour, type scale, spacing, radius, easing. It is not on npm yet. Components use only the semantic `--theme-*` tokens, which is what lets a dark band like `.theme-slate` work on any part of a page.",
      fields: {
        source: "The page on wonmor.io is the source of truth; the repository is a condensed copy.",
        hex: "Wonmor Blue is for the mark only; the site itself uses warm greys around Paper.",
        leftVOpacity: "The lighter left V is what makes the mark read as both VV and W.",
        "--theme-background-primary": "A semantic token: components never use a raw grey or hex value.",
        ".theme-slate": "Swaps the semantic tokens on a subtree, so a dark section needs no new CSS.",
      },
    },
    "pr-ci": {
      short: "PR checks",
      title: "Every change is a pull request with a required check",
      body: "CI builds the site on every pull request with the same command as the deploy. A ruleset on `main` requires a pull request, squash merges, linear history and the `build` check. Only organisation admins can bypass it, which is the path CMS saves take.\n\nThe workflow is hardened the boring way: read-only token, actions pinned to a commit SHA, credentials not left in the checkout, one run per PR with older runs cancelled. Dependabot proposes grouped updates once a month, CODEOWNERS asks the core team to review, and OpenSSF Scorecard runs weekly.",
      check: {
        q: "Why pin actions/checkout to a 40-character SHA instead of @v7?",
        options: [
          "It runs faster",
          "A tag can be moved to other code; a commit SHA cannot, and Dependabot still updates it",
          "GitHub requires it",
        ],
        answer: 1,
        why: "A tag is a movable pointer. If an action's repository were taken over, @v7 could point at malicious code tomorrow. A SHA is immutable, and the comment `# v7.0.1` plus Dependabot keep it readable and current.",
      },
      fields: {
        permissions: "The job's token can read the repository and nothing else.",
        concurrency: "A new push to the PR cancels the older run.",
        "persist-credentials": "The token is not left in .git/config for later steps to find.",
        ruleset: "Branch protection for main; required check build, squash only.",
        Dependabot: "Monthly, grouped (astro, fonts, everything else, actions), so updates arrive as a few PRs.",
      },
    },
    "old-deploy": {
      short: "Old deploy",
      title: "Before: built files in git and a root shell",
      body: "The first deploy script built locally, committed the whole `site/` folder (851 files) and copied it over a root SSH session, then recreated the container. Every deploy meant a short gap with no answer, every pull request carried thousands of lines of generated HTML, and nothing checked a PR automatically.\n\nThe move to the wonmortech organisation (PR #15) replaced all of that.",
      fields: {
        "851 files": "Generated output in git: noisy diffs and merge conflicts in files nobody edits.",
        root: "Any deploy could do anything on the server.",
        "--force-recreate": "Stop, then start: requests during the restart got no answer.",
        "no automatic check": "A broken page was found by readers, not by CI.",
      },
    },
    receive: {
      short: "Receive",
      title: "A key that can only publish a release",
      body: "After a merge, the Deploy job builds, writes the commit SHA into `site/version.txt` and streams a tarball over SSH. On the server the key is bound to one script with `restrict,command=...`: whatever the client asks, only `receive` runs, and it understands three words: deploy, rollback, status.\n\n`receive` checks the archive, unpacks it to `releases/<sha>` and switches `releases/current` with a rename, which is atomic: Caddy serves either the old release or the new one, never half of each. A new Caddyfile is validated before it is loaded. Why this design: no root shell for CI, no container restart, and the previous release is still on disk for an instant rollback.",
      check: {
        q: "The CI deploy key leaks. What can an attacker do with it?",
        options: [
          "Open a root shell on the server",
          "Only call receive: publish an archive that passes its checks, roll back, or read the live revision",
          "Read the other sites on the server",
        ],
        answer: 1,
        why: "The forced command replaces whatever the client asks for. Damage is limited to publishing a site-shaped archive, which is serious but visible and reversible, and the key can be rotated without touching anything else.",
      },
      fields: {
        "command=": "A forced command in authorized_keys: this key runs receive and nothing else.",
        "version.txt": "The archive must carry the same SHA it claims, so a stale build cannot slip in.",
        "300 MB": "A cap on what is read from stdin.",
        "mv -Tf": "rename(2) over the old symlink: the switch is atomic.",
        "caddy validate": "A broken Caddyfile is refused before it can take the site down.",
        "5 newest": "Old releases are pruned, but never the live one or the previous one.",
      },
    },
    verify: {
      short: "Verify",
      title: "Trust nothing until the live site says so",
      body: "\"Exit code 0\" from SSH is not proof. The job polls `/version.txt` through the public domain until it returns the merged SHA, which proves the edge, the container and the symlink all point at the new release. Then it requests sixteen paths that must answer 200, one that must answer 404, and checks that the public CSP was not widened.\n\nIf any of that fails after the archive was shipped, the job calls the same forced command with `rollback`, which points `current` back at the previous release.",
      check: {
        q: "Why check /version.txt rather than \"the home page answers 200\"?",
        options: [
          "version.txt is smaller",
          "The old release also answers 200; only the SHA proves the new one is what readers get",
          "The home page is cached",
        ],
        answer: 1,
        why: "A failed swap leaves the previous release online and perfectly healthy. A 200 would pass; comparing the served SHA with the merged one is what detects that the deploy did not take.",
      },
      fields: {
        "version.txt": "Written in the build, checked twice: by receive and through the public URL.",
        GITHUB_SHA: "The merged commit: what must be live.",
        "404": "A missing page must stay missing, not fall back to the home page.",
        "connect-src": "The public CSP must still forbid connections to other origins.",
        rollback: "Same key, same script: one word back to the previous release.",
      },
    },
    lighthouse: {
      short: "Lighthouse",
      title: "Quality budgets on every push to main",
      body: "A separate workflow builds the site and runs Lighthouse CI on six representative pages, three runs each, judged on the median. Accessibility, best practices and SEO must score 100; performance at least 85, because shared CI runners are noisy.\n\nCaching is part of the same budget: Astro gives built assets content-hashed names, so Caddy can cache `/assets/*` for a year as immutable, while pages and feeds are revalidated on every load.",
      check: {
        q: "Why may /assets/* be cached for a year while pages are no-cache?",
        options: [
          "Assets never change",
          "A changed asset gets a new hashed file name; a page keeps its URL, so it must be revalidated",
          "Browsers ignore Cache-Control on HTML",
        ],
        answer: 1,
        why: "The URL of a hashed asset changes with its content, so a cached copy can never be wrong. A page URL stays the same across deploys, so the browser must ask each time.",
      },
      fields: {
        numberOfRuns: "Three runs per page, to smooth out one slow run.",
        "categories:performance": "At least 0.85: real, but tolerant of runner noise.",
        aggregationMethod: "The median run decides, not the best or the worst.",
        "categories:accessibility": "Must be a perfect 1: accessibility regressions block.",
        immutable: "The browser does not even revalidate a hashed asset.",
      },
    },
    demos: {
      short: "Demos",
      title: "Live demos of the products, on sample data",
      body: "`/demo` shows 24 products running as static copies on sample data, made by demo pull requests in each product's repository, among them the gym diary and the Halvet site. A visitor can click through a real interface without an account.\n\nThey live inside the same release but under their own rules: their own CSP, `noindex`, and an `index.html` fallback per demo so client-side routes work. The secret scan still reads all 1297 demo files, because copied output is exactly where a stray token would hide.",
      fields: {
        "24": "Product demos plus a gallery page in three languages.",
        "index.html": "A route like /demo/gym/plan opens the demo's own app shell.",
        noindex: "Demos are not search results; the product pages are.",
        "1297": "Every demo file passes the token and private-key scan.",
        "256 pages": "The site's own pages after the demos landed.",
      },
    },
    org: {
      short: "Organisation",
      title: "The organisation around the site",
      body: "The `.github` repository holds the organisation profile and the default contributing guide, code of conduct and security policy for every repository. Three teams (core, maintainers, contributors) map to admin, maintain and write; CODEOWNERS points at core. Each repository has a ruleset, secret scanning with push protection and private vulnerability reporting.\n\nThe open-source-fund repository describes a planned fund for independent open-source builders in Uzbekistan. Its first line says it is not open: no applications, no money promised, because Wonmor is not yet a legal entity. The product code itself lives in the dtwinuz organisation; wonmortech holds the site and the shared, open material.",
      fields: {
        ".github": "Community files here apply to every repository that has none of its own.",
        teams: "Permissions by team, not by person.",
        "push protection": "A push containing a known secret format is rejected before it lands.",
        GITHUB_TOKEN: "Read-only unless a workflow asks for more.",
        PLANNED: "Honesty rule: a plan is written as a plan, in the first line.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "1) Two organisations: dtwinuz holds product code, wonmortech holds the site, tokens, brand, fund and community files. 2) The site is static Astro in three languages; the server only serves files. 3) Readers get saved themes and languages from a pre-paint script and serverless search. 4) Editors use Sveltia CMS: every save is a commit, the repository is the database. 5) One build command everywhere, followed by gates that read the output: schema with sources, CSP, privacy scan, links, illustrations. 6) Every change is a PR with a required build check, pinned actions and read-only tokens. 7) Deploy is a forced-command key: releases/<sha>, atomic symlink swap, validated Caddy config, version check, smoke test, automatic rollback. 8) Lighthouse CI keeps accessibility, best practices and SEO at 100.",
    },
  },
  scenarios: {
    "stale-theme": {
      label: "Theme forgotten",
      steps: {
        "theme-lost": {
          short: "Lost",
          title: "The theme does not stick across pages",
          body: "Two releases on the same day added themes: PR #10 three, PR #12 four more. Visitors picked Paper, moved to the next page, and got the system theme again. The page HTML was fresh, but `/js/boot.js` had a plain URL and a day of browser cache, so many browsers kept running yesterday's copy that did not know the new names.",
          check: {
            q: "Why did the HTML update and the script not?",
            options: [
              "The script was broken",
              "HTML is no-cache, while the script had max-age=86400 on an unchanged URL",
              "The CDN was slow",
            ],
            answer: 1,
            why: "With max-age the browser does not even ask the server for a day. As long as the URL stays the same, a new file on the server is invisible to it.",
          },
          fields: {
            "Cache-Control": "Set for /js/* in the Caddyfile: one day.",
            "max-age=86400": "For 24 hours the browser uses its own copy without asking.",
            "wm-theme": "The saved choice was right; the old script simply did not recognise it.",
          },
        },
        "theme-fix": {
          short: "Hash URL",
          title: "A content hash in the URL",
          body: "The layout now computes a short SHA-256 of `boot.js` at build time and loads `/js/boot.js?v=<hash>`. Any change to the file changes the URL, so no cached copy can answer for it, and the day of caching is safe again. As a second net, the header script re-applies the saved theme if an old boot script ever missed it: one late repaint is better than a wrong theme.",
          fields: {
            sha256: "Computed from the file itself during the build.",
            "v=": "A new query string is a new URL for the browser cache.",
            "header.ts": "A fallback for the rare old copy that still runs.",
            "by hand": "Hand-typed versions get forgotten; a hash cannot be.",
          },
        },
      },
    },
    "honest-numbers": {
      label: "Honest numbers",
      steps: {
        "numbers-wrong": {
          short: "Wrong",
          title: "Home page numbers that readers cannot reproduce",
          body: "The home page said \"635 merged PRs · Public GitHub search\" and \"15 live products\". An anonymous GitHub search returns 130, because many dtwinuz repositories are private; the owner's own search returns 648. And of 16 products in the data file, only 4 were actually running. Both numbers had been copied by hand into a TypeScript file.",
          check: {
            q: "What is the honest fix?",
            options: [
              "Show 130, the public number",
              "Count with full access, label it as such, record the date, and derive the product count from the data",
              "Remove all numbers",
            ],
            answer: 1,
            why: "The number is real, the label was wrong. A dated count with the method written next to it can be checked; a hand-typed number with the wrong source cannot.",
          },
          fields: {
            "130": "What anyone without access sees.",
            "648": "The same query with owner access on the same day.",
            "private repositories": "Counted, but the label promised a public search.",
            "by hand": "No script, no date, no way to recount.",
          },
        },
        "numbers-fix": {
          short: "Counted",
          title: "A counting script, run by the owner, committed as data",
          body: "`tools/count-numbers.mjs` counts repositories, merged pull requests and releases through the GitHub CLI and writes `src/data/numbers.json` with the date. The owner runs it and commits the file. CI deliberately never runs it: without access to private repositories a build would quietly publish smaller numbers. The product count is now computed from `products.json`.",
          fields: {
            asOf: "The date of the count, shown with the numbers.",
            mergedPRs: "659 on 2026-11-14, counted with full access.",
            releases: "Non-draft releases across all repositories.",
            "CI never runs it": "A wrong number from a partial view is worse than a dated one.",
          },
        },
      },
    },
  },
};

export default text;
