import { defineLesson } from "@mufassall/scene-schema";

/**
 * research (wonmortech/research, public; code MIT, text CC BY 4.0): the reproducible commands and sources
 * behind 15 posts on wonmor.io/research and /engineering. One folder per post: README.md (post link, what can
 * be reproduced, pinned repo + commit, commands, sources, licence) and commands.sh copied verbatim from the
 * post's "Reproduce this" box. The posts themselves live in wonmortech/wonmor.io (public, Astro).
 * Sources: research README.md, posts/*, git log; wonmor.io src/content.config.ts,
 * src/content/research/honest-transliteration-eval/en.md, package.json, tools/count-numbers.mjs,
 * .github/workflows/deploy.yml.
 */
export default defineLesson({
  slug: "project-research",
  level: "intermediate",
  minutes: 14,
  tier: "public",
  metrics: [
    { id: "posts", unit: "", better: "up" },
    { id: "inflation", unit: "pp", better: "down" },
    { id: "unexplained", unit: "", better: "down" },
    { id: "wrong", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "what",
      kind: "case",
      nodes: {
        reader: { kind: "actor", at: [0, 9] },
        repo: { kind: "storage", at: [6, 9] },
      },
      edges: { clone: { from: "reader", to: "repo", rate: 2, mode: "call" } },
      metrics: { posts: 15 },
      focus: ["reader", "repo"],
      exchange: {
        edge: "clone",
        request: {
          format: "text",
          head: "github.com/wonmortech/research/posts/<slug>/",
          body: "README.md     title, post link, what can be reproduced, pinned repo + commit, sources cited\ncommands.sh   the post's \"Reproduce this\" box, copied verbatim\n*.overpassql  any full query or script from the post (e.g. the mosques post)\nprivate code  said plainly; only what public sources can check is listed",
        },
        marks: ["README.md", "commands.sh", "overpassql", "private code"],
      },
    },
    {
      id: "read",
      kind: "case",
      nodes: { site: { kind: "cdn", at: [0, 2] } },
      edges: { open: { from: "reader", to: "site", rate: 2, mode: "call" } },
      focus: ["reader", "site"],
      exchange: {
        edge: "open",
        request: { format: "http", head: "GET /research/honest-transliteration-eval/ HTTP/1.1" },
        response: {
          format: "text",
          head: "the post's \"Reproduce this\" box",
          body: "The first three commands give 2966/3000, 2436/3000 and 2992/3000 on main; the last two\nrebuild the lexicon from before the fix and give 2975/3000 (99.17%) on the same sentences.\n$ cargo build --release -p bitg-cli\n$ target/release/bitg eval eval/uz.tsv\nRepository: github.com/dtwinuz/bitg   Commit: 2de5c94",
        },
        marks: ["2966/3000", "99.17%", "$ cargo", "2de5c94"],
      },
    },
    {
      id: "run",
      kind: "case",
      focus: ["reader", "repo"],
      exchange: {
        edge: "clone",
        request: {
          format: "text",
          head: "quick start from the README",
          body: "git clone https://github.com/wonmortech/research && cd research\ncat posts/mosques-from-openstreetmap/README.md\nbash posts/mosques-from-openstreetmap/commands.sh   # or run the lines one at a time",
        },
        response: {
          format: "text",
          head: "the warning that comes with it",
          body: "Some lines start a server or need a specific checkout; the folder README says which.",
        },
        marks: ["git clone", "cat", "one at a time", "specific checkout"],
      },
    },
    {
      id: "pinned",
      kind: "fix",
      nodes: { pub: { kind: "external", at: [3, 12] } },
      edges: { checkout: { from: "reader", to: "pub", rate: 1, mode: "call" } },
      focus: ["reader", "pub"],
      exchange: {
        edge: "checkout",
        request: {
          format: "text",
          head: "posts/honest-transliteration-eval/README.md, Pinned source",
          body: "git clone https://github.com/dtwinuz/bitg && cd bitg && git checkout 2de5c94\ncargo build --release -p bitg-cli\ntarget/release/bitg eval eval/uz.tsv",
        },
        response: { format: "text", head: "eval/uz.tsv", body: "2966/3000" },
        marks: ["git checkout", "cargo build", "eval", "2966/3000"],
      },
    },
    {
      id: "drift",
      kind: "case",
      nodes: { live: { kind: "external", at: [12, 2] } },
      edges: { ask: { from: "reader", to: "live", rate: 1, mode: "call" } },
      focus: ["reader", "live"],
      exchange: {
        edge: "ask",
        request: {
          format: "text",
          head: "README: Expect drift",
          body: "live services   Overpass, OpenSSF Best Practices, OpenSSF Scorecard, Lighthouse\nthey return     today's values, not the values on the day the post was written\npinned commits  make the repository side stable; the live side will move\nthe posts       say which numbers are snapshots",
        },
        marks: ["live services", "today's values", "pinned commits", "snapshots"],
      },
    },
    {
      id: "private",
      kind: "case",
      focus: ["reader", "repo"],
      exchange: {
        edge: "clone",
        request: {
          format: "text",
          head: "what the index says for each post",
          body: "Runnable against public repo at 592b4a4 / 2de5c94 / f0739fe\nFull Overpass query + count command\nInspect the published film with ffprobe\nPublic commands; core code private\nSources only; decision record private",
        },
        marks: ["Runnable", "Full Overpass query", "ffprobe", "core code private", "Sources only"],
      },
    },
    {
      id: "write",
      kind: "fix",
      nodes: {
        author: { kind: "actor", at: [3, 5] },
        src: { kind: "service", at: [9, 5] },
      },
      edges: { edit: { from: "author", to: "src", rate: 1 } },
      focus: ["author", "src"],
      exchange: {
        edge: "edit",
        request: {
          format: "text",
          head: "wonmortech/wonmor.io: src/content/research/honest-transliteration-eval/en.md (also uz.md, ru.md)",
          body: "---\ntitle: \"Honest evaluation for transliteration: why our score went down ...\"\ndate: 2026-11-12\nkind: research\narea: language\nsource:\n  - \"https://github.com/dtwinuz/bitg/pull/8\"\nreproduce:\n  repo: \"https://github.com/dtwinuz/bitg\"\n  commit: \"2de5c94\"\n  commands:\n    - \"cargo build --release -p bitg-cli\"\n---",
        },
        marks: ["kind", "area", "source", "reproduce", "commit"],
      },
    },
    {
      id: "schema",
      kind: "fix",
      focus: ["src"],
      exchange: {
        edge: "edit",
        request: {
          format: "text",
          head: "src/content.config.ts, the research collection (Zod)",
          body: "kind: z.enum(['research', 'engineering'])        decides the URL: /research/<slug> or /engineering/<slug>\narea: z.enum(areas)                              agents, language, infrastructure, supply-chain, ...\nsource: z.array(z.string()).min(1)               a post with no source does not build\nreproduce: { repo url?, commit?, note?, commands[] }   optional",
        },
        marks: ["kind", "area", "min(1)", "reproduce"],
      },
    },
    {
      id: "mirror",
      kind: "case",
      edges: { copy: { from: "src", to: "repo", rate: 1 } },
      focus: ["src", "repo"],
      exchange: {
        edge: "copy",
        request: {
          format: "text",
          head: "posts/honest-transliteration-eval/commands.sh",
          body: "#!/usr/bin/env bash\n# Source: https://wonmor.io/research/honest-transliteration-eval/\n# Copied verbatim from the post. Run line by line; see README.md for the required checkout.\ncargo build --release -p bitg-cli\ntarget/release/bitg eval eval/uz.tsv",
        },
        marks: ["Source", "verbatim", "line by line"],
      },
    },
    {
      id: "build",
      kind: "fix",
      nodes: { ci: { kind: "worker", at: [6, 0] } },
      edges: { check: { from: "ci", to: "src", rate: 1 } },
      focus: ["ci", "src"],
      exchange: {
        edge: "check",
        request: {
          format: "text",
          head: "npm run build (wonmor.io, in CI on every pull request and deploy)",
          body: "astro build                  every post must pass the Zod schema\npagefind                     the search index\nnode tools/check-site.mjs    CSP and privacy scan\nnode tools/check-links.mjs   every internal link and #fragment must resolve; external links are listed\nnode tools/check-art.mjs     no two posts share the same generated artwork",
        },
        marks: ["astro build", "pagefind", "check-site", "check-links", "check-art"],
      },
    },
    {
      id: "numbers",
      kind: "case",
      focus: ["author", "src"],
      exchange: {
        edge: "edit",
        request: {
          format: "text",
          head: "tools/count-numbers.mjs: the home page numbers band",
          body: "run by the owner with gh logged in as an account that can see every repository\nCI never runs this, so a build without access cannot silently publish smaller, public-only numbers\nwarns if no private repositories are visible\nwrites src/data/numbers.json with asOf, repos, mergedPRs, releases: commit the JSON",
        },
        marks: ["run by the owner", "CI never runs this", "warns", "asOf"],
      },
    },
    {
      id: "deploy",
      kind: "fix",
      edges: { ship: { from: "ci", to: "site", rate: 1, mode: "call" } },
      focus: ["ci", "site"],
      exchange: {
        edge: "ship",
        request: {
          format: "text",
          head: "wonmor.io .github/workflows/deploy.yml (push to main, one deploy at a time)",
          body: "npm run build, then site/version.txt = $GITHUB_SHA\ntar site + Caddyfile | ssh, key bound to bin/receive, host key pinned\npoll /version.txt until it equals the SHA: 20 tries, 3 s apart\nsmoke: /research/, /engineering/, /rss.xml ... 200, a missing page 404, CSP has connect-src 'self'\nany failure after shipping -> rollback",
        },
        marks: ["version.txt", "bin/receive", "20 tries", "smoke", "rollback"],
      },
    },
    {
      id: "feedback",
      kind: "case",
      focus: ["reader", "repo"],
      exchange: {
        edge: "clone",
        request: {
          format: "text",
          head: "README: Contributing, and the repo's own checks",
          body: "a command no longer works, or gives a different result the post does not explain\n-> open an issue with the command, the output and the date you ran it\nOpenSSF Scorecard weekly, Dependabot for actions, CODEOWNERS\nlicence: code MIT, text CC BY 4.0; referenced repositories keep their own",
        },
        marks: ["no longer works", "open an issue", "Scorecard", "CC BY 4.0"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "score-down",
      from: "pinned",
      steps: [
        {
          id: "leak-bug",
          kind: "problem",
          metrics: { inflation: 0.3 },
          focus: ["reader", "pub"],
          exchange: {
            edge: "checkout",
            request: {
              format: "text",
              head: "the lexicon from before the fix",
              body: "git checkout a7962ef -- crates Cargo.toml Cargo.lock\ncargo build --release -p bitg-cli && target/release/bitg eval eval/uz.tsv",
            },
            response: {
              format: "text",
              head: "eval/uz.tsv",
              body: "2975/3000 (99.17%)\n-- the lexicon had counted the evaluation sentences",
            },
            marks: ["a7962ef", "99.17%", "counted the evaluation sentences"],
          },
        },
        {
          id: "leak-fix",
          kind: "fix",
          metrics: { inflation: 0 },
          focus: ["reader", "pub"],
          exchange: {
            edge: "checkout",
            request: {
              format: "text",
              head: "the same sentences on main at 2de5c94",
              body: "target/release/bitg eval eval/uz.tsv   -> 2966/3000 (98.87%)\nthe post's headline: why our score went down from 99.17% to 98.87%\nboth numbers stay reproducible: one command each",
            },
            marks: ["98.87%", "went down", "reproducible"],
          },
        },
      ],
    },
    {
      id: "live-moved",
      from: "drift",
      steps: [
        {
          id: "moved-bug",
          kind: "problem",
          metrics: { unexplained: 1 },
          focus: ["reader", "live"],
          exchange: {
            edge: "ask",
            request: {
              format: "text",
              head: "posts/mosques-from-openstreetmap: run the count command later",
              body: "post title    Mosques from OpenStreetMap: 2,285 congregations, one layer\nrerun         2,289 on 2026-11-13\nreader        the post is wrong?",
            },
            marks: ["2,285", "2,289", "wrong"],
          },
        },
        {
          id: "moved-fix",
          kind: "fix",
          metrics: { unexplained: 0 },
          focus: ["reader", "repo"],
          exchange: {
            edge: "clone",
            request: {
              format: "text",
              head: "what explains it, in the open",
              body: "Expect drift: Overpass returns today's map, not the day of the post\nthe dataset that followed records query time and timestamp_osm_base\na difference the README does not explain -> an issue with command, output and date",
            },
            marks: ["Expect drift", "timestamp_osm_base", "an issue"],
          },
        },
      ],
    },
    {
      id: "small-numbers",
      from: "numbers",
      steps: [
        {
          id: "small-bug",
          kind: "problem",
          metrics: { wrong: 1 },
          focus: ["ci", "src"],
          exchange: {
            edge: "check",
            request: {
              format: "text",
              head: "the trap count-numbers.mjs is written against",
              body: "a CI token sees only public repositories\nrepos, merged PRs and releases would all count lower\nthe build would still be green and the smaller numbers would go live",
            },
            marks: ["only public", "count lower", "still be green"],
          },
        },
        {
          id: "small-fix",
          kind: "fix",
          metrics: { wrong: 0 },
          focus: ["author", "src"],
          exchange: {
            edge: "edit",
            request: {
              format: "text",
              head: "the guard",
              body: "counting is a manual step by the owner, not part of npm run build\nzero visible private repositories -> a warning before anything is written\nthe JSON carries asOf, and it is reviewed and committed like any change",
            },
            marks: ["manual step", "warning", "asOf"],
          },
        },
      ],
    },
  ],
});
