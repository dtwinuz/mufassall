import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Project: mufassall",
  summary:
    "mufassall (github.com/dtwinuz/mufassall, mufassall.dtwin.uz) is the course you are reading: system design taught with moving scenes, the real request on the wire and a question before every next step, in Uzbek, Russian and English. The repository was started on 17 November 2026 and reached Round 11 two days later with 82 lessons and 1 711 tests. This lesson walks through it the way it walks through other systems: what the reader gets, how a lesson is stored and played, the static site and the one small API, and the pipelines that keep it safe: CI with leak-guard, hash-based CSP, and a deploy that can only swap a folder and rolls itself back.",
  learn: [
    "The reader side: lessons, Lab, spaced review, section tests and your own systems, all without an account, kept in your browser",
    "A lesson is data: a TypeScript scene of patches, three text files checked by the compiler, and an engine that plays any of them",
    "A static Astro site plus one dependency-free Node API, behind a strict CSP whose script hashes are computed at build time",
    "CI that refuses leaks, and a deploy key that can do one thing: unpack a release, swap a symlink, and roll back if the smoke test fails",
  ],
  nodes: {
    reader: "Reader",
    browser: "Browser",
    edge: "Edge proxy",
    site: "Static site",
    local: "localStorage",
    repo: "GitHub repo",
    ci: "GitHub Actions",
    api: "mufassall-api",
    tg: "Telegram",
    agents: "Agent round",
  },
  metrics: {
    lessons: "Lessons",
    tests: "Tests",
    js: "JavaScript on a lesson page (gzip)",
    alerts: "Open CodeQL alerts",
    leaks: "Leaks found in the build",
    cls: "Layout shift (CLS)",
  },
  steps: {
    setup: {
      short: "What it is",
      title: "A course that shows systems moving",
      body: "Most system design material is a box diagram and a page of text. Here each lesson is a scene: blocks for clients, services, queues and databases, packets that move along the lines, metric tiles that turn red when something breaks, and the exact request that crosses the selected line. Before the next step the reader predicts what will happen.\n\nWho it is for: developers, testers, analysts and team leads who want to understand how real systems behave, in Uzbek first, with equal Russian and English. Everything is free and public; there is no sign-up. The course map has 82 lessons in 11 sections, from foundations and scaling to business systems and case studies.",
      watch: "The numbers in the tiles come from the repository and its pull requests: lessons and tests at Round 11, the lesson page weight since Round 2, CodeQL alerts and layout shift as last measured.",
      fields: {
        "82 lessons": "Lessons on main after Round 11 (19 Nov 2026); Round 10 had 78.",
        "/uz/l/callbacks/": "Every lesson has its own URL per language; ?step=N opens a given step.",
        "/uz/lab/": "A diagram editor with a load simulation: steady state and a seeded time-based run.",
        "/uz/review/": "Questions the reader has already met come back on a schedule.",
        "70 %": "Pass mark of the 10-question section test.",
        "/uz/me/": "Progress overview, export to a file and a transfer code for another device.",
        "/uz/author/": "Lesson editor and the library of your own systems.",
      },
    },
    lesson: {
      short: "A lesson",
      title: "One step: scene, metrics, wire and a question",
      body: "A step has a kind: a problem appears, a fix lands, a case is shown, or the lesson recaps. The player draws the scene and says what changed since the last step: a new block, a line that turned red, a metric that moved. Under it the wire panel prints the real message on the selected line, with numbered fields explained in plain words.\n\nThe question comes before the answer. Some lessons add a scenario switcher (the same system, another ending: the provider is late, the queue fills up) and what-if sliders that recompute the outcome from a small model.",
      fields: {
        isometric: "Blocks on a 13 by 13 grid, drawn in SVG; no canvas, no WebGL.",
        "what changed": "diff() between two step scenes, so the reader sees only the new part.",
        metrics: "Up to six tiles per lesson, each knows if higher or lower is better.",
        wire: "HTTP, JSON, XML or plain text; marked fragments get numbered notes.",
        check: "A prediction question; the first answer is remembered for review.",
        scenario: "An alternative branch that starts from a chosen step.",
        "what-if": "Sliders on a few lessons, recalculated in the browser.",
      },
    },
    practice: {
      short: "Practice",
      title: "Progress without an account",
      body: "The course stores nothing about the reader on a server. Progress, the first answer to each question, the review schedule, section test results and the days you studied live in localStorage under the `mufassall:` prefix. Review uses FSRS-5, an open spaced-repetition scheduler: each card keeps a stability and a difficulty, and the next date is the day the reader would likely forget it.\n\nThe price of no account is a lost browser. /me covers it: it exports one file, or a short transfer code, and imports with a strict per-key merge (the later review wins, the higher test score wins).",
      fields: {
        progress: "The furthest step reached in each lesson.",
        checks: "First answer to each prediction question: right or wrong.",
        "FSRS-5": "Free Spaced Repetition Scheduler with its published default parameters.",
        tests: "Best section test score and when it was reached.",
        streak: "Days with any learning activity, for the streak and the daily goal.",
        "no account": "Nothing to leak, nothing to reset; moving devices is a file or a code.",
      },
    },
    author: {
      short: "My systems",
      title: "Your own systems, played like a lesson",
      body: "/author is a lesson editor: steps, blocks, lines, texts in three languages, a request per step, live warnings and a preview. Since Round 11 it keeps a library under /my/: many systems, each created empty, from a BPMN file, from a GitLab CI or GitHub Actions YAML, from Mermaid, or from an existing lesson. /my/view/ plays one with the real lesson player.\n\nThis is meant for company systems, so the rule is strict: it all stays in the browser. Sharing is a `.mufassall.json` file the person saves themselves (up to 50 systems, 5 MB) or a `#s=` link whose compressed content sits after the hash and never reaches the server. Viewed systems are marked noindex and show no feedback form.",
      fields: {
        format: "Fixed marker; a file with any other format is refused.",
        v: "Format version, so a later change can still read old files.",
        systems: "Up to 50 entries; extras are skipped, broken ones dropped and counted.",
        source: "Where it came from: blank, bpmn, gitlab-ci, github-actions, mermaid, file, lesson or link.",
        draft: "The editable lesson: steps, scene patches, texts. Sanitized on import.",
      },
    },
    schema: {
      short: "Format",
      title: "A lesson is a typed scene plus three text files",
      body: "Every lesson is a folder: `lesson.ts` with the scene and `uz.ts`, `ru.ts`, `en.ts` with the words. A step lists only what changes; `resolve()` folds the patches into a full scene per step, and `diff()` tells the player what is new. The scene never holds prose and the text files never hold layout, so translators and authors do not collide.\n\nThe text type is derived from the scene: a missing node name, step title or field note in any language is a compile error. Validation with zod is a separate subpath, so it runs in tests and the build but never ships to the reader. Tests then check the layout: no two blocks on one cell, no line through another block's label, every marked fragment present in its message.",
      fields: {
        defineLesson: "Identity function with a const generic: keeps ids as literal types for the texts.",
        "only what changes": "Patches, not full scenes; a step can add, change or remove blocks and lines.",
        "resolve()": "Turns the patch list into one complete scene per step.",
        "diff()": "Compares two scenes and returns the changes the player highlights.",
        "./validate": "The zod schema lives here, out of the browser bundle.",
        LessonText: "The type of uz.ts, ru.ts and en.ts, computed from lesson.ts.",
      },
    },
    engine: {
      short: "Engine",
      title: "The player is small on purpose",
      body: "`packages/scene-engine` is written as React components but ships as Preact through compat aliases; Round 2 cut the lesson page from about 135 KB of JavaScript to about 24 KB gzip this way, with motion done in CSS. The scene is SVG on a 2:1 isometric grid. The wire panel finds marked fragments with hand-written linear scanners, not regular expressions, after CodeQL flagged a backtracking pattern.\n\nThe Lab has two models: a steady-state one (utilisation is arrival rate over capacity) and, since Round 10, a seeded discrete-event simulation that shows a queue filling during a spike and draining afterwards. Anything heavy is loaded only when the reader asks for it: the video recorder, the YAML parser for CI import.",
      fields: {
        Preact: "React API, about a tenth of the size; pnpm needed absolute aliases to resolve it.",
        "no animation library": "Transitions in CSS and a tiny tween; the old motion library is gone.",
        "2:1 isometric": "One grid unit is 64 by 32 pixels on screen.",
        "linear scanners": "One pass over the text, so no input can make it slow (polynomial ReDoS).",
        "des.ts": "Discrete-event simulation with a seed: the same input gives the same chart.",
        "dynamic import()": "Code that most readers never use is not in the first download.",
      },
    },
    site: {
      short: "Site",
      title: "Astro builds every page ahead of time",
      body: "The site is Astro with `output: static`. `pnpm gen` writes the lesson registry from the folders that have all four files, then one page per lesson and language is built, with a share image, search and review indexes, section test banks and a service worker for offline use. Nothing is rendered on request.\n\nA postbuild step does two jobs a static host cannot: it writes the sitemap and computes a sha256 of every inline script, then puts those hashes into the Caddyfile's Content-Security-Policy. An inline script added in a page is allowed by the next build on its own, and a script injected by anyone else is not.",
      fields: {
        "pnpm gen": "Generates content/registry.ts; a half-written lesson folder is skipped.",
        "astro build": "Pages under /uz/, /ru/ and /en/, with trailing slashes.",
        "og images": "A 1200x630 share card per lesson, drawn from the lesson's own data.",
        "search.json": "Static indexes the browser downloads; no search server.",
        "sw.js": "Service worker: lessons, Lab, glossary and review keep working offline.",
        "564 pages": "Sitemap size at Round 11.",
        "inline script hashes": "tools/postbuild.mjs fills the CSP placeholder in the Caddyfile.",
      },
    },
    api: {
      short: "API",
      title: "One small API with no dependencies",
      body: "A course needs a few dynamic things: \"this step is unclear\" feedback, a public gallery of Lab diagrams, and a Telegram bot that sends one question card a day to subscribers. They live in one Node 22 process, `mufassall-api`, with zero npm dependencies. It stores JSON files, never IP addresses, and accepts only known fields with strict limits.\n\nIt runs as its own container: read-only file system, all Linux capabilities dropped, 128 MB of memory, a non-root user and a health check. The site's Caddy passes only `/api/*` to it, with bodies up to 16 KB. Feedback marked as an error is forwarded to the maintainer's Telegram.",
      watch: "CI never touches this container: CI ships static files only. The API is updated by a separate bootstrap command run by a maintainer.",
      fields: {
        lesson: "Lesson slug, checked against the id pattern.",
        step: "Step id inside the lesson.",
        kind: "unclear, error or good; anything else is refused.",
        text: "Optional, up to 500 characters.",
        "204 No Content": "Accepted, nothing to return. 20 feedback posts per 10 minutes per client.",
      },
    },
    security: {
      short: "Headers",
      title: "A strict CSP without unsafe-inline",
      body: "Every response carries the same headers from the site's Caddyfile. The Content-Security-Policy allows scripts only from the site itself and the exact inline scripts whose hashes the build computed; no `unsafe-inline`, no eval, no third-party script, no framing. Pages are revalidated on every visit, while hashed assets under `/_astro/` are cached for a year as immutable.\n\nThe lesson behind this decision is simple: a static site has no login to steal, but it can still be used to run someone else's script on a trusted domain. Hashes make the allow-list exact and automatic.",
      check: {
        q: "A new page adds a small inline script. Under this CSP, what happens on the next deploy?",
        options: [
          "The browser blocks it until someone edits the Caddyfile by hand",
          "The build hashes it and adds the hash to the CSP, so it runs; a script injected later has no hash and is blocked",
          "CSP is ignored for inline scripts on the same domain",
        ],
        answer: 1,
        why: "postbuild computes the sha256 of every inline script in the built HTML and writes the list into script-src. The allow-list follows the code automatically, and anything not built by the repo stays blocked.",
      },
      fields: {
        "Content-Security-Policy": "script-src 'self' plus build-time sha256 hashes; frame-ancestors 'none'.",
        "Cache-Control": "no-cache for pages; immutable for hashed /_astro/ files.",
        "X-Content-Type-Options": "nosniff: the browser does not guess file types.",
        "Cross-Origin-Opener-Policy": "same-origin: other sites cannot hold a handle to this window.",
      },
    },
    ci: {
      short: "CI",
      title: "What every change must pass",
      body: "Every pull request and every push to main runs the same pipeline: install from the lockfile, typecheck every package (which also checks every lesson's texts against its scene), the vitest suite, the API's node tests, the i18n check, the build, and leak-guard. Actions are pinned by commit SHA, Dependabot proposes updates monthly with a 7-day cooldown, and CodeQL scans the code.\n\nleak-guard reads the built site, not the source: private IP ranges, IP with port, connection strings, private keys, tokens, bearer headers and internal-tier markers fail the build. A repository secret adds private patterns (company names, hosts) that cannot themselves be written in a public repo.",
      fields: {
        "--frozen-lockfile": "The lockfile is the truth; CI never resolves new versions.",
        typecheck: "tsc over all packages; a missing translation is a type error.",
        "1711": "Vitest tests on main at Round 11 (1 504 at Round 10).",
        "check:i18n": "Every UI key in three languages; uz and en may not contain Cyrillic.",
        "check:leaks": "tools/leak-guard.mjs over apps/web/dist.",
        CodeQL: "Default setup; it caught two polynomial-ReDoS patterns that were replaced by plain loops.",
        "pinned by SHA": "A moved tag cannot change what runs in CI.",
      },
    },
    deploy: {
      short: "Deploy",
      title: "A key that can only receive a release",
      body: "After CI on main, deploy.yml builds the site, writes the commit into `version.txt`, and streams one archive over SSH. On the server that key is bound by `authorized_keys` to a single program, `receive`: it cannot open a shell or run anything else. receive takes a lock, caps the archive at 300 MB, checks that version.txt matches the commit, refuses links and special files, unpacks into `releases/<sha>` and swaps the `current` symlink atomically. A changed Caddyfile is validated first and swapped back if the reload fails.\n\nThen CI checks from outside: the public `version.txt` must show the new commit, 64 URLs must answer 200, an unknown page 404, and the CSP header must be present. If anything fails, CI calls `rollback` and the previous release is live again.",
      check: {
        q: "Why bind the deploy key with `restrict,command=` to receive instead of giving CI a normal SSH login?",
        options: [
          "It makes uploads faster",
          "A stolen CI secret then can only deliver a release to one folder; it cannot run commands, read other services or change containers",
          "GitHub requires it for SSH deploys",
        ],
        answer: 1,
        why: "The SSH server runs receive whatever the client asks. The worst a leaked key can do is publish a static site that still has to pass validation, and the previous release stays one rollback away.",
      },
      fields: {
        "restrict,command": "OpenSSH forced command: no shell, no forwarding, one program.",
        flock: "Two deploys at once cannot interleave.",
        "version.txt == sha": "The archive must contain the commit it claims to be.",
        "atomic swap": "ln -sfn to a temp link, then mv -T over current: never a half-written site.",
        "caddy validate": "A broken config is refused before it can take the site down.",
        "64 URLs": "Home, sections, lessons, Lab and tools in each language must answer 200.",
        rollback: "current goes back to PREVIOUS; five releases are kept.",
      },
    },
    rounds: {
      short: "Rounds",
      title: "Built in rounds by orchestrated agents",
      body: "The course was written in rounds. A lead agent writes one brief: goals, rules, the lesson shape, the leak rules. Parallel agents each take a few lessons or one feature in their own folders, run the checks, and report back. The lead merges, runs the full check and opens a single squash pull request with an overview, evidence and a before/after table.\n\nFrom the first commit to Round 11 took three days: foundation, deploy with hash-based CSP, the real-request layer, the full 42-lesson course, then a round for each larger step: a lighter player, review, tests, author mode, PlantUML, BPMN and an MCP server, video export, time-based simulation, and your own systems.",
      fields: {
        Foundation: "Scene format, player, the first lesson, a three-language site (17 Nov 2026).",
        "hash-based CSP": "The security model was in place before any content.",
        "42 lessons": "The first full course in 10 sections, with the Lab editor.",
        "Round 2": "Preact player, search, offline mode, Lab simulation.",
        "MCP server": "Round 8: AI agents can list, read and validate lessons over stdio.",
        "Round 11": "My systems library, CI and Mermaid import, 4 more lessons (19 Nov 2026).",
        "one squash PR": "One reviewable change per round, one commit on main.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "1) The reader gets lessons with moving scenes, the real request and a question before each step, plus Lab, review, tests and their own systems, with no account. 2) Everything personal stays in the browser; moving devices is a file or a code, sharing a system is a file or a hash link. 3) A lesson is a typed scene of patches plus three text files; the compiler finds a missing translation. 4) The player is Preact, SVG and CSS, with heavy parts loaded on demand. 5) Astro builds every page ahead of time; postbuild hashes inline scripts into a strict CSP. 6) One dependency-free API in a locked-down container handles feedback, gallery and the bot. 7) CI typechecks, tests, builds and runs leak-guard on the output. 8) The deploy key can only receive a release; an atomic swap, an outside smoke test and automatic rollback keep the site up.",
    },
  },
  scenarios: {
    "layout-shift": {
      label: "Jumping page",
      steps: {
        shift: {
          short: "CLS 0.124",
          title: "The progress page jumped after it loaded",
          body: "Lighthouse on the live site gave /uz/me/ a Cumulative Layout Shift of 0.124, above the 0.1 limit, and /en/author/ 0.08. On /me both the empty-state card and the overview card were hidden in the HTML; me.js chose one after the first paint and pushed the sections down. On /author a 16:9 skeleton was replaced by a much taller editor, and the footer jumped.",
          check: {
            q: "What is the cleanest fix for the /me jump on a static site with a strict CSP?",
            options: [
              "Render the card on the server for each visitor",
              "A tiny inline script that picks the right card before the first paint; the build adds its hash to the CSP",
              "Delay showing the whole page until me.js has loaded",
            ],
            answer: 1,
            why: "The data is in localStorage, so only the browser knows which card to show. Choosing before the first paint removes the shift, and because postbuild hashes inline scripts, the CSP allows it with no manual change. Hiding the whole page would trade CLS for a slower first paint.",
          },
          fields: {
            "CLS 0.124": "Measured with Lighthouse 12.8.2, mobile profile.",
            "layout-shifts": "The audit names the element that moved.",
            "footer.site-foot": "On /author the footer moved when the editor mounted.",
            "after the first paint": "The decision came too late: the page was already drawn.",
          },
        },
        settle: {
          short: "CLS 0.001",
          title: "Decide before the first paint, reserve the height",
          body: "Round 9 added an inline script on /me that reads localStorage and shows the right card before the browser paints; me.js refines it later. Its hash went into the CSP by itself at postbuild. On /author the skeleton now reserves 110% of the viewport height, so the footer starts below the screen. Measured again: /uz/me/ CLS 0.001 with Performance 98, /en/author/ CLS 0.002.",
          fields: {
            "inline script": "A few lines that run before the first paint.",
            postbuild: "Computes the new hash; no hand edit of the CSP.",
            "min-height: 110vh": "The placeholder is at least as tall as the editor it stands for.",
            "CLS 0.001": "Lighthouse on a local build, same profile as before.",
          },
        },
      },
    },
    "leak-caught": {
      label: "Caught leak",
      steps: {
        hit: {
          short: "Red build",
          title: "leak-guard stops a lesson",
          body: "In Round 7 a new lesson about secrets management used a private 10.x address as an example host. The address meant nothing, but leak-guard cannot tell an example from a real internal host, and a public course is no place to guess. It found the address in the built HTML, the job failed, and nothing was deployed.",
          check: {
            q: "The address was only an example. What is the right reaction?",
            options: [
              "Add an exception to leak-guard for this lesson",
              "Replace it with an address from a documentation range that can never route, and keep the rule strict",
              "Turn leak-guard off for content folders",
            ],
            answer: 1,
            why: "An exception teaches everyone that red can be waved through. RFC 5737 reserves three ranges for documentation exactly for this case; with them the lesson still reads naturally and the rule stays absolute.",
          },
          fields: {
            "private IPv4": "The rule matches 10.x, 172.16-31.x and 192.168.x addresses anywhere in the output.",
            "exits 1": "A non-zero exit fails CI; deploy waits for a green CI run.",
            "an example": "Rules cannot know intent, so content must not look like a leak.",
          },
        },
        "doc-range": {
          short: "Doc range",
          title: "Use addresses that can never be real",
          body: "The example became 198.51.100.17, from a range RFC 5737 sets aside for documentation. leak-guard allows these three ranges even with a port, so lessons can show realistic addresses. The build went green and the lesson shipped. The same thing happened again in Round 11 with example addresses in a new lesson; that time they were replaced with host names.",
          fields: {
            "198.51.100.17": "TEST-NET-2: it looks like a real address and routes nowhere.",
            "RFC 5737": "192.0.2.0/24, 198.51.100.0/24 and 203.0.113.0/24 are reserved for documentation.",
            "leak-guard ok": "Zero findings; the build continues to deploy.",
          },
        },
      },
    },
    preact: {
      label: "Heavy player",
      steps: {
        heavy: {
          short: "135 KB",
          title: "A lesson page carried a whole framework",
          body: "The first player used React and a motion library. A lesson page shipped about 135 KB of gzipped JavaScript, and a phone on a slow network had to download and parse all of it before the first packet could move. For a course meant to be read on phones, that was the wrong default.",
          check: {
            q: "What is the cheapest way to cut most of that weight without rewriting the player?",
            options: [
              "Server-render every step as an image",
              "Keep the React source but alias React to Preact compat at build time, and do motion in CSS",
              "Split the page into more script files",
            ],
            answer: 1,
            why: "Preact implements the same component API in a fraction of the size, so the source stays. Motion in CSS removes the second library. Splitting files keeps the same total weight.",
          },
          fields: {
            "react-dom": "The renderer alone is most of the weight.",
            "motion library": "A second dependency just for enter and exit animations.",
            "135 KB": "Gzipped JavaScript on a lesson page before Round 2.",
          },
        },
        aliases: {
          short: "Traps",
          title: "Two things broke during the swap",
          body: "pnpm keeps every package's dependencies strictly separate, so the engine package could not resolve `preact/compat` through a relative alias; the aliases had to be absolute in the Astro config. And SVG nodes need the attribute written as lowercase `tabindex`, which React used to translate silently.",
          fields: {
            "pnpm strict": "A package sees only the dependencies it declares.",
            "absolute aliases": "react and react-dom point to preact/compat by absolute path.",
            tabindex: "SVG attributes are written as the DOM expects them.",
          },
        },
        light: {
          short: "24 KB",
          title: "Same source, about 24 KB",
          body: "With Preact at runtime and motion in CSS plus a tiny tween function, the lesson page dropped to about 24 KB of gzipped JavaScript. The component source did not change. In Round 3 Lighthouse gave a lesson page 100 for accessibility, best practices and SEO.",
          fields: {
            "unchanged source": "Components are still written against the React API.",
            "small tween": "A few lines for numeric animation; the rest is CSS transitions.",
            "24 KB": "Gzipped JavaScript on a lesson page after Round 2.",
            Lighthouse: "Mobile profile, measured on a lesson page and on review.",
          },
        },
      },
    },
    redos: {
      label: "Slow regex",
      steps: {
        flagged: {
          short: "Alert",
          title: "CodeQL flags a regex that can hang",
          body: "The pull request for the real-request layer was blocked by CodeQL: the regular expression that found marks in a message could backtrack, so a long crafted line could take polynomial time and freeze the tab. In Round 11 the same check caught a tiny pattern, `/-+$/`, that trimmed trailing dashes from a system title.",
          check: {
            q: "The regex works on every lesson today. Why not dismiss the alert?",
            options: [
              "Because CodeQL alerts cannot be dismissed",
              "Because the input is not only ours: imported files and share links come from anyone, and a crafted one could hang the reader's browser",
              "Because regular expressions are slower than loops in general",
            ],
            answer: 1,
            why: "Since Round 11 readers import YAML, Mermaid and shared links. Any code that scans such text must stay fast on hostile input; a linear scan guarantees it, a backtracking pattern does not.",
          },
          fields: {
            "js/polynomial-redos": "CodeQL rule: a pattern whose running time can explode on some inputs.",
            "wire.ts": "The module that finds and numbers marked fragments in a message.",
            "/-+$/": "Looks harmless, but on a long run of dashes it backtracks.",
            hang: "Regular expressions run on the main thread; the page stops responding.",
          },
        },
        scanner: {
          short: "Linear",
          title: "Replace the pattern with a plain loop",
          body: "annotate() now walks each line with indexOf and a cursor, and the title trimming is a loop from the end of the string (commit edfb2dc). Both take time proportional to the input, whatever it contains. CodeQL went green and has stayed green.",
          fields: {
            indexOf: "Find the next candidate, move the cursor forward, never step back.",
            edfb2dc: "store: trim trailing dashes without a regex (CodeQL polynomial-redos).",
            linearly: "Twice the input, twice the work; no input can make it worse.",
          },
        },
      },
    },
  },
};

export default text;
