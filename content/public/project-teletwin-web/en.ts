import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Project: TeleTwin Web",
  summary:
    "TeleTwin Web is a public fork of Telegram Web A: an employee keeps their normal Telegram account, and next to it a \"Korxona\" (company) folder appears whose chats never reach Telegram and live only on the company's own TeleTwin server. One revoke by the admin removes the company part and leaves personal Telegram alone. The lesson walks the user journeys, the router that keeps company data away from Telegram, the sync engine, the desktop and Android shells, and the pipelines: PR checks, tag releases with an updater manifest, the web deploy and syncing with upstream.",
  learn: [
    "What the user sees: Telegram login, the CorpGate company login with admin approval, the Korxona folder, and revoke",
    "How one hook in callApi routes every call that mentions a company id to a provider or blocks it, using a reserved id range",
    "How the sync engine uses a WebSocket hub, catches up after reconnects and never writes company data to disk",
    "How Tauri and Capacitor shells open the hosted build, so a web deploy updates every install, and how the shells update themselves",
    "The pipelines: PR checks, a tag release for 4 desktop targets and Android, the web deploy, and upstream sync with a recorded merge base",
  ],
  nodes: {
    user: "Employee",
    ui: "TeleTwin Web",
    tg: "Telegram",
    server: "TeleTwin server",
    admin: "Admin",
    engine: "Sync engine",
    guard: "API router",
    worker: "GramJS worker",
    provider: "Corp provider",
    cache: "Offline cache",
    shells: "Desktop/Android",
    code: "teletwin branch",
    ci: "GitHub Actions",
    rel: "GitHub Release",
    up: "Telegram Web A",
  },
  metrics: {
    stale: "Revoked devices still showing corp chats",
    hooks: "Upstream files the fork touches",
    tests: "Unit tests passing",
    jobs: "Failed desktop jobs per release",
    wait: "Waiting time",
    conflicts: "Files in conflict on upstream sync",
  },
  steps: {
    intro: {
      short: "Two worlds",
      title: "One messenger, two worlds",
      body: "The problem TeleTwin solves: a company runs on Telegram groups, and when an employee leaves, the work chats leave with them. TeleTwin keeps the full Telegram client (family, friends, channels) and adds a local folder named \"Korxona\". Its groups, channels and direct chats are stored only on the company's own TeleTwin server; Telegram never sees them.\n\nThis repo (`dtwinuz/teletwin-web`, GPL-3.0, public) is the web client plus its Tauri desktop and Capacitor Android shells. The server, admin panel and the classic C++ desktop client are separate private repos, so this lesson describes the server only through the contract the public client uses. The public build runs at `tele.dtwin.uz/web/`.\n\nThe company list comes from `GET /api/chats`: kind 1 is a group, 2 a channel, 3 a direct chat with another employee.",
      fields: {
        Host: "The company's server. The web build defaults to the server it was served from, elsewhere to tele.dtwin.uz; the login form can change it.",
        kind: "1 group, 2 channel, 3 direct chat. The client draws each one with the matching stock Web A chat type.",
        canPost: "In a channel only admins post; the client hides the composer when this is false.",
        peerId: "For a direct chat: the other employee, so it renders as a private chat with that person.",
      },
    },
    gate: {
      short: "CorpGate",
      title: "Telegram login first, then a mandatory company login",
      body: "The employee logs into Telegram as usual (phone and code). Then the CorpGate screen asks for a company account; the app is not usable without one. A new employee presses \"create profile\": the client sends `register` with a login, a password and the Telegram user id, and the admin approves the request in the panel. Until then login answers 403 with \"pending\"; the gate retries every 15 seconds and lets the user in as soon as the admin says yes.\n\nThe corp login is stored per Telegram account in localStorage, so two Telegram accounts in one browser have separate company sessions.",
      check: {
        q: "A new employee registered. The admin has not approved yet. What does the login call return?",
        options: [
          "200 with a token that has no rights",
          "403 whose body says pending; the gate shows a waiting screen and retries",
          "401, and the client logs out of Telegram too",
        ],
        answer: 1,
        why: "`buildForbiddenError` reads the 403 body: \"pending\" means waiting for approval, \"rejected\" means declined. A 401 is reserved for a dead session and triggers revoke, which never touches Telegram.",
      },
      fields: {
        login: "The employee's company login, not their phone number: the company account is separate from Telegram.",
        deviceId: "Lets the admin see and end sessions per device.",
        accessToken: "Bearer token for REST and the hub. Masked here.",
        employee: "The employee id becomes a corp user id inside the client, see the router step.",
      },
    },
    folder: {
      short: "Korxona folder",
      title: "The company folder works like the rest of Telegram",
      body: "Inside \"Korxona\" the user gets the stock Web A screens: send, reply, edit, delete, read ticks, typing, pins, reactions, polls, scheduled messages, threads in groups and channels, photos, voice, video and files. Company extras sit on top: `@all` and `@here`, a voice \"wake-up\" for someone who must answer now, a Jira card on hover over an issue link, a status and DND (\"Holatim\"), the employee profile, saved messages with reminders, an activity feed, a channel directory, an \"Ilovalar\" folder that opens internal web apps with single sign-on, and audio or video calls (LiveKit).\n\nEvery send carries a `clientId`. The answer and the hub echo of the same message are matched by it, so the bubble never shows twice and never stays in the \"sending\" state.",
      fields: {
        entities: "Formatting and mentions; `@all` is a mention entity with a reserved employee id.",
        replyToId: "Reply to a message in the same company chat.",
        clientId: "Client-made id: joins the POST answer and the hub echo into one bubble.",
        id: "Server id of the message. Ids grow, so the client can catch up with afterId.",
        sentAt: "Server time; the client shows it in the user's time zone.",
      },
    },
    revoke: {
      short: "Revoke",
      title: "The admin presses Revoke: the company part disappears",
      body: "When someone leaves, the admin revokes their account. The server sends `logout` over the hub, and the sync engine wipes everything company-related: the stored corp login, the session, all corp chats in every open tab, and the in-memory media. A notice says \"Company access has been revoked\". The Telegram session is not touched: personal chats keep working.\n\nIf the device was offline, the wipe happens on the next contact: any REST call that returns 401, or the `GET /api/me` check before every hub reconnect, triggers the same revoke. Nothing company-related is waiting on disk, see the step about the cache.",
      check: {
        q: "The laptop of a leaving employee was closed when the admin pressed Revoke. Can they read company chats offline the next morning?",
        options: [
          "Yes, from the offline cache, until the app goes online",
          "No: company chats are never written to the offline cache, and the first contact with the server ends in revoke",
          "Only the last 100 messages of each chat",
        ],
        answer: 1,
        why: "`reduceGlobal` strips corp data before the state is saved, and media live only as blob URLs in memory. After a reload there is nothing to show, and the first `/api/me` returns 401.",
      },
      fields: {
        logout: "A hub event, so the wipe happens in about a second on every online device.",
        removeCredentials: "Forgets the corp token stored for this Telegram account.",
        removeCorpEverywhere: "Removes corp chats from global state; other tabs follow through the multitab sync.",
        clearCorpMedia: "Frees the blob URLs of corp media held in memory.",
        "not touched": "Revoke is about the company account only. The personal Telegram account stays logged in.",
      },
    },
    router: {
      short: "Router",
      title: "One hook in callApi keeps company data away from Telegram",
      body: "Every Telegram API call in Web A goes through `callApi` in `connector.ts`. TeleTwin puts a single router there: `routeApiCall` walks the arguments (up to depth 8) looking for a company id. If it finds one and the corp provider implements the method (`fetchMessages`, `sendMessage` and many more), the call becomes REST to the TeleTwin server. If the provider has no such method, the call is dropped with a console warning. Only calls with no company id reach the GramJS worker and Telegram.\n\nCompany ids live in a reserved range: bare ids in [2^48 - 2^32, 2^48), the same range the C++ desktop fork uses. Real Telegram ids are far below, so the two never collide, and the stock UI can render company chats as ordinary chats.",
      check: {
        q: "A Web A feature calls a Telegram method the corp provider does not implement, with a company chat id in its arguments. What happens?",
        options: [
          "The call goes to Telegram, which answers with an error",
          "The router drops it: it never reaches the GramJS worker",
          "The router strips the company id and sends the rest",
        ],
        answer: 1,
        why: "Blocking is the safe default. A call with a company id that nobody knows how to serve must not reach Telegram even as an error: the arguments themselves could carry company text.",
      },
      fields: {
        routeApiCall: "The only routing point, hooked into both callApi and callApiLocal.",
        "depth 8": "Ids hide inside nested objects; the walk is bounded to keep it cheap.",
        "2^48": "The reserved range for company ids; Telegram ids never get that large.",
        corp: "Served by the provider through the company server's REST API.",
        blocked: "Dropped and counted; the counter helps find features that still need a provider method.",
        telegram: "No company reference: the call goes to Telegram unchanged.",
      },
    },
    sync: {
      short: "Sync",
      title: "The sync engine: a WebSocket hub plus catch-up",
      body: "When a company session starts, the engine loads the config, the chat list and the last 100 messages of each chat, then opens the hub. The hub runs on WebSockets only, with negotiation skipped: long polling was dropped because a revoke `logout` must arrive at once. After connecting the client invokes `Ready` and catches up every loaded chat: new messages after the last id, plus edits, deletions and reactions since the last sync.\n\nWhen the hub closes, the engine first asks `GET /api/me`. A 401 means the account was revoked; anything else means the network, and the engine reconnects after 1, 2, 4 seconds and so on, capped at 30. The engine runs in the master tab only; other tabs receive the state through Web A's multitab sync.",
      check: {
        q: "Why does the engine call GET /api/me before reconnecting the hub?",
        options: [
          "To refresh the employee's display name",
          "A revoked token may simply be refused at the socket; /me tells revoke (401) apart from a network failure",
          "SignalR requires it",
        ],
        answer: 1,
        why: "A refused WebSocket says nothing about the reason. The REST call does: 401 means revoke, so the engine wipes instead of retrying forever.",
      },
      fields: {
        WebSockets: "The only transport; negotiation is skipped, the token goes in the query.",
        Ready: "Tells the server the client is subscribed, so nothing sent in between is lost.",
        afterId: "Catch-up of messages the client missed while the socket was down.",
        changes: "Catch-up of edits, deletions, reactions and pins since the last sync time.",
        "401": "The session is gone: revoke instead of reconnect.",
        "30 s": "Back-off cap; it resets to 1 s after a successful connect.",
      },
    },
    nocache: {
      short: "No disk",
      title: "Nothing from the company is written to disk",
      body: "Web A saves its state to the browser for a fast start. TeleTwin hooks the save: before the state goes to disk, `removeCorpData` strips every company chat and message. Company media is downloaded from the company server and kept only as in-memory blob URLs, never in Web A's media cache. These are what make revoke work offline.\n\nSmaller hooks close other paths out: a company draft never asks Telegram for a link preview, company text is never sent to Telegram's AI services, company messages can be forwarded only into company chats, and the page's CSP allows network connections only to its own origin, Telegram's web sockets and the company server.",
      fields: {
        reduceGlobal: "The function that prepares the state for saving; the hook runs at its start.",
        removeCorpData: "Returns a copy of the state with no company chats, users or messages.",
        blob: "Media lives in memory and dies with the tab or on revoke.",
        "link preview": "Building a preview would send the draft's URL to Telegram.",
        "connect-src": "Even injected code could not send data to another host.",
      },
    },
    shells: {
      short: "Shells",
      title: "Desktop and Android shells open the hosted web app",
      body: "The Tauri desktop app (Windows, macOS, Linux) and the Capacitor Android app do not bundle the web code. `frontendDist` in `tauri.teletwin.conf.json` and `server.url` in `capacitor.config.json` point at the hosted build. So every web deploy updates every installed desktop and phone at once; a new package is needed only when the shell itself changes.\n\nThe shell updates itself too. The desktop shell asks the company's update channel first and falls back to `latest.json` of the newest GitHub Release. Tauri checks the minisign signature against the public key in the repo and refuses anything else. Android asks `/api/updates/android`, downloads the APK and compares its SHA-256 with the channel's value before calling the system installer.",
      check: {
        q: "The team fixes a bug in a React component of the company folder. What must employees install?",
        options: [
          "A new desktop package and a new APK",
          "Nothing: the shells load the hosted web build, so the next web deploy reaches everyone",
          "Only the APK, Tauri updates by itself",
        ],
        answer: 1,
        why: "The shells are thin windows onto the hosted app. Only changes to Rust, Java or shell configuration need a new package and go through the updater.",
      },
      fields: {
        "latest.json": "The updater manifest, written by the release workflow.",
        version: "Compared with the installed version; only a greater one is offered.",
        platforms: "One entry per target: windows-x86_64, darwin-aarch64, darwin-x86_64, linux-x86_64.",
        signature: "The minisign signature of the installer. A package signed with another key is refused.",
        url: "Where the installer is downloaded from.",
      },
    },
    ci: {
      short: "PR checks",
      title: "Pull request checks: tsc, eslint, vitest",
      body: "Every pull request into the default branch `teletwin` runs one job: install, TypeScript over the whole repo, eslint, and vitest. Eslint runs on `src/teletwin/` plus only the files the PR changed, because the upstream Web A code has hundreds of style errors under the current toolchain; linting it all would make every PR red for reasons nobody can fix. Unit tests live next to the company code: the router, the id range, the registration flow, the forward block, calls, strings.\n\nThe workflow follows the org's supply-chain rules: actions pinned to a commit SHA, `persist-credentials: false`, read-only permissions, and a concurrency group that cancels the old run when a new commit arrives. The desktop build does not run on PRs; the scenario on the release step shows what that costs.",
      check: {
        q: "Why does eslint check only src/teletwin and the changed files?",
        options: [
          "To save Actions minutes",
          "Upstream code is not lint-clean; a full lint would fail every PR on code the team does not own",
          "Eslint cannot read Teact files",
        ],
        answer: 1,
        why: "The fork wants to keep upstream files as close to upstream as possible. Fixing hundreds of style errors there would create conflicts on every upstream sync.",
      },
      fields: {
        SHA: "A moved tag can't swap the action's code under the workflow.",
        tsc: "Type checking covers upstream and fork code together: hooks break loudly.",
        changed: "Lint only what the PR touched, plus all company code.",
        vitest: "Upstream tests plus the fork's own `*.test.ts` files.",
        "cancel-in-progress": "A new push stops the older run of the same branch.",
        "223/223": "The count in PR #56, which also cleared the Scorecard vulnerabilities.",
      },
    },
    release: {
      short: "Release",
      title: "A tag builds 4 desktop targets and Android",
      body: "A release starts with a tag `vX.Y.Z`. `teletwin-release.yml` calls the desktop workflow (a matrix: Windows NSIS, macOS arm64 and x64, Linux deb and AppImage) and the Android workflow (a tester APK signed with a stable key from secrets, so a new build installs over the old one, and a release AAB). The publish job collects the files, writes the `latest.json` updater manifest, puts a SHA-256 list in the release notes and creates the GitHub Release with `--verify-tag`.\n\nTags `v*` are protected by a ruleset: once pushed, a tag can't be moved or deleted, so a broken release gets a new version number. The desktop packages are not code-signed yet; the notes say so.",
      check: {
        q: "Release v2.13.0 failed after the tag was pushed. The fix is merged. How is it released?",
        options: [
          "Move the v2.13.0 tag to the new commit",
          "Push a new tag, v2.13.1: v* tags are protected",
          "Re-run the old workflow run",
        ],
        answer: 1,
        why: "A protected tag can't be moved, and re-running builds the old commit again. A new version is also honest for the updater, which compares version numbers.",
      },
      fields: {
        nsis: "The Windows installer; macOS gets app and dmg, Linux deb and AppImage.",
        minisign: "tauri-action signs each updater bundle; the private key is a repository secret.",
        android: "The same tag builds the APK and AAB in the Android workflow.",
        "latest.json": "Built from the `.sig` files: one signature and URL per platform.",
        sha256sum: "Checksums in the notes, so anyone can verify a download.",
        protected: "The ruleset forbids moving or deleting release tags.",
      },
    },
    deploy: {
      short: "Web deploy",
      title: "Web deploy: one static build for every client",
      body: "The web part is a static build: `npm run build:production` with `BASE_URL` set writes `dist/`. A deploy script in the private server repo copies it to the folder the company server serves, leaving out source maps and build statistics (the full `dist/` is about 212 MB because of them; the shipped part is about 20 MB). The site is served behind the shared edge proxy of dtwin.uz.\n\nThis one step updates browsers, the PWA, every desktop shell and every phone. That is why the web deploy is separate from the tag release: most changes are web changes and need no new package.",
      fields: {
        "build:production": "Vite production build; Telegram api_id and api_hash come from the untracked .env.",
        "source maps": "Kept out of the server: they double the size and expose nothing useful to users.",
        "deploy-web.sh": "Lives with the server, which owns the hosting; this repo only produces dist/.",
        frontendDist: "The desktop shell's start URL.",
        "server.url": "The Android shell's start URL.",
      },
    },
    upstream: {
      short: "Upstream",
      title: "Following upstream without a shared history",
      body: "The fork began as an orphan import: its first commit is Telegram Web A at `6002824`, without upstream's history. So `git merge upstream/master` has no merge base. Instead, the last upstream commit taken is stored in `.upstream-base`, and `scripts/upstream-sync.sh` runs a real three-way merge with `git merge-tree --merge-base`. Fork-only paths always stay ours, deleted files stay deleted, and the script updates `.upstream-base`.\n\nThe company code lives in `src/teletwin/` (about 6 500 lines) and never conflicts. Inside upstream files there are only small hooks, each marked `TeleTwin:`; the hook table lists 33 files. After a sync the number of `TeleTwin:` markers must match the number before. A dry run on 2026-11-01 replayed the last 20 upstream commits: conflicts in 4 files, all of them hooks.",
      check: {
        q: "Why keep the company code in its own folder and only small marked hooks in upstream files?",
        options: [
          "Teact requires it",
          "Upstream merges then conflict only at the hooks, and a marker count shows if a hook was lost",
          "It makes the bundle smaller",
        ],
        answer: 1,
        why: "New files never conflict. Small hooks with a fixed marker are easy to re-apply by hand and easy to count, so a silent loss of a guard after a merge is caught.",
      },
      fields: {
        ".upstream-base": "The merge base the history can't provide.",
        "merge-tree": "A true three-way merge with rename detection, written to the index for review.",
        "always ours": "Upstream's own build output, tests and workflows must not come back.",
        "TeleTwin:": "The marker on every hook; its count is checked after each sync.",
        "4 files": "ChatExtra.tsx, language.d.ts, vite.config.ts, vitest.config.ts.",
      },
    },
    tools: {
      short: "Tools",
      title: "The tools, and why each one",
      body: "Telegram Web A (TypeScript, Teact, GramJS in a Web Worker) gives a complete, fast Telegram client under GPL-3.0; writing one from scratch was never an option. `@microsoft/signalr` is there because the company server speaks the SignalR hub protocol; WebSockets only. `livekit-client` brings company calls. Tauri 2 was already in upstream's `tauri/` folder and gives small native shells for three OSes. Capacitor 8 wraps the same web app for Android, plus a small Java bridge for notifications, downloads and the APK updater; an iOS shell is scaffolded and waits for an Apple developer account.\n\nAround the code: vitest for unit tests, zizmor for workflow audits, Dependabot with monthly grouped bumps for npm, cargo, gradle and actions and a 7-day cooldown, and `.npmrc` with `min-release-age=3` so a package must be at least 3 days old before it is installed.",
      fields: {
        signalr: "The client of the company server's hub protocol.",
        "livekit-client": "WebRTC media for calls; the server issues the join token.",
        tauri: "Rust shell with the system webview: small installers, built-in signed updater.",
        capacitor: "Android shell; the bridge adds what a WebView lacks.",
        vitest: "Fast unit tests that run in the same PR job as tsc.",
        zizmor: "Finds risky workflow patterns such as leaked checkout credentials.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "What to take from TeleTwin Web.\n\n1) Fork a mature client and add a layer, instead of writing a messenger: the company code lives in its own folder, upstream files get only small marked hooks. 2) Put one router at the single choke point (`callApi`) and make blocking the default for anything with a company id. 3) Give company entities their own id range so the stock UI can show them without collisions. 4) Make revoke real: a hub `logout`, a 401 check before reconnects, and nothing company-related on disk. 5) Keep shells thin: they load the hosted build, so a web deploy updates everyone, and they update themselves only with signed, checked packages. 6) Release from protected tags with a manifest and checksums. 7) Follow upstream with a recorded merge base and count the hooks after each sync. 8) Remember what the PR checks do not cover: the desktop build.",
    },
  },
  scenarios: {
    "tauri-lockstep": {
      label: "npm-only bump",
      steps: {
        "lock-break": {
          short: "Red release",
          title: "A green Dependabot PR breaks all four desktop jobs",
          body: "Dependabot PR #46 bumped the npm group: 40 updates, among them the Tauri plugin packages. The PR checks (tsc, eslint, vitest) were green, so it was merged. The next tag, v2.13.0, failed in all four desktop jobs: tauri-action refuses to build when the npm plugin packages and the Rust plugin crates have different minor versions.\n\nThe PR checks never build the desktop app, and the desktop workflow runs on push only when `tauri/**` changes. The npm side lives in `package.json`, so nothing ran until the release.",
          check: {
            q: "Which check would have caught this before the merge?",
            options: [
              "Running vitest twice",
              "Building the desktop app for the PR branch (workflow_dispatch of teletwin-desktop.yml)",
              "Eslint on package.json",
            ],
            answer: 1,
            why: "Only tauri-action compares the npm packages with the crates. Running the desktop workflow on the PR branch, or bumping the crates in the same PR, closes the gap.",
          },
          fields: {
            "#46": "A grouped npm update: one PR, 40 packages.",
            green: "The PR checks passed: they do not include the Tauri build.",
            mismatched: "tauri-action's check that the npm plugins match the Rust crates.",
            "2.5.1": "The Rust crate version still in Cargo.toml.",
            "2.7.0": "The npm version after the bump.",
          },
        },
        "lock-fix": {
          short: "Lockstep",
          title: "Match the crates, release a new tag, write the rule",
          body: "PR #50 raised the Rust crates to the same minor versions as npm and updated `Cargo.lock`. Because `v2.13.0` is a protected tag, the release was rebuilt as `v2.13.1`, which is the GitHub Release with all desktop packages, the APK and `latest.json`.\n\nThe lasting fix is a rule: any PR that changes `@tauri-apps/*` also changes the matching crate in `tauri/Cargo.toml`, or runs the desktop workflow on its branch before merge.",
          fields: {
            "Cargo.toml": "Crates pinned with ~ to the npm minor: ~2.7, ~2.5, ~2.14.",
            "Cargo.lock": "The resolved versions after the change.",
            "v2.13.1": "A new tag, because the old one can't be moved.",
            workflow_dispatch: "Run the desktop build on demand for a PR branch.",
          },
        },
      },
    },
    "voice-hang": {
      label: "Voice hangs 60 s",
      steps: {
        "voice-stuck": {
          short: "Stuck",
          title: "A company voice message spins for a minute",
          body: "In production, company voice messages kept spinning for about 60 seconds. Web A streams audio through its service worker in parts, and the provider recognises company media by a regex on the media hash. The regex allowed only an optional `progressive/` prefix, but the service worker passes the full URL, with scheme, host and path.\n\nSo the request did not look like company media: no provider answered, and the player waited for its timeout.",
          check: {
            q: "Why did photos work while voice messages hung?",
            options: [
              "Photos are smaller",
              "Photos load by the short media hash; voice streams through the service worker, which sends the full URL",
              "The server serves voice more slowly",
            ],
            answer: 1,
            why: "Only the progressive (streamed) path went through the service worker with a full URL; the regex was written for the short hash form.",
          },
          fields: {
            "service worker": "Web A's worker that serves streamed media parts to the player.",
            "old regex": "Only `progressive/` could stand before the corp media hash.",
            "full URL": "What the service worker actually passes.",
            RE_CORP_MEDIA_HASH: "The pattern that decides whether a media request is company media.",
            "60 s": "What the user saw: a spinner until the player gave up.",
          },
        },
        "voice-fix": {
          short: "Any path",
          title: "Accept any path before the hash",
          body: "Commit `caafd44` changed one regex: any path may now stand before `photo` or `document` plus the corp prefix. The same parser serves the short form and the full URL, and `media.ts` fetches the file from the company server with the company token, as an in-memory blob.\n\nA voice playback script confirmed the fix before the deploy. The wait went from about a minute to normal playback.",
          fields: {
            "new regex": "`^(?:.*\\/)?` accepts any prefix ending in a slash.",
            parseCorpMediaHash: "The single parser used by the provider and the media loader.",
            blob: "The file stays in memory, in line with the no-disk rule.",
            playback: "A script that plays a corp voice message end to end.",
          },
        },
      },
    },
    approval: {
      label: "Manual approval",
      steps: {
        "appr-wait": {
          short: "Pending",
          title: "A new employee waits for the administrator",
          body: "A new employee registers from the CorpGate screen. Until an administrator says yes, every login answers 403 with \"pending\". The client keeps the registration in sessionStorage for this Telegram account, shows the waiting screen and retries the same login every 15 seconds. Nobody has to press anything again, and a reload of the tab keeps the waiting state.",
          check: {
            q: "Why does the client retry every 15 s instead of asking the employee to log in again later?",
            options: [
              "The server rejects logins slower than 15 s",
              "Approval is a manual step on the admin side; polling lets the app open the moment it happens, with no action from the employee",
              "Telegram requires it",
            ],
            answer: 1,
            why: "The approval happens in another app, by another person. A short retry loop turns it into an automatic unlock without a push channel for an account that has no token yet.",
          },
          fields: {
            password: "Kept only in sessionStorage for the retries. Masked here.",
            "403": "Forbidden: the account exists but may not log in yet.",
            pending: "The body that tells waiting apart from rejected.",
            sessionStorage: "Per tab, gone when the tab closes; keyed by the Telegram user id.",
            "15 s": "PENDING_RETRY_INTERVAL in src/teletwin/index.ts.",
          },
        },
        "appr-ok": {
          short: "Approved",
          title: "The administrator approves: the next retry opens the app",
          body: "The administrator approves the request in the admin panel. The next retry gets 200 with an access token; the client stores the corp login for this Telegram account, removes the pending entry and starts the sync engine. If the administrator rejects instead, the 403 says \"rejected\", the retries stop and the employee sees a message to contact the administrator.",
          fields: {
            approves: "A manual decision in the admin panel of the company server.",
            "200": "The normal login answer: token and employee.",
            pending: "The entry is removed, so a reload goes straight to the app.",
            rejected: "Final: no more retries.",
          },
        },
      },
    },
    "offline-revoke": {
      label: "Revoke while offline",
      steps: {
        "off-stale": {
          short: "Missed event",
          title: "The logout event never reaches a sleeping laptop",
          body: "The administrator revoked an employee whose laptop lid was closed. The hub event was never delivered, because the socket was already dead. The tab still holds corp chats in memory, so the moment the lid opens they would be on the screen. Nothing is on disk: reduceGlobal stripped corp data before every save.",
          check: {
            q: "What makes sure this laptop is cleaned up when it wakes?",
            options: [
              "The administrator has to revoke it again",
              "Before reconnecting the hub, the engine calls GET /api/me; a 401 runs the same revoke",
              "The next Telegram login",
            ],
            answer: 1,
            why: "A missed push is expected on mobile and sleeping devices. The check on reconnect turns any missed logout into the same wipe, so delivery of the event is not required.",
          },
          fields: {
            logout: "The hub event that normally wipes the device in about a second.",
            "never delivered": "The socket died with the sleep; the server cannot reach it.",
            "in memory": "Only the open tab's state; it is lost on reload anyway.",
            reduceGlobal: "Keeps corp data off the disk, so there is nothing to read offline.",
          },
        },
        "off-wipe": {
          short: "401 wipes",
          title: "On wake, GET /api/me answers 401 and the engine revokes",
          body: "When the laptop wakes, the hub reconnect starts with `GET /api/me`. The token belongs to a revoked account, so the server answers 401, and the engine runs `revoke()`: the same path as the hub event. Corp login, chats and media disappear in every tab; the Telegram session stays. Any other REST call that answers 401 would do the same.",
          fields: {
            Authorization: "The revoked corp token. Masked here.",
            "401": "No session: the trigger for the wipe.",
            revoke: "One function for the hub event, a REST 401 and the reconnect check.",
          },
        },
      },
    },
  },
};

export default text;
