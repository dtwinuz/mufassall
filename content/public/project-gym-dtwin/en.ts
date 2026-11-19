import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Project: gym.dtwin, a workout diary in the browser",
  summary:
    "gym.dtwin is an open-source workout diary: 1827 exercises, plans, set logging with a rest timer, records and progress, in Uzbek, Russian and English, with no account. Everything lives in the browser as one profile document. How a lifter plans, trains and reviews progress; how the domain core, the generated catalogue, backup and import, the service worker and a not-yet-deployed sync API are built; and how CI and a manual deploy keep it running.",
  learn: [
    "The lifter's path: a plan with progression rules, a live session with RIR and a rest timer that survives a reload, then records and charts",
    "Local-first data: one profile document in localStorage, per-item updatedAt and deletion tombstones, ready for a future sync",
    "A tested pure core (1RM, progression, plate math) and a catalogue generated from open datasets with clear licences",
    "Backup and CSV import tested on real exports, offline use through a service worker, CI with workflow linting, and a deploy that keeps the previous build",
  ],
  nodes: {
    phone: "Lifter's phone",
    edge: "dtwin.uz edge proxy",
    site: "gym-dtwin (Caddy)",
    store: "localStorage",
    sources: "Open datasets",
    build: "Catalogue scripts",
    sw: "Service worker",
    api: "Sync API (not deployed)",
    ci: "GitHub Actions",
    owner: "Maintainer",
  },
  metrics: {
    exercises: "Exercises in the catalogue",
    tests: "Passing tests",
    precache: "Files cached for offline",
    unmatched: "Imported Hevy names not matched",
    skipped: "Rows skipped on import",
    manual: "Deploys needing a manual restart",
  },
  steps: {
    intro: {
      short: "What it is",
      title: "A training diary with no account",
      body: "gym.dtwin is for people who lift: plan the week, log every set in the gym, see what is getting stronger. It opens in a browser, can be installed to the home screen and works offline. There is no sign-up: the whole diary is one JSON document in the browser's localStorage.\n\nIt is an experiment in the dtwin ecosystem and its code is public. The feature set was modelled on the open-source openGym app, but none of its AGPL code, texts or exercise media was copied: everything was written from the behaviour up, and the catalogue comes from openly licensed datasets.",
      fields: {
        settings: "Language, units, theme, the chosen 1RM formula and dozens of training preferences.",
        routines: "Plans; each item carries its own updatedAt.",
        workouts: "Finished sessions with volume and the exercises that set a record.",
        active: "The session in progress, or null; it survives a reload.",
        deleted: "Tombstones: what was deleted and when, so a future sync cannot bring it back.",
        updatedAt: "Milliseconds; always increases, even if the clock goes back.",
      },
    },
    plan: {
      short: "Plan",
      title: "A plan with rules for the next session",
      body: "A lifter picks one of the starter programs or builds routines in an editor, then lays them out on a week or as a rotation (A, B, rest, ...). Each exercise in a routine is a slot: sets, a rep range, a starting weight, a rest time, an optional superset group and backup exercises for a busy gym.\n\nThe important field is the progression policy. With `double`, the app asks for more reps inside 8 to 10 first and adds 2.5 kg only when every set reaches 10. The plan is the target; what really happened is logged separately.",
      fields: {
        repsMin: "Bottom of the rep range; reps is the top.",
        prog: "Progression policy: off, linear, greyskull, double, triple, or time for holds.",
        inc: "How much weight to add when the targets are met.",
        restSec: "Default rest for this exercise.",
        sg: "Superset group: neighbouring slots with the same id alternate.",
        subs: "Planned backups, up to 5, one tap away when the bench is taken.",
      },
    },
    workout: {
      short: "Session",
      title: "In the gym: sets, RIR and a rest timer",
      body: "The session screen shows today's prescription with its reason, for example \"more weight: all reps made last time\". The lifter ticks sets, adjusts weight and reps, and can rate each set by reps in reserve. Warm-up sets, drop sets, rest-pause, per-side logging and a plate list for the bar are all there.\n\nThe rest timer is stored as an absolute end time, not as seconds left, so closing the tab or a phone reboot does not lose it. The session itself lives in `profile.active`; if it is forgotten, it ends at the last ticked set, not days later.",
      check: {
        q: "Why store the rest timer as endsAt instead of a counter that ticks down?",
        options: [
          "It uses less memory",
          "A counter dies with the page; an end time can be recomputed after a reload, sleep or reboot",
          "Browsers cannot run timers",
        ],
        answer: 1,
        why: "Phones suspend background tabs and kill pages. With an absolute end time the app just computes endsAt minus now when it comes back, and the countdown is right.",
      },
      fields: {
        rx: "The prescription for this session, saved so the next one can judge against it.",
        why: "load: all reps made, so more weight; other reasons are hold, deload, effort and more.",
        rir: "Reps in reserve: 0 means failure. It feeds progression and the 1RM estimate.",
        endsAt: "Absolute time the rest ends.",
        lastAt: "Last ticked set: where a forgotten session is closed.",
      },
    },
    progress: {
      short: "Progress",
      title: "Records, estimated max and charts",
      body: "Every finished session updates the records. Strength is tracked as an estimated one-rep max, and reps in reserve count: 100 kg for 5 with 2 left is read as 7 reps to failure. Above 12 reps the estimate is ignored as too noisy. Seven formulas are available; Epley is the default.\n\nThe progress pages show sessions and volume, a 12-month activity map, weekly sets per muscle on a body map, an e1RM chart per exercise, body weight with a goal line, measurements and progress photos. Photos stay in IndexedDB and never leave the device.",
      fields: {
        e1rm: "Estimated one-rep max: a comparable strength number across rep counts.",
        REP_CAP: "Sets above 12 reps do not produce a strength record.",
        formulas: "Different formulas suit different lifters; the choice is a setting.",
        IndexedDB: "Photos are large and private: a separate store that backup and sync do not touch.",
      },
    },
    catalogue: {
      short: "Catalogue",
      title: "1827 exercises, generated from open data",
      body: "The catalogue is not typed by hand. Scripts take free-exercise-db (public domain) for 876 exercises and their 1746 images, converted to WebP and served from the site, add text-only entries from an MIT-licensed dataset after removing duplicates, and convert MuscleMap outlines for the body map. Uzbek and Russian names, steps and synonyms are written by the project.\n\nSearch understands Cyrillic and Latin, gym slang and typos, and answers in under 30 ms. Licences are listed in NOTICE; the data from sources with incompatible licences is simply not used.",
      check: {
        q: "Why generate the catalogue with scripts instead of editing a JSON file?",
        options: [
          "Scripts make it smaller",
          "An upstream update or a dedupe rule change can be re-run from a pinned source, and the licence trail stays clear",
          "JSON cannot hold 1827 entries",
        ],
        answer: 1,
        why: "Generated data is reproducible: pin the upstream commit, re-run, review the diff. Hand edits would be lost on the next import and would blur which text came from which licence.",
      },
      fields: {
        Unlicense: "Public domain: the base catalogue and its images.",
        "1746": "Images at 480 px, on our own server, loaded lazily.",
        dedupe: "Same movement and compatible equipment: merged; Smith machine vs lever: kept apart.",
        MuscleMap: "MIT outlines, converted from upstream for the body map.",
        "1827": "Total after the looser dedupe of PR #87.",
        "not used": "AGPL code and private media stay out, by rule.",
      },
    },
    core: {
      short: "Core",
      title: "A pure domain core with tests",
      body: "Everything that is arithmetic lives in `src/core/` as plain functions with no UI: units, 1RM, progression, warm-up ramps, plate math, volume, muscle load, recovery, schedules, records, CSV. They are covered by unit tests and run the same in the app, the demo and the importer.\n\nThe plate solver is a small knapsack over the plates the lifter owns, solved in quarter units so 1.25 kg plates stay whole numbers; if a weight cannot be made, it returns the closest one below. Progression returns a weight and a reason code, which the UI translates into a sentence.",
      check: {
        q: "A lifter made every rep but rated every set at RIR 0. What does the next session ask for?",
        options: [
          "More weight, the reps were made",
          "The same weight once more, with the reason effort",
          "A deload",
        ],
        answer: 1,
        why: "Making the reps at failure every set is a sign the jump would be too big. The rule repeats the weight once (average RIR 0.5 or lower) before adding load; unrated sets keep the plain rule.",
      },
      fields: {
        solvePlates: "Fewest plates per side from the owned pairs.",
        "quarter units": "Weights times 4 become integers, so the search is exact.",
        why: "A reason code for every prescription, shown to the lifter.",
        effort: "All reps made but all-out: hold before adding weight.",
        deload: "After repeated misses at one weight, drop to 90% and build back.",
      },
    },
    backup: {
      short: "Backup",
      title: "The data belongs to the lifter",
      body: "Because nothing is on a server, the diary must be easy to take out and bring back. A backup is one JSON file with a kind and a version. Restoring checks both and the shape; any error changes nothing, and the current profile is kept as a pre-restore copy with an Undo.\n\nCSV export follows RFC 4180 with a BOM so spreadsheets open it correctly, and guards against formula injection. CSV import detects Strong, Hevy and FitNotes exports by their headers, maps exercise names to the catalogue, lets the lifter review the uncertain ones, and turns unknown names into custom exercises.",
      fields: {
        kind: "Refuses files that are not a gym backup.",
        v: "Format version, so a future format can migrate old files.",
        exportedAt: "When the backup was made, shown before restoring.",
        "pre-restore": "The profile as it was before the restore, one tap to go back.",
        "RFC 4180": "The common CSV standard; cells starting with = + - @ are prefixed so a spreadsheet does not run them.",
        "custom exercises": "Nothing is dropped: an unmatched name becomes the lifter's own exercise.",
      },
    },
    offline: {
      short: "Offline",
      title: "A service worker for the gym basement",
      body: "Gyms often have no signal. A service worker precaches the app shell and every code chunk, lazy pages included, so any page opens offline after one online visit. Exercise images are cached on first view, up to 600 for 60 days, and are dropped first if storage runs out.\n\nUpdates never interrupt training: a new version waits and shows an Update button only when no session is active. The server side matters too: a missing file under `/assets`, `/ex` or `/icons` now returns 404, because answering with `index.html` could make the worker cache an HTML page as a script or an image.",
      check: {
        q: "Why must a missing /assets/x.js return 404 and not the SPA's index.html?",
        options: [
          "404 pages are faster",
          "The service worker would store the HTML under a script URL and serve it as code later",
          "Search engines require it",
        ],
        answer: 1,
        why: "An SPA fallback is right for page routes, wrong for files. Cached under a .js or image URL, an HTML page breaks the app offline in a way that survives reloads.",
      },
      fields: {
        precache: "50 files, about 3.8 MB, cached at install.",
        CacheFirst: "Images come from the cache when present; the network only fills gaps.",
        NetworkOnly: "The future sync API is never answered from a cache.",
        "profile.active": "While a session runs, the update prompt waits.",
        "404": "Files that do not exist must not fall back to the SPA page.",
      },
    },
    sync: {
      short: "Sync",
      title: "Sync across devices: written, not switched on",
      body: "A small server (`node:http` and `node:sqlite`, no framework) and the client code for syncing between devices exist and are tested, but they are not deployed: the build flag `VITE_SYNC_ENABLED` is off, and with it off the sync code is not even in the bundle. The plan is sign-in through dtwin.uz with OAuth and PKCE, then `GET` and `PUT /api/data` with the revision the client last saw.\n\nIf another device wrote in between, the server answers 409 with its copy; the client merges by item `updatedAt`, tombstones and per-field `stamps`, then retries. Known limits are written down: a device with a wrong clock wins its edits, and two sessions started on two devices keep only the newer one.",
      check: {
        q: "Why does the merge need per-field stamps on top of the profile's updatedAt?",
        options: [
          "To save space",
          "Settings and maps have no own timestamps; with one global time, a theme change on A and a rest change on B would lose one of them",
          "SQLite requires them",
        ],
        answer: 1,
        why: "Lists of items carry their own updatedAt. Settings and dictionaries do not, so without a stamp per path the later document would overwrite every field, including ones the other device never touched.",
      },
      fields: {
        baseRev: "The server revision this edit was based on.",
        stamps: "Last-change time per settings path, written only when the flag is on.",
        rev: "The server's current revision; on 409 the client merges and tries again.",
        Authorization: "A short-lived access token kept only in memory.",
      },
    },
    ci: {
      short: "CI",
      title: "Lint, tests and build on every pull request",
      body: "CI runs oxlint, the vitest suite (465 tests after the latest dependency fix) and a type-checked build on every pull request and push to main; changes to docs only skip it. The workflows themselves are linted by zizmor, which fails on medium findings such as leaked credentials or template injection.\n\nSupply-chain hygiene is explicit: actions pinned by SHA, read-only tokens, monthly grouped Dependabot updates. When OpenSSF Scorecard flagged three advisories in build-time packages, two were fixed with an npm override, and the third, with no fixed release, was recorded in `osv-scanner.toml` with a reason and an expiry date.",
      fields: {
        oxlint: "A fast linter for JS and TS.",
        "persist-credentials": "The checkout does not leave the token behind.",
        "zizmor.yml": "Static analysis of GitHub Actions workflows.",
        "osv-scanner.toml": "An accepted risk is written down, with a date to look again.",
        override: "Forces a fixed version of a transitive dependency.",
      },
    },
    deploy: {
      short: "Deploy",
      title: "A manual deploy that keeps the last build",
      body: "Deploys are run by the maintainer with one script; CI does not deploy. It builds, writes the short commit (plus `-dirty` if the tree had changes) into a REVISION file, uploads to a staging folder and copies the live build to `dist.prev`. Then it syncs the new files into the served folder in place, because the container bind-mounts that folder and must keep seeing the same directory.\n\nCaddy in the container only serves files; TLS and the domain are handled by the shared edge proxy of dtwin.uz.",
      check: {
        q: "Why rsync into dist/ instead of renaming dist.new to dist?",
        options: [
          "rsync is faster",
          "The container mounts the dist directory; after a rename it would still see the old, now moved directory",
          "Rename is not atomic",
        ],
        answer: 1,
        why: "A bind mount follows the directory it was given, not its name. Replacing the contents keeps the same directory, so the running container sees the new files at once.",
      },
      fields: {
        REVISION: "Marks a build from uncommitted code with -dirty, so it is visible.",
        "dist.prev": "The previous build, for going back by hand.",
        rsync: "Copies changes and deletes files that are gone.",
        inode: "The directory's identity, which the bind mount holds on to.",
        sha256: "Detects a changed Caddyfile (see the scenario).",
      },
    },
    demo: {
      short: "Demo",
      title: "A live demo on a fictional athlete",
      body: "The same app builds in a demo mode for wonmor.io/demo/gym/. Instead of an empty diary it plays a fictional athlete's 36 weeks through the real session engine, so progression, records and charts look like a real person's. Dates are relative to today, changes stay in memory and a reload restores the sample.\n\nThe demo has no service worker and no support widget, and its code is imported only in demo mode, so the production build keeps exactly the same hashed file names. A Playwright suite opens every page and fails on any console error; the README screenshots come from the same demo.",
      fields: {
        "seed.ts": "The sample data, generated, not typed.",
        "session engine": "The same code a lifter uses, so the history is consistent.",
        "in memory": "A visitor cannot break the demo for the next one.",
        Playwright: "15 browser tests, run with npm run test:demo.",
        "same hashed file names": "Proof that the demo did not change the production bundle.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "1) No account: the diary is one JSON document in localStorage, with updatedAt per item and tombstones for deletions. 2) Plans hold targets and progression policies; sessions hold what happened, with RIR and a timer stored as an end time. 3) The arithmetic lives in a pure, tested core: 1RM with seven formulas, progression with reason codes, plate math in quarter units. 4) The catalogue of 1827 exercises is generated from openly licensed data; AGPL code and private media are never used. 5) Backup, CSV export and import are tested on real exports from other apps. 6) A service worker makes the gym basement a non-issue, and never updates during a session. 7) Sync is designed and tested but switched off until its prerequisites are met. 8) CI lints, tests and builds every PR and lints its own workflows; the deploy keeps the previous build and restarts Caddy only when its config changed.",
    },
  },
  scenarios: {
    "caddy-restart": {
      label: "Config not applied",
      steps: {
        "header-stale": {
          short: "Stale",
          title: "A new Caddyfile on disk, the old one in memory",
          body: "The offline work in PR #89 changed the Caddyfile: a content type for the manifest and 404 for missing assets. The deploy uploaded the file and ran `docker compose up -d`, which had nothing to do, because the image and the mounts were unchanged. Caddy keeps the config it read at start, so the new headers appeared only after someone restarted the container by hand.",
          check: {
            q: "Why did compose up not apply the new config?",
            options: [
              "The file was not uploaded",
              "compose recreates a container only when its definition changes; a changed file inside a mount is not a change to the definition",
              "Caddy rejected the file",
            ],
            answer: 1,
            why: "From compose's point of view nothing changed: same image, same volumes. The process inside has to be told to reload or be restarted.",
          },
          fields: {
            Caddyfile: "Mounted as a single file into the container.",
            "nothing to recreate": "compose up is idempotent: same definition, same container.",
            "does not watch": "Caddy does not reload when the file changes.",
            "manual restart": "A step a deploy script must never rely on a person to remember.",
          },
        },
        "header-fix": {
          short: "Compare",
          title: "Restart only when the config changed",
          body: "PR #90 records the Caddyfile's SHA-256 on the server before the upload and compares it afterwards. If it differs, the script restarts the container; if not, it does nothing. Ordinary deploys keep running without a gap, and a config change is applied in the same deploy that ships it.",
          fields: {
            OLD_CADDY: "The hash before the upload.",
            sha256sum: "A cheap, exact way to see whether the file changed.",
            restart: "Only for a new config: the new headers apply immediately.",
            "no gap": "Most deploys only change files, which Caddy serves fresh anyway.",
          },
        },
      },
    },
    "strong-2018": {
      label: "Import skipped all",
      steps: {
        "import-zero": {
          short: "Zero rows",
          title: "An old Strong export imports nothing",
          body: "The importer was tested against 22 public export files found on GitHub. One Strong export from 2018 imported nothing. Every data row was wrapped in one pair of quotes, so the parser saw a single cell per line, and the units were inside the column names (`lbs`, `mi.`). All 67 rows were skipped. In other 2018 and 2019 files the miles column, with its dot, was not recognised and would have been read as kilometres.",
          check: {
            q: "What is the most dangerous of these bugs?",
            options: [
              "The skipped rows",
              "Miles read as kilometres: the import succeeds and the data is silently wrong",
              "The quotes",
            ],
            answer: 1,
            why: "Skipped rows are visible: the preview shows zero sessions. A wrong unit imports cleanly and corrupts every cardio record without any warning.",
          },
          fields: {
            "one cell": "The whole line arrives as one quoted value.",
            "column name": "Old exports put the unit in the header instead of a value.",
            "mi.": "Miles with a trailing dot: not on the list of known units.",
            "67 rows": "Everything in that file.",
          },
        },
        "import-fixed": {
          short: "Fixed",
          title: "Fix the formats, keep the real files out of the repo",
          body: "A row with a single cell is split again; unit words in headers are read as the unit of that column, with a trailing dot ignored; a duration over 12 hours, a timer left running, is dropped. New aliases cut the unmatched Hevy names from 12.8% to 6.2%. The test fixtures reproduce each quirk with made-up rows, so no one's real training data is committed.",
          fields: {
            "single cell": "Detected and re-split before parsing the fields.",
            "trailing dot": "mi. and mi are the same unit.",
            "12 h": "A session longer than that is a forgotten timer, not training.",
            "12.8%": "Hevy names not matched before the fix; 6.2% after.",
            synthetic: "Fixtures with the format quirks, without copying anyone's data.",
          },
        },
      },
    },
  },
};

export default text;
