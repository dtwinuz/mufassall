import { defineLesson } from "@mufassall/scene-schema";

/**
 * Project lesson: dtwinuz/teletwin-web, a public GPL-3.0 fork of Telegram Web A with a local
 * "Korxona" (company) folder whose chats live on the company's own TeleTwin server. The story:
 * the user side (two worlds in one app, the CorpGate login and admin approval, the company folder,
 * revoke), the technical side (the callApi router and the corp id range, the sync engine and its
 * WebSocket hub, nothing corp-related persisted), the shells (Tauri desktop, Capacitor Android)
 * that open the hosted web build, the pipelines (PR checks, tag release with updater manifest,
 * web deploy, upstream sync by a recorded merge base) and the tools. Scenarios from the history:
 * an npm-only Dependabot bump that broke all four desktop jobs, a voice message that hung for
 * 60 s because the service worker sent a longer media URL than the parser knew, a registration
 * that waits for manual approval, and a revoke that reaches a device that was offline.
 * Every number comes from the repo (README, docs/UPSTREAM-SYNC.md, workflows, PRs #46-#57).
 */
export default defineLesson({
  slug: "project-teletwin-web",
  level: "intermediate",
  minutes: 18,
  tier: "public",
  metrics: [
    { id: "stale", unit: "", better: "down" },
    { id: "hooks", unit: "", better: "down" },
    { id: "tests", unit: "", better: "up" },
    { id: "jobs", unit: "", better: "down" },
    { id: "wait", unit: "s", better: "down" },
    { id: "conflicts", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "intro",
      kind: "case",
      nodes: {
        user: { kind: "actor", at: [0, 5] },
        ui: { kind: "client", at: [3, 5] },
        tg: { kind: "external", at: [8, 0] },
        server: { kind: "external", at: [12, 6] },
      },
      edges: {
        use: { from: "user", to: "ui", rate: 2, mode: "call" },
        mtproto: { from: "ui", to: "tg", rate: 2, mode: "call" },
        rest: { from: "ui", to: "server", rate: 1, mode: "call" },
      },
      focus: ["user", "ui", "tg", "server"],
      exchange: {
        edge: "rest",
        request: {
          format: "http",
          head: "GET /api/chats HTTP/1.1",
          headers: [
            ["Host", "tele.dtwin.uz"],
            ["Authorization", "***"],
          ],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `[
  { "id": 1, "title": "Umumiy", "kind": 1, "canPost": true, "memberCount": 36 },
  { "id": 2, "title": "E'lonlar", "kind": 2, "canPost": false },
  { "id": 7, "title": "Aziz Karimov", "kind": 3, "peerId": 12 }
]`,
        },
        marks: ["Host", "kind", "canPost", "peerId"],
        masked: ["Authorization"],
      },
    },
    {
      id: "gate",
      kind: "case",
      nodes: { admin: { kind: "actor", at: [12, 11] } },
      edges: { approve: { from: "admin", to: "server", rate: 1, mode: "call" } },
      focus: ["user", "ui", "server", "admin"],
      exchange: {
        edge: "rest",
        request: {
          format: "json",
          head: "POST /api/auth/login HTTP/1.1",
          body: `{
  "login": "a.karimov",
  "password": "***",
  "deviceId": "web-5f1c"
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "accessToken": "***",
  "employee": { "id": 12, "login": "a.karimov", "fullName": "Aziz Karimov" }
}`,
        },
        marks: ["login", "deviceId", "accessToken", "employee"],
        masked: ["password", "accessToken"],
      },
    },
    {
      id: "folder",
      kind: "case",
      focus: ["user", "ui", "server"],
      exchange: {
        edge: "rest",
        request: {
          format: "json",
          head: "POST /api/chats/1/messages HTTP/1.1",
          headers: [["Authorization", "***"]],
          body: `{
  "text": "@all reliz 15:00 da",
  "entities": [{ "type": "mention", "offset": 0, "length": 4 }],
  "replyToId": 4410,
  "clientId": "c-81f2"
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "id": 4415,
  "chatId": 1,
  "senderId": 12,
  "senderName": "Aziz Karimov",
  "sentAt": "2026-11-04T09:12:03Z",
  "clientId": "c-81f2"
}`,
        },
        marks: ["entities", "replyToId", "clientId", "id", "sentAt"],
        masked: ["Authorization"],
      },
    },
    {
      id: "revoke",
      kind: "case",
      nodes: { engine: { kind: "service", at: [8, 10] } },
      edges: {
        hub: { from: "server", to: "engine", rate: 1, mode: "async" },
        apply: { from: "engine", to: "ui", rate: 1 },
      },
      focus: ["admin", "server", "engine", "ui"],
      exchange: {
        edge: "hub",
        request: {
          format: "text",
          head: "hub event: logout   (the admin pressed Revoke)",
          body: "engine.revoke()\n  removeCredentials(telegramUserId)     the corp login for this Telegram account\n  stopSession()                          hub closed, chats, messages, read marks dropped\n  removeCorpEverywhere()                 the Korxona folder leaves the screen in every tab\n  clearCorpMedia()                       in-memory blob URLs of corp photos and voice freed\n  showNotification(TeleTwinRevoked)      \"Company access has been revoked.\"\n-- the Telegram session is not touched: personal chats stay",
        },
        marks: ["logout", "removeCredentials", "removeCorpEverywhere", "clearCorpMedia", "not touched"],
      },
    },
    {
      id: "router",
      kind: "case",
      nodes: {
        guard: { kind: "service", at: [6, 4] },
        worker: { kind: "worker", at: [5, 0] },
        provider: { kind: "service", at: [10, 4] },
      },
      edges: {
        mtproto: null,
        rest: null,
        call: { from: "ui", to: "guard", rate: 3, mode: "call" },
        tgcall: { from: "guard", to: "worker", rate: 2, mode: "call" },
        mtp: { from: "worker", to: "tg", rate: 2, mode: "call" },
        corp: { from: "guard", to: "provider", rate: 1, mode: "call" },
        api: { from: "provider", to: "server", rate: 1, mode: "call" },
      },
      focus: ["ui", "guard", "worker", "provider"],
      exchange: {
        edge: "call",
        request: {
          format: "text",
          head: "callApi('sendMessage', [{ chat: { id: '-282470681743361' }, text: '...' }])",
          body: "routeApiCall(fnName, args)   src/teletwin/guard.ts, hooked into connector.ts\n  walks the arguments up to depth 8, looking for a corp id\n  corp range: bare ids in [2^48 - 2^32, 2^48)   Telegram ids are far below\n  chat N=1    -> '-282470681743361'   employee E=1 -> '281470681743361'\n  found + the provider implements it -> kind: corp     (REST to the TeleTwin server)\n  found + no provider method         -> kind: blocked  (dropped, a console warning)\n  not found                          -> kind: telegram (GramJS worker, MTProto)",
        },
        marks: ["routeApiCall", "depth 8", "2^48", "corp", "blocked", "telegram"],
      },
    },
    {
      id: "sync",
      kind: "case",
      focus: ["server", "engine", "ui", "provider"],
      exchange: {
        edge: "hub",
        request: {
          format: "text",
          head: "wss://tele.dtwin.uz/hub?access_token=***   transport: WebSockets, skipNegotiation",
          body: "start   GET api/config, api/chats, then per chat GET messages?limit=100\nhub     invoke Ready, then catch up: GET messages?afterId=<last>  GET changes?since=<last sync>\nevents  message  message_edited  messages_deleted  reactions  pins  read  typing\n        mention  poll_updated  thread_updated  presence  status_changed  chats_changed\n        call_ring  call_updated  call_ring_ended  logout\nclosed  GET api/me first: 401 -> revoke, otherwise reconnect after 1 s, 2 s, 4 s ... 30 s",
        },
        marks: ["WebSockets", "Ready", "afterId", "changes", "401", "30 s"],
      },
    },
    {
      id: "nocache",
      kind: "fix",
      nodes: { cache: { kind: "storage", at: [1, 1] } },
      edges: { persist: { from: "ui", to: "cache", flow: "fail", rate: 1, cut: true } },
      focus: ["ui", "cache", "guard"],
      exchange: {
        edge: "persist",
        request: {
          format: "text",
          head: "src/global/cache.ts  reduceGlobal()   // TeleTwin: corp chats are never persisted",
          body: "if (hasCorpData(global)) global = removeCorpData(global)   before the state goes to disk\nmedia.ts        corp photos and voice served as in-memory blob URLs, not the media cache\nmessages.ts     a corp draft never asks Telegram for a link preview\naiMessageEditor corp text is never sent to Telegram AI services\nforward         corp messages forward only into corp chats (forward.test.ts)\nvite.config.ts  CSP connect-src: 'self', Telegram web sockets, the company server only",
        },
        marks: ["reduceGlobal", "removeCorpData", "blob", "link preview", "connect-src"],
      },
    },
    {
      id: "shells",
      kind: "case",
      nodes: { shells: { kind: "client", at: [0, 9] } },
      edges: {
        open: { from: "shells", to: "ui", rate: 1 },
        upd: { from: "shells", to: "engine", rate: 1, mode: "call" },
      },
      focus: ["shells", "ui", "server"],
      exchange: {
        edge: "upd",
        request: {
          format: "http",
          head: "GET /dtwinuz/teletwin-web/releases/latest/download/latest.json HTTP/1.1",
          headers: [["Host", "github.com"]],
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "version": "2.13.1",
  "notes": "TeleTwin 2.13.1",
  "pub_date": "2026-11-02T05:00:19Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "***",
      "url": "https://github.com/dtwinuz/teletwin-web/releases/download/v2.13.1/TeleTwin_2.13.1_x64-setup.exe"
    }
  }
}`,
        },
        marks: ["latest.json", "version", "platforms", "signature", "url"],
        masked: ["signature"],
      },
    },
    {
      id: "ci",
      kind: "case",
      nodes: {
        user: null,
        admin: null,
        cache: null,
        code: { kind: "storage", at: [1, 12] },
        ci: { kind: "worker", at: [5, 12] },
      },
      edges: { pr: { from: "code", to: "ci", rate: 2, mode: "call" } },
      metrics: { tests: 223 },
      focus: ["code", "ci"],
      exchange: {
        edge: "pr",
        request: {
          format: "text",
          head: ".github/workflows/teletwin-web-ci.yml   on: pull_request -> teletwin",
          body: "npm ci                       actions pinned to a commit SHA, persist-credentials: false\nnpx tsc --noEmit             the whole repo\nnpx eslint --max-warnings 0  src/teletwin + only the files this PR changed\nnpm test                     vitest: upstream tests + src/teletwin/*.test.ts\nconcurrency: cancel-in-progress    a new push stops the old run\n-- PR #56: tsc 0, eslint src/teletwin 0, npm test 223/223",
        },
        marks: ["SHA", "tsc", "changed", "vitest", "cancel-in-progress", "223/223"],
      },
    },
    {
      id: "release",
      kind: "case",
      nodes: { rel: { kind: "storage", at: [9, 12] } },
      edges: { build: { from: "ci", to: "rel", rate: 1 } },
      metrics: { jobs: 0 },
      focus: ["ci", "rel"],
      exchange: {
        edge: "build",
        request: {
          format: "text",
          head: "git tag v2.13.1 && git push origin v2.13.1   -> teletwin-release.yml",
          body: "desktop   windows: nsis | macos-arm64: app,dmg | macos-x64: app,dmg | linux: deb,appimage\n          tauri-action signs every updater bundle with TAURI_SIGNING_PRIVATE_KEY (minisign)\nandroid   tester APK (stable key from secrets), release AAB\npublish   collect files -> latest.json -> notes with sha256sum -> gh release create --verify-tag\n-- tags v* are protected by a ruleset: a tag can't be moved or deleted",
        },
        marks: ["nsis", "minisign", "android", "latest.json", "sha256sum", "protected"],
      },
    },
    {
      id: "deploy",
      kind: "case",
      edges: { ship: { from: "code", to: "server", rate: 1 } },
      focus: ["code", "server", "shells", "ui"],
      exchange: {
        edge: "ship",
        request: {
          format: "text",
          head: "BASE_URL=https://tele.dtwin.uz/web/ npm run build:production",
          body: "dist/            static files; source maps and build statistics are not uploaded\ndeploy-web.sh    lives in the server repo, copies dist/ to the web folder the server serves\nserved at        https://tele.dtwin.uz/web/  behind the shared edge proxy of dtwin.uz\nshells           Tauri frontendDist and Capacitor server.url point at the hosted build\n-- one web deploy updates every desktop and phone at once; a new package only when the shell changes",
        },
        marks: ["build:production", "source maps", "deploy-web.sh", "frontendDist", "server.url"],
      },
    },
    {
      id: "upstream",
      kind: "case",
      nodes: { up: { kind: "external", at: [3, 7] } },
      edges: { sync: { from: "up", to: "code", rate: 1, mode: "async" } },
      metrics: { hooks: 33, conflicts: 4 },
      focus: ["up", "code"],
      exchange: {
        edge: "sync",
        request: {
          format: "text",
          head: "scripts/upstream-sync.sh <sha>     # orphan import: no common history with Ajaxy/telegram-tt",
          body: "base=$(cat .upstream-base)          6002824... the last upstream commit taken\ngit merge-tree --write-tree --merge-base=$base HEAD <new sha>\n  always ours: dist/  tests/  .github/  package-lock.json (then npm install)\n  writes .upstream-base = <new sha>; exit 0 = clean, 2 = conflicts listed\ncheck   git grep -c \"TeleTwin:\" -- src   the same number of hooks as before\n-- dry run 2026-11-01: last 20 upstream commits replayed, conflicts in 4 files, all of them hooks",
        },
        marks: [".upstream-base", "merge-tree", "always ours", "TeleTwin:", "4 files"],
      },
    },
    {
      id: "tools",
      kind: "case",
      focus: ["ui", "engine", "shells", "ci"],
      exchange: {
        edge: "open",
        request: {
          format: "text",
          head: "package.json + tauri/ + mobile/   what the fork adds on top of Web A",
          body: "@microsoft/signalr   the company server speaks the hub protocol; WebSockets only\nlivekit-client       audio and video calls inside corp chats (#52)\ntauri 2              upstream already had tauri/; a small Rust shell instead of Electron\ncapacitor 8          Android shell + TeleTwinBridge.java (notifications, downloads, updater)\nvitest               unit tests next to the code: guard, ids, registration, forward, calls\nzizmor + Dependabot  workflow audit; monthly grouped bumps, 7-day cooldown, npm min-release-age=3",
        },
        marks: ["signalr", "livekit-client", "tauri", "capacitor", "vitest", "zizmor"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "tauri-lockstep",
      from: "release",
      steps: [
        {
          id: "lock-break",
          kind: "problem",
          edges: { build: { flow: "fail" } },
          metrics: { jobs: 4 },
          focus: ["ci", "rel"],
          exchange: {
            edge: "build",
            request: {
              format: "text",
              head: "tag v2.13.0 -> TeleTwin release, run 41384011878",
              body: "Dependabot #46: npm group, 40 updates, PR checks green (tsc + eslint + vitest), merged\nPackage windows      Found version mismatched Tauri packages\nPackage macos-arm64  Found version mismatched Tauri packages\nPackage macos-x64    Found version mismatched Tauri packages\nPackage linux        Found version mismatched Tauri packages\n  tauri-plugin-notification 2.5.1   vs  @tauri-apps/plugin-notification 2.7.0\n  tauri-plugin-shell        2.4.1   vs  @tauri-apps/plugin-shell        2.5.0\n  tauri-plugin-updater      2.13.2  vs  @tauri-apps/plugin-updater      2.14.0",
            },
            marks: ["#46", "green", "mismatched", "2.5.1", "2.7.0"],
          },
        },
        {
          id: "lock-fix",
          kind: "fix",
          edges: { build: { flow: "request" } },
          metrics: { jobs: 0 },
          focus: ["code", "ci", "rel"],
          exchange: {
            edge: "build",
            request: {
              format: "text",
              head: "PR #50  [CI] Tauri / Deps: Match Rust plugin crates to the npm plugin minors",
              body: "tauri/Cargo.toml   tauri-plugin-notification ~2.7, shell ~2.5, updater ~2.14\nCargo.lock         notification 2.7.0, shell 2.5.0, updater 2.14.1\nv2.13.0 is protected, so the release is rebuilt as v2.13.1\nrule: a PR that moves @tauri-apps/* also moves the matching crate,\n      or runs teletwin-desktop.yml on the PR branch with workflow_dispatch",
            },
            marks: ["Cargo.toml", "Cargo.lock", "v2.13.1", "workflow_dispatch"],
          },
        },
      ],
    },
    {
      id: "voice-hang",
      from: "nocache",
      steps: [
        {
          id: "voice-stuck",
          kind: "problem",
          edges: { api: { flow: "fail" } },
          metrics: { wait: 60 },
          focus: ["ui", "guard", "provider"],
          exchange: {
            edge: "api",
            request: {
              format: "text",
              head: "voice message in a corp chat: the spinner turns for about 60 s",
              body: "Web A streams audio through its service worker, part by part (\"progressive\")\nold regex   /^(?:progressive\\/)?(?:photo|document)teletwin-corp:([^?~]+).../\nexpected    progressive/documentteletwin-corp:f_1\nsent        https://tele.dtwin.uz/web/progressive/documentteletwin-corp:f_1   the full URL\nRE_CORP_MEDIA_HASH does not match -> not recognised as corp media -> no provider answers\n-- the player waits about 60 s before it gives up",
            },
            marks: ["service worker", "old regex", "full URL", "RE_CORP_MEDIA_HASH", "60 s"],
          },
        },
        {
          id: "voice-fix",
          kind: "fix",
          edges: { api: { flow: "request" } },
          metrics: { wait: 0 },
          focus: ["ui", "guard", "provider", "server"],
          exchange: {
            edge: "api",
            request: {
              format: "text",
              head: "caafd44  TeleTwin / Corp: Parse corp media ids from the full progressive URLs the service worker sends",
              body: "new regex   /^(?:.*\\/)?(?:photo|document)teletwin-corp:([^?~/]+).../   any path before the hash\nparseCorpMediaHash() now accepts the short form and the full URL: a 2-line change in ids.ts\nmedia.ts fetches the file from the company server with the corp token, as a blob\nchecked with a voice playback script before the deploy",
            },
            marks: ["new regex", "parseCorpMediaHash", "blob", "playback"],
          },
        },
      ],
    },
    {
      id: "approval",
      from: "gate",
      steps: [
        {
          id: "appr-wait",
          kind: "problem",
          edges: { rest: { flow: "retry" } },
          metrics: { wait: 15 },
          focus: ["user", "ui", "server"],
          exchange: {
            edge: "rest",
            request: {
              format: "json",
              head: "POST /api/auth/login HTTP/1.1   (a retry, the same pending registration)",
              body: `{
  "login": "d.yusupova",
  "password": "***",
  "deviceId": "web-90ab"
}`,
            },
            response: {
              format: "text",
              head: "HTTP/1.1 403 Forbidden",
              body: "{\"error\":\"pending\"}\n-- buildForbiddenError: /pending/ -> kind pending, the gate shows the waiting screen\n-- the registration sits in sessionStorage (teletwin.pending.<telegram id>)\n-- schedulePendingRetry: the same login again in 15 s, until approved or rejected",
            },
            marks: ["password", "403", "pending", "sessionStorage", "15 s"],
            masked: ["password"],
          },
        },
        {
          id: "appr-ok",
          kind: "fix",
          edges: { approve: { flow: "request" }, rest: { flow: "request" } },
          metrics: { wait: 0 },
          focus: ["admin", "server", "ui"],
          exchange: {
            edge: "approve",
            request: {
              format: "text",
              head: "the administrator approves the request in the admin panel",
              body: "next retry   POST /api/auth/login -> 200 with accessToken\nthe client   saves the corp login for this Telegram account, drops the pending entry\n             starts the sync engine: config, chats, last 100 messages, hub\nrejected     a 403 with rejected stops the retries: \"Your request was rejected\"",
            },
            marks: ["approves", "200", "pending", "rejected"],
          },
        },
      ],
    },
    {
      id: "offline-revoke",
      from: "revoke",
      steps: [
        {
          id: "off-stale",
          kind: "problem",
          edges: { hub: { flow: "fail", cut: true } },
          metrics: { stale: 1 },
          focus: ["admin", "server", "engine"],
          exchange: {
            edge: "hub",
            request: {
              format: "text",
              head: "the laptop lid was closed when the admin pressed Revoke",
              body: "hub event logout   never delivered: the socket was already dead\nthe open tab      still holds corp chats in memory until it wakes up\non disk           nothing: reduceGlobal stripped corp data before every save\n-- one device with a revoked account and corp chats on the screen",
            },
            marks: ["logout", "never delivered", "in memory", "reduceGlobal"],
          },
        },
        {
          id: "off-wipe",
          kind: "fix",
          edges: { hub: { flow: "request", cut: false } },
          metrics: { stale: 0 },
          focus: ["engine", "server", "ui"],
          exchange: {
            edge: "hub",
            request: {
              format: "http",
              head: "GET /api/me HTTP/1.1   (the engine asks before it reconnects the hub)",
              headers: [["Authorization", "***"]],
            },
            response: {
              format: "text",
              head: "HTTP/1.1 401 Unauthorized",
              body: "engine: 401 -> revoke(), the same path as the hub logout event\ncorp login, chats and media gone in every tab; the Telegram session stays\n-- any REST call that answers 401 does the same",
            },
            marks: ["Authorization", "401", "revoke"],
            masked: ["Authorization"],
          },
        },
      ],
    },
  ],
});
