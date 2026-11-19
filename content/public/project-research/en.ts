import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Project: research, posts you can rerun",
  summary:
    "wonmortech/research holds the reproducible commands and sources behind 15 posts on wonmor.io: one folder per post with the exact commands, the commit they run against and every source the post cites. The whole workflow: how a reader checks a post, why commits are pinned and live services are expected to drift, how honest the repo is about private code, how a post is written with a typed Reproduce block, built, link-checked and deployed with proof and rollback, and three real cases: a score that went down on purpose, a number that moved, and numbers that must never shrink silently.",
  learn: [
    "The reader's side: open a post, find its Reproduce box, clone the folder and rerun the commands",
    "Why every runnable claim names a public repo and an exact commit, and why live numbers are allowed to drift",
    "How a post is produced: typed frontmatter with sources and reproduce commands, a schema that refuses a post without sources",
    "The pipelines: build with site, link and art checks, a deploy proven by version.txt with rollback, and a manual count that CI never runs",
  ],
  nodes: {
    reader: "Reader",
    repo: "research repo",
    site: "wonmor.io",
    pub: "Pinned public repo",
    live: "Live services",
    author: "Author",
    src: "wonmor.io source",
    ci: "GitHub Actions",
  },
  metrics: {
    posts: "Posts with a reproduce folder",
    inflation: "Score inflated by a leak",
    unexplained: "Unexplained differences",
    wrong: "Wrong numbers published",
  },
  steps: {
    what: {
      short: "What it is",
      title: "Every post comes with its commands",
      body: "A technical post usually says \"we measured X\" and asks to be trusted. wonmor.io publishes research and engineering posts that come with a way to check them, and `wonmortech/research` is where those checks live: one folder per post, 15 posts today.\n\nEach folder has a `README.md` with the title, a link to the post, what exactly can be reproduced, the public repository and commit it runs against, the commands, and every source the post cites. `commands.sh` is the post's own Reproduce box, copied as it is. If a post uses a complete query, such as the Overpass query for the mosques post, the file is there too. And where the code behind a post is private, the README says so in plain words.",
      fields: {
        "README.md": "The map for one post: claim, inputs, commands, sources.",
        "commands.sh": "The same lines as on the website, not a rewritten version.",
        overpassql: "Whole queries, not fragments, so a result can be rebuilt.",
        "private code": "Not hidden: stated, with whatever can still be checked in public.",
      },
    },
    read: {
      short: "Read",
      title: "The reader sees a Reproduce box",
      body: "On wonmor.io every post that can be checked ends with a **Reproduce this** box: a note saying what the commands should give, the commands themselves prefixed with `$`, and a link to the repository and the exact commit.\n\nThe example is the transliteration post. Its note promises specific numbers: 2966, 2436 and 2992 correct sentences out of 3000 on main for three test sets, and 2975 of 3000 (99.17%) when the lexicon from before a fix is rebuilt. A reader does not have to believe the headline; they can get the same four numbers.",
      fields: {
        "2966/3000": "A promise in the note: a number the reader should see.",
        "99.17%": "The old score, kept reproducible on purpose.",
        "$ cargo": "Commands rendered exactly as they will be typed.",
        "2de5c94": "The commit, linked, so the code cannot change under the claim.",
      },
    },
    run: {
      short: "Run",
      title: "Clone, read, run line by line",
      body: "The reader's journey from the README is three lines: clone the repo, read the post's folder README, run `commands.sh`. The README warns that some lines start a server or need a particular checkout, so running line by line is often better than running the whole script, and the folder README says which lines need what.\n\n**Why a separate repo and not only the website:** a git repository is versioned, diffable and cloneable, an issue can point at a line, and the commands do not depend on the website staying online.",
      fields: {
        "git clone": "The whole collection in one clone.",
        cat: "Read first: the README says what to expect.",
        "one at a time": "Some lines are long-running or need setup.",
        "specific checkout": "The command is only valid at the pinned commit.",
      },
    },
    pinned: {
      short: "Pinned",
      title: "A claim about code is pinned to a commit",
      body: "Code keeps changing after a post is published. If the commands ran against `main`, the result would quietly move and the post would stop matching. So every runnable folder names a public repository and an exact commit, and starts with checking it out. The index shows the pins: `592b4a4` for the deploy post, `2de5c94` for several language and supply-chain posts, `f0739fe` for the Lighthouse post.\n\nFor the transliteration post: clone bitg, check out `2de5c94`, build the CLI, run the evaluation, and the main test set gives 2966/3000, the number from the note.",
      check: {
        q: "A reader runs the commands on the latest main instead of the pinned commit and gets a different number. What does that show?",
        options: [
          "The post is wrong",
          "Nothing about the post: the code changed after it; at the pinned commit the post's number must come out",
          "The test set is random",
        ],
        answer: 1,
        why: "The pin makes the claim checkable forever: the post describes one commit. A different number at another commit is a new result, not a refutation.",
      },
      fields: {
        "git checkout": "Freeze the code to the state the post describes.",
        "cargo build": "Build from that state, not from a downloaded binary.",
        eval: "The fixed test set the score is measured on.",
        "2966/3000": "The number the note promised.",
      },
    },
    drift: {
      short: "Drift",
      title: "Live services are expected to drift",
      body: "Some posts measure things that are not in a repository: OpenStreetMap through Overpass, OpenSSF Best Practices badges, OpenSSF Scorecard, Lighthouse. Those commands return today's values, not the values on the day of writing. The README says this up front under **Expect drift**: pinned commits make the repository side stable, the live side will move, and each post says which of its numbers are snapshots.\n\nThis is the difference between reproducible and repeatable. The method is reproducible; a live number is only repeatable on the same day.",
      check: {
        q: "Why not pin live results too, for example by storing yesterday's Scorecard output?",
        options: [
          "It is allowed, but the post's point is the method; the README labels such numbers as snapshots instead of pretending they are fixed",
          "Because Scorecard forbids storing results",
          "Because live services never change",
        ],
        answer: 0,
        why: "A stored output proves only that someone saved a file. The honest approach is to say which numbers are snapshots and let anyone rerun the method today.",
      },
      fields: {
        "live services": "Data outside any repository's history.",
        "today's values": "What a rerun will show.",
        "pinned commits": "The part that can be frozen.",
        snapshots: "Numbers that belong to a date.",
      },
    },
    private: {
      short: "Private code",
      title: "Saying what cannot be checked",
      body: "Not every post is about open code. The index lists, for each post, exactly what a reader can do: run against a public repo at a commit, rebuild from a full query, inspect a published film with ffprobe, run public commands while the core code stays private, or only follow the sources while the decision record is private.\n\nFor a private project, the folder lists the public tools that still work, for example a generic inspector for any MCP server, and says that the source is not published. **Why:** a vague \"code available on request\" invites trust that cannot be checked; a clear line between public and private keeps the rest of the repo credible.",
      fields: {
        Runnable: "The strongest level: public code at a commit.",
        "Full Overpass query": "Data rebuilt from the original query.",
        ffprobe: "A published artefact anyone can inspect.",
        "core code private": "Said plainly in the index.",
        "Sources only": "The weakest level, also said plainly.",
      },
    },
    write: {
      short: "Write",
      title: "Producing a post: the frontmatter carries the evidence",
      body: "A post is written in the public `wonmortech/wonmor.io` repository as Markdown, in three languages: `src/content/research/<slug>/en.md`, `uz.md` and `ru.md`. The evidence is not an afterthought in the text; it is structured data in the frontmatter.\n\n`kind` decides whether the post appears under /research or /engineering, `area` links it to one of seven research areas, `source` lists every source the post cites, and `reproduce` holds the repository, the commit, the note and the commands, the same commands that end up in the research repo. The Reproduce box on the page is rendered from this block, so the website and the repo cannot quietly disagree.",
      fields: {
        kind: "research or engineering: the URL comes from it.",
        area: "One of seven areas, from agents to digital-assets.",
        source: "Every source, as a list the build can check.",
        reproduce: "Repo, commit, note and commands as data.",
        commit: "Rendered as a link to that exact commit.",
      },
    },
    schema: {
      short: "Schema",
      title: "A schema that refuses a post without sources",
      body: "The research collection is defined with a Zod schema in `src/content.config.ts`. `kind` and `area` are enums, so a typo breaks the build instead of creating a stray page. `source` must be a list with at least one entry: a post with no sources does not build. `reproduce` is optional, because a post with only sources is allowed, but if present, its repository must be a URL.\n\n**Why a schema and not a style guide:** a rule the build enforces does not depend on anyone remembering it at 2 a.m.",
      check: {
        q: "An author removes the last entry from source to tidy up. What happens?",
        options: [
          "The post builds with no sources listed",
          "astro build fails the schema check, so CI is red and nothing deploys",
          "The deploy rolls back afterwards",
        ],
        answer: 1,
        why: "`source: z.array(z.string()).min(1)` is checked when the collection loads; the build fails before any page is written.",
      },
      fields: {
        kind: "An enum: only two allowed values.",
        area: "The seven areas are a shared constant.",
        "min(1)": "At least one source, or no build.",
        reproduce: "Optional, but typed when present.",
      },
    },
    mirror: {
      short: "Mirror",
      title: "The research folder mirrors the post",
      body: "For each post, the research repo gets a folder whose `commands.sh` is the post's reproduce commands, copied verbatim, with a header that links the post and says to run line by line and check the README for the required checkout. The folder README repeats the note, the pinned repository and commit, the sources from the frontmatter, and the licence.\n\nAll 15 folders came in one commit on 2026-11-13; later commits added OpenSSF Scorecard, CODEOWNERS and Dependabot for actions, and an overview README with links to live results.",
      fields: {
        Source: "Each script points back to the page it came from.",
        verbatim: "No silent edits between the website and the repo.",
        "line by line": "The same warning as in the README.",
      },
    },
    build: {
      short: "Build",
      title: "Build: the site checks itself",
      body: "On every pull request to wonmor.io, CI runs `npm run build`, and the deploy runs the same command. It is a chain: `astro build` (every post must pass the schema), Pagefind for search, `check-site.mjs` (CSP and a privacy scan), `check-links.mjs` and `check-art.mjs`.\n\nThe link check matters for research posts in particular: every internal link and every `#fragment` must point at something that exists, and external links are kept in an explicit list, so a renamed heading or a moved page breaks the build instead of a reader's trust. The art check makes sure no two posts on one page share the same generated artwork.",
      fields: {
        "astro build": "Schema validation happens here.",
        pagefind: "A static search index, no search server.",
        "check-site": "Security headers and a scan for text that must not be published.",
        "check-links": "Dead internal links and missing anchors fail the build.",
        "check-art": "Each post keeps its own artwork.",
      },
    },
    numbers: {
      short: "Numbers",
      title: "Numbers that CI is not allowed to compute",
      body: "The home page shows a band of numbers: repositories, merged pull requests, releases. Some of the repositories are private. `tools/count-numbers.mjs` is therefore run by the owner, with a GitHub CLI login that can see everything, and it writes `src/data/numbers.json` with an `asOf` date, which is then committed.\n\nCI never runs it. A comment in the script says why: a build without access would silently publish smaller, public-only numbers. If no private repository is visible, the script warns before writing anything.",
      check: {
        q: "Why is a manual step better here than an automated one in CI?",
        options: [
          "Manual steps are always better",
          "CI's token sees only public repositories, so automation would publish wrong, smaller numbers while staying green",
          "Counting is too slow for CI",
        ],
        answer: 1,
        why: "Automation is only good if it has the right inputs. Here the right input needs owner access, so the step stays manual, dated and reviewed.",
      },
      fields: {
        "run by the owner": "The only identity that can see every repository.",
        "CI never runs this": "A deliberate exception to automating everything.",
        warns: "Zero private repos visible is treated as a sign of the wrong login.",
        asOf: "The numbers carry their date, like any snapshot.",
      },
    },
    deploy: {
      short: "Deploy",
      title: "Deploy: one at a time, proven, reversible",
      body: "A push to main runs the deploy workflow, never two at once and never cancelled half-way. It builds, writes the commit SHA into `site/version.txt`, and sends a tarball over SSH to a key that the server binds to `bin/receive`, with a pinned host key.\n\nThen it proves the result: poll `/version.txt` until it shows the SHA (20 tries, 3 s apart), smoke-test the key pages including /research/, /engineering/ and the RSS feed, expect a 404 for a page that does not exist, and check that the public CSP still contains `connect-src 'self'`. If anything fails after shipping, the rollback step switches back to the previous release.",
      check: {
        q: "A change accidentally widens the CSP. The upload succeeds. What happens?",
        options: [
          "Nothing, CSP is not checked after deploy",
          "The smoke step fails on the CSP check, and the rollback step restores the previous release",
          "The build step catches it before upload in every case",
        ],
        answer: 1,
        why: "The smoke test reads the live header; failing it after a successful ship triggers rollback. The site check in the build may catch it earlier, but the live check is the last line.",
      },
      fields: {
        "version.txt": "The live site names the commit it serves.",
        "bin/receive": "The CI key can publish or roll back, nothing else.",
        "20 tries": "About a minute for the new release to appear.",
        smoke: "Key pages, a 404 and the CSP, checked on the live site.",
        rollback: "The previous release is one switch away.",
      },
    },
    feedback: {
      short: "Feedback",
      title: "When a command breaks, open an issue",
      body: "Reproducibility is only real if someone can report when it fails. The README asks for exactly that: if a command no longer works, or gives a different result for a reason the post does not explain, open an issue with the command, the output and the date you ran it. The date matters because of drift.\n\nThe repo itself is kept to the same standard as the code it points to: OpenSSF Scorecard every week, Dependabot for actions, CODEOWNERS for review. Code (commands, scripts, queries) is MIT, the text is CC BY 4.0, and referenced repositories keep their own licences.",
      fields: {
        "no longer works": "A broken command is a bug in the post, not in the reader.",
        "open an issue": "Command, output, date: enough to reproduce the failure.",
        Scorecard: "Supply-chain checks on the evidence repo itself.",
        "CC BY 4.0": "The text can be reused with credit.",
      },
    },
    recap: {
      short: "Recap",
      title: "research in one screen",
      body: "**Reader side:** every checkable post ends with a Reproduce box; the research repo has a folder per post with the commands verbatim, the pinned public repo and commit, every source and the licence; clone and run line by line.\n\n**Honesty rules:** claims about code are pinned to a commit; live services are expected to drift and snapshots are labelled; private code is named as private, with what can still be checked.\n\n**Production:** posts in three languages with typed frontmatter (`kind`, `area`, `source` with at least one entry, `reproduce`); the page and the repo are generated from the same data.\n\n**Pipelines:** build with schema, search, site, link and art checks; deploy one at a time, proven by version.txt and a live smoke test, with rollback; home numbers counted manually by the owner because CI cannot see private repositories.",
    },
  },
  scenarios: {
    "score-down": {
      label: "Score went down",
      steps: {
        "leak-bug": {
          short: "99.17%",
          title: "A score that was too good",
          body: "The Uzbek converter scored 99.17% on its main test set until it turned out that its lexicon had been built from text that included the evaluation sentences. The old state stays reproducible: check out the lexicon from commit `a7962ef`, rebuild, and the main set gives 2975/3000.",
          fields: {
            a7962ef: "The state before the fix, one command away.",
            "99.17%": "A number that measured memory, not skill.",
            "counted the evaluation sentences": "Test data leaking into training data.",
          },
        },
        "leak-fix": {
          short: "98.87%",
          title: "Publish the lower, honest number",
          body: "After the leak was removed, the same sentences give 2966/3000, 98.87%. The post made the drop its headline, \"why our score went down from 99.17% to 98.87%\", and keeps both numbers reproducible with one command each, so anyone can see the 0.30 points the leak had been worth.",
          fields: {
            "98.87%": "The score at the pinned commit.",
            "went down": "The drop is the result, not something to hide.",
            reproducible: "Both states can be rebuilt by anyone.",
          },
        },
      },
    },
    "live-moved": {
      label: "Number moved",
      steps: {
        "moved-bug": {
          short: "2,285 vs 2,289",
          title: "A rerun gives a different number",
          body: "The mosques post is titled with 2,285 congregations from its import. A later run of the same Overpass query, on 2026-11-13, gives 2,289. A reader could conclude the post is wrong.",
          fields: {
            "2,285": "The number in the post's title.",
            "2,289": "The same query, weeks later.",
            wrong: "The natural first reaction without context.",
          },
        },
        "moved-fix": {
          short: "Explained",
          title: "Drift that was announced in advance",
          body: "The README's Expect drift section already says that Overpass returns today's map. The dataset built from that later run records the query time and `timestamp_osm_base`, so the difference has a date on it. If a difference is not explained anywhere, the README asks for an issue with command, output and date.",
          fields: {
            "Expect drift": "Written before anyone asked.",
            timestamp_osm_base: "The age of the data the server answered from.",
            "an issue": "The channel for differences nobody has explained yet.",
          },
        },
      },
    },
    "small-numbers": {
      label: "Smaller numbers",
      steps: {
        "small-bug": {
          short: "Green, wrong",
          title: "The failure the script is written against",
          body: "If the home page numbers were counted in CI, the CI token would only see public repositories. Repositories, merged pull requests and releases would all come out lower, the build would stay green, and the smaller numbers would go live without anyone noticing. The script's header comment names exactly this risk.",
          fields: {
            "only public": "A token without owner access sees part of the picture.",
            "count lower": "Every number in the band shrinks.",
            "still be green": "No check fails: the most dangerous kind of error.",
          },
        },
        "small-fix": {
          short: "Guarded",
          title: "A manual, dated, reviewed step",
          body: "So counting is not part of the build. The owner runs it with full access; if no private repository is visible, it warns before writing; the JSON it writes carries an `asOf` date and is committed and reviewed like any other change.",
          fields: {
            "manual step": "Run on purpose, by the one identity that can see everything.",
            warning: "A login with too little access is caught early.",
            asOf: "The band is a dated snapshot, not a live counter.",
          },
        },
      },
    },
  },
};

export default text;
