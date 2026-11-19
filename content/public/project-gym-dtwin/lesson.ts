import { defineLesson } from "@mufassall/scene-schema";

/**
 * Project lesson: gym.dtwin, a workout diary that runs in the browser without an account. One
 * profile document in localStorage (local-first, per-item updatedAt and tombstones), a pure,
 * tested domain core (1RM, progression, plates, schedule), a catalogue generated from open
 * datasets, JSON backup and CSV import from other apps, a service worker for offline use, a sync
 * API that is written but not deployed, CI and a manual deploy. Facts come from dtwinuz/gym-dtwin
 * (README, docs/PLAN.md, docs/W8-SYNC.md, src/, deploy/, workflows, PRs #74-#94). Scenarios: a
 * Caddyfile change that needed a manual restart, and a Strong export whose 67 rows were all skipped.
 */
export default defineLesson({
  slug: "project-gym-dtwin",
  level: "intermediate",
  minutes: 16,
  tier: "public",
  metrics: [
    { id: "exercises", unit: "", better: "up" },
    { id: "tests", unit: "", better: "up" },
    { id: "precache", unit: "", better: "up" },
    { id: "unmatched", unit: "%", better: "down" },
    { id: "skipped", unit: "", better: "down" },
    { id: "manual", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "intro",
      kind: "case",
      nodes: {
        phone: { kind: "client", at: [0, 3] },
        edge: { kind: "lb", at: [4, 3] },
        site: { kind: "service", at: [8, 3] },
        store: { kind: "storage", at: [0, 8] },
      },
      edges: {
        load: { from: "phone", to: "edge", rate: 1, mode: "call" },
        pass: { from: "edge", to: "site", rate: 1, mode: "call" },
        keep: { from: "phone", to: "store", rate: 2 },
      },
      metrics: { exercises: 0, tests: 0, precache: 0, unmatched: 12.8, skipped: 0, manual: 0 },
      focus: ["phone", "store"],
      exchange: {
        edge: "keep",
        request: {
          format: "json",
          head: "localStorage[\"gym-dtwin:v2\"]  (one profile document)",
          body: `{
  "settings": { "lang": "uz", "unit": "kg", "theme": "dark", "oneRmFormula": "epley" },
  "routines": [{ "id": "r_upper", "name": "Upper A", "ex": [], "updatedAt": 1763350000000 }],
  "week": { "1": ["r_upper"], "4": ["r_lower"] },
  "workouts": [{ "id": "w_88", "date": "2026-11-17", "vol": 8420, "prs": ["barbell-bench-press"], "updatedAt": 1763372000000 }],
  "active": null,
  "deleted": { "routines": { "r_old": 1763100000000 } },
  "updatedAt": 1763372000000
}`,
        },
        marks: ["settings", "routines", "workouts", "active", "deleted", "updatedAt"],
      },
    },
    {
      id: "plan",
      kind: "case",
      focus: ["phone", "store"],
      exchange: {
        edge: "keep",
        request: {
          format: "json",
          head: "a slot in the routine editor: the plan, not the log",
          body: `{
  "exId": "barbell-bench-press",
  "sets": 3,
  "reps": 10,
  "repsMin": 8,
  "weight": 60,
  "prog": "double",
  "inc": 2.5,
  "restSec": 120,
  "sg": "A",
  "subs": ["dumbbell-bench-press"]
}`,
        },
        marks: ["repsMin", "prog", "inc", "restSec", "sg", "subs"],
      },
    },
    {
      id: "workout",
      kind: "case",
      focus: ["phone", "store"],
      exchange: {
        edge: "keep",
        request: {
          format: "json",
          head: "profile.active while a session is running",
          body: `{
  "id": "s_91",
  "date": "2026-11-19",
  "entries": [{
    "exId": "barbell-bench-press",
    "rx": { "sets": 3, "reps": 10, "weight": 62.5, "why": "load" },
    "sets": [{ "w": 62.5, "r": 10, "rir": 2, "done": true }, { "w": 62.5, "r": 9, "rir": 1, "done": true }]
  }],
  "rest": { "endsAt": 1763538125000, "total": 120 },
  "lastAt": 1763538005000
}`,
        },
        marks: ["rx", "why", "rir", "endsAt", "lastAt"],
      },
    },
    {
      id: "progress",
      kind: "case",
      focus: ["phone", "store"],
      exchange: {
        edge: "keep",
        request: {
          format: "text",
          head: "src/core/onerm.ts: estimated one-rep max",
          body: "e1rm(100 kg, 5 reps, epley, rir 2) -> reps counted as 5 + 2 = 7 -> 100 * (1 + 7/30) = 123.3 kg\nREP_CAP = 12: above that the estimate is too noisy to be a strength number\nformulas: epley brzycki lombardi oconner mayhew wathan lander (chosen in Settings)\nProgress: 12-month activity map, weekly sets per muscle, e1RM chart per exercise,\n          body weight with a goal line, measurements, progress photos (kept in IndexedDB)",
        },
        marks: ["e1rm", "REP_CAP", "formulas", "IndexedDB"],
      },
    },
    {
      id: "catalogue",
      kind: "case",
      nodes: {
        sources: { kind: "external", at: [12, 0] },
        build: { kind: "worker", at: [12, 4] },
      },
      edges: {
        fetch: { from: "sources", to: "build", rate: 1 },
        emit: { from: "build", to: "site", rate: 1 },
      },
      metrics: { exercises: 1827 },
      focus: ["sources", "build", "site"],
      exchange: {
        edge: "emit",
        request: {
          format: "text",
          head: "scripts/build-catalogue.mjs, build-exdb.mjs, build-musclemap.mjs -> src/catalogue/data/",
          body: "free-exercise-db (Unlicense)        876 exercises, 1746 WebP images at 480 px, served from /ex/\nexercises-dataset (MIT), text only  951 added after dedupe, pinned at a commit\nMuscleMap (MIT)                     body map outlines, male and female, front and back\nuz and ru names, steps, synonyms    written by the project (content/*.json)\ncatalogue total                     1827  (generated: never edited by hand)\nnot used: openGym code, texts and its exercise media (AGPL and private licences)",
        },
        marks: ["Unlicense", "1746", "dedupe", "MuscleMap", "1827", "not used"],
      },
    },
    {
      id: "core",
      kind: "case",
      nodes: { sources: null, build: null },
      focus: ["phone", "store"],
      exchange: {
        edge: "keep",
        request: {
          format: "text",
          head: "src/core/: pure functions, no UI, covered by tests",
          body: "solvePlates(72.5, bar 20, owned pairs) -> per side [25, 1.25], loaded 72.5, short 0\n  0/1 knapsack in quarter units, so 1.25 and 0.5 kg plates stay integers\nnextPrescription(...) -> { weight, reps, why }\n  why: first plan hold off load reps set time deload effort\n  all sets made but average RIR <= 0.5 -> same weight again (why: effort)\n  missed 3 times at one weight -> deload to 90%",
        },
        marks: ["solvePlates", "quarter units", "why", "effort", "deload"],
      },
    },
    {
      id: "backup",
      kind: "fix",
      focus: ["phone", "store"],
      exchange: {
        edge: "keep",
        request: {
          format: "json",
          head: "Settings > Data > Backup: gym-dtwin-backup.json",
          body: `{
  "kind": "gym-dtwin-backup",
  "v": 1,
  "exportedAt": "2026-11-19T07:40:00.000Z",
  "profile": { "settings": {}, "routines": [], "workouts": [] }
}`,
        },
        response: {
          format: "text",
          head: "restore and import rules",
          body: "restore: kind, version and shape are checked; on any error nothing changes\n         the current profile is saved as gym-dtwin:v2:pre-restore; Undo is offered\nCSV export: UTF-8 BOM, CRLF, RFC 4180; a cell starting with = + - @ gets a leading '\nCSV import: Strong, Hevy, FitNotes or generic, detected by header; unknown names become custom exercises",
        },
        marks: ["kind", "v", "exportedAt", "pre-restore", "RFC 4180", "custom exercises"],
      },
    },
    {
      id: "offline",
      kind: "fix",
      nodes: {
        sw: { kind: "worker", at: [4, 6] },
      },
      edges: {
        cache: { from: "phone", to: "sw", rate: 2, mode: "call" },
      },
      metrics: { precache: 50, tests: 452 },
      focus: ["phone", "sw", "site"],
      exchange: {
        edge: "cache",
        request: {
          format: "text",
          head: "vite-plugin-pwa 2.0.0, generateSW, registerType: prompt  (PR #89)",
          body: "precache: index.html and every JS/CSS chunk, 50 files, about 3.8 MB, lazy pages included\n/ex/*  exercise images: CacheFirst, 600 entries, 60 days, purge on quota error\n/api/* NetworkOnly; /overview/ and /deck/ are left out of the navigation fallback\nnew version: a toast with an Update button, never while profile.active is set\nCaddy: a missing file under /assets, /ex or /icons is a 404, not index.html",
        },
        marks: ["precache", "CacheFirst", "NetworkOnly", "profile.active", "404"],
      },
    },
    {
      id: "sync",
      kind: "case",
      nodes: {
        sw: null,
        api: { kind: "service", at: [8, 8] },
      },
      edges: {
        put: { from: "phone", to: "api", rate: 0, mode: "call" },
      },
      focus: ["phone", "api", "store"],
      exchange: {
        edge: "put",
        request: {
          format: "json",
          head: "PUT /api/data HTTP/1.1   (written and tested, NOT deployed: VITE_SYNC_ENABLED is off)",
          headers: [["Authorization", "***"]],
          body: `{
  "kind": "gym-dtwin-profile",
  "baseRev": 1763538000412,
  "profile": { "workouts": [], "deleted": {}, "stamps": {} }
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 409 Conflict",
          body: `{
  "rev": 1763538000415,
  "profile": { "workouts": [], "deleted": {}, "stamps": {} }
}`,
        },
        marks: ["baseRev", "stamps", "rev"],
        masked: ["Authorization"],
      },
    },
    {
      id: "ci",
      kind: "fix",
      nodes: {
        api: null,
        ci: { kind: "worker", at: [12, 7] },
      },
      edges: {
        check: { from: "ci", to: "site", rate: 1, mode: "async" },
      },
      metrics: { tests: 465 },
      focus: ["ci", "site"],
      exchange: {
        edge: "check",
        request: {
          format: "text",
          head: ".github/workflows/ci.yml  (pull requests and pushes to main; docs-only changes skip it)",
          body: "npm ci && npm run lint && npm test && npm run build     oxlint, vitest, tsc -b + vite build\nactions pinned by commit SHA, persist-credentials: false, permissions: contents: read\nzizmor.yml: lints the workflows themselves, fails on medium or higher\nDependabot monthly; osv-scanner.toml records an accepted advisory with a reason and an end date\nPR #92: glob and minimatch fixed by an npm override; deepmerge has no fixed release, accepted until 2027-05-13",
        },
        marks: ["oxlint", "persist-credentials", "zizmor.yml", "osv-scanner.toml", "override"],
      },
    },
    {
      id: "deploy",
      kind: "fix",
      nodes: {
        ci: null,
        owner: { kind: "actor", at: [12, 11] },
      },
      edges: {
        ship: { from: "owner", to: "site", rate: 1, mode: "call" },
      },
      focus: ["owner", "site"],
      exchange: {
        edge: "ship",
        request: {
          format: "text",
          head: "bash deploy/deploy.sh  (by hand; CI does not deploy)",
          body: "npm run build; REVISION = short sha, plus -dirty if the tree has changes\ntar dist into dist.new on the server; cp -a dist dist.prev\nrsync -a --delete dist.new/ dist/   the bind-mounted folder keeps its inode\ndocker compose up -d; restart the container if the Caddyfile's sha256 changed\nTLS and the domain stay at the shared edge proxy of dtwin.uz",
        },
        marks: ["REVISION", "dist.prev", "rsync", "inode", "sha256"],
      },
    },
    {
      id: "demo",
      kind: "case",
      focus: ["owner", "site", "phone"],
      exchange: {
        edge: "ship",
        request: {
          format: "text",
          head: "npm run build:demo  ->  vite build --mode demo, base /demo/gym/  (PR #94)",
          body: "src/demo/seed.ts: a fictional athlete's 36 weeks, played through the real session engine\n  so progression, records and stats come out the way they would for a person (140+ workouts)\ndates relative to Date.now(); changes live in memory, a reload restores the sample\nno service worker and no support widget in the demo; demo code is only imported in demo mode\nnpm run test:demo: Playwright, 15 tests, every page opens with no console error\nthe regular dist/ keeps the same hashed file names as before",
        },
        marks: ["seed.ts", "session engine", "in memory", "Playwright", "same hashed file names"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "caddy-restart",
      from: "deploy",
      steps: [
        {
          id: "header-stale",
          kind: "problem",
          nodes: { site: { state: "slow" } },
          metrics: { manual: 1 },
          focus: ["owner", "site"],
          exchange: {
            edge: "ship",
            request: {
              format: "text",
              head: "PR #89 shipped a new Caddyfile (manifest type, 404 for missing assets)",
              body: "scp deploy/Caddyfile -> /opt/.../Caddyfile   the file on the server is new\ndocker compose up -d                          nothing to recreate: the image and mounts are the same\ncurl -I /manifest.webmanifest                 still the old Content-Type\n-- Caddy reads its config at start and does not watch the file\n-- the new headers worked only after a manual restart",
            },
            marks: ["Caddyfile", "nothing to recreate", "does not watch", "manual restart"],
          },
        },
        {
          id: "header-fix",
          kind: "fix",
          nodes: { site: { state: "ok" } },
          metrics: { manual: 0 },
          focus: ["owner", "site"],
          exchange: {
            edge: "ship",
            request: {
              format: "text",
              head: "PR #90: deploy.sh compares the Caddyfile before and after",
              body: "OLD_CADDY=$(ssh host \"sha256sum Caddyfile\")    taken before the upload\n... upload ...\nif [ \"$(sha256sum Caddyfile)\" != \"$OLD_CADDY\" ]; then docker compose restart gym-dtwin; fi\n-- unchanged config: no restart, no gap; changed config: applied in the same deploy",
            },
            marks: ["OLD_CADDY", "sha256sum", "restart", "no gap"],
          },
        },
      ],
    },
    {
      id: "strong-2018",
      from: "backup",
      steps: [
        {
          id: "import-zero",
          kind: "problem",
          metrics: { skipped: 67 },
          focus: ["phone", "store"],
          exchange: {
            edge: "keep",
            request: {
              format: "text",
              head: "import of a 2018 Strong export (one of 22 public export files tested, PR #88)",
              body: "Date;Workout Name;Exercise Name;Set Order;lbs;Reps;mi.;Seconds;Notes;Workout Notes\n\"2026-01-05 07:10:00;\"\"A\"\";\"\"Squat\"\";1;95;5;;0;\"\"\"\";\"\"\"\"\"\n-- the shape of the synthetic fixture strong-2018.csv; every row is wrapped in quotes: the parser sees one cell per line\n-- the unit is inside the column name, and \"mi.\" with a dot was not known\n-- result: all 67 rows skipped; in 2018-19 files miles would have been read as km",
            },
            marks: ["one cell", "column name", "mi.", "67 rows"],
          },
        },
        {
          id: "import-fixed",
          kind: "fix",
          metrics: { skipped: 0, unmatched: 6.2 },
          focus: ["phone", "store"],
          exchange: {
            edge: "keep",
            request: {
              format: "text",
              head: "fixes, checked on 9 Strong, 6 Hevy and 7 FitNotes files",
              body: "a row with a single cell is split again\nlbs / kgs / mi / km in a header are read as the unit of that column; a trailing dot is ignored\na duration over 12 h (a timer left running) is dropped\nHevy: names not matched to the catalogue 12.8% -> 6.2%, 24 drop sets merged\nthe test fixtures are synthetic rows with the same quirks; no real export is in the repo",
            },
            marks: ["single cell", "trailing dot", "12 h", "12.8%", "synthetic"],
          },
        },
      ],
    },
  ],
});
