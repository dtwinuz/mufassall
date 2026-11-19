import { defineLesson } from "@mufassall/scene-schema";

/**
 * bitg (github.com/dtwinuz/bitg, bitg.uz): Uzbek text to the 2026 Latin alphabet while the user
 * types. One Rust core, thin input-method shells for Windows (TSF), Linux (IBus, Fcitx5) and macOS
 * (InputMethodKit), a static site with the same core in WebAssembly, a small Rust service for
 * feedback, MCP and the Telegram bot, a tag-driven release with SLSA provenance, and package
 * channels. Every number below comes from the repository, its releases or its history (Nov 2026).
 */
export default defineLesson({
  slug: "project-bitg",
  level: "intermediate",
  minutes: 24,
  tier: "public",
  metrics: [
    { id: "uz", unit: "%", better: "up" },
    { id: "noapos", unit: "%", better: "up" },
    { id: "en", unit: "%", better: "up" },
    { id: "us", unit: "µs", better: "down" },
    { id: "verified", unit: "", better: "up" },
    { id: "channels", unit: "", better: "up" },
  ],
  steps: [
    {
      id: "setup",
      kind: "case",
      nodes: {
        user: { kind: "actor", at: [0, 6] },
        app: { kind: "client", at: [3, 6] },
        ime: { kind: "service", at: [6, 6] },
        core: { kind: "worker", at: [9, 6] },
      },
      edges: {
        type: { from: "user", to: "app", rate: 3, mode: "call" },
        keys: { from: "app", to: "ime", rate: 3, mode: "call" },
        edit: { from: "ime", to: "core", rate: 3, mode: "call" },
      },
      metrics: { uz: 98.87, noapos: 81.2, en: 99.73, us: 2.7, verified: 6, channels: 5 },
      focus: ["user", "app", "core"],
      exchange: {
        edge: "edit",
        request: {
          format: "text",
          head: "bitg CLI, the same core as the keyboard",
          body: "$ bitg \"O'zbekiston shaharlari: Toshkent, Samarqand\"\nÖzbekiston şaharlari: Toşkent, Samarqand\n\n$ bitg \"Please check the schedule, keyin choy ichamiz\"\nPlease check the schedule, keyin çoy içamiz\n\n$ bitg old --ascii \"Özbekiston şaharlari\"\nO'zbekiston shaharlari",
        },
        marks: ["Özbekiston", "Toşkent", "Please check the schedule", "çoy", "old --ascii"],
      },
    },
    {
      id: "typing",
      kind: "case",
      edges: { keys: { flow: "request" }, edit: { flow: "ack" } },
      focus: ["app", "ime", "core"],
      exchange: {
        edge: "edit",
        request: {
          format: "text",
          head: "one finished word, one edit   (bitg-core Session)",
          body: "app       Word; the user types  o'zbek  and presses Space\nshell     complete_word(\"o'zbek\", options)\ncore      Edit { delete: 6, insert: \"özbek\" }\nscreen    özbek |\nBackspace right after the swap   ->  o'zbek is back\nexceptions.txt                   +   o'zbek  (left alone from now on)",
        },
        marks: ["Space", "complete_word", "delete: 6", "insert", "Backspace", "exceptions.txt"],
      },
    },
    {
      id: "english",
      kind: "case",
      focus: ["core"],
      exchange: {
        edge: "edit",
        request: {
          format: "text",
          head: "what the core changes and what it leaves alone",
          body: "check, How are you shah     -> unchanged   English evidence (SCOWL list)\nMenga chat yozing           -> unchanged   chat reads as English here\nMenga choy yozing           -> Menga çoy yozing\nhttps://bitg.uz  @user  snake_case  push()  shahar123  -> untouched\n'Yaxshi tong'  is a quote,  tog'  -> toğ\nIs'hoq -> Ishoq\nMichelle, Charlie Chaplin   -> as written (foreign names)\nochmaydi                    -> left as typed, marked: och|maydi or o'ch|maydi",
        },
        marks: ["SCOWL", "çoy", "untouched", "toğ", "Ishoq", "foreign names", "marked"],
      },
    },
    {
      id: "everywhere",
      kind: "case",
      nodes: {
        site: { kind: "cdn", at: [4, 2] },
        bot: { kind: "service", at: [9, 2] },
        ai: { kind: "external", at: [12, 0] },
        tg: { kind: "external", at: [12, 4] },
      },
      edges: {
        web: { from: "user", to: "site", rate: 2, mode: "call" },
        mcp: { from: "ai", to: "bot", rate: 2, mode: "call" },
        chat: { from: "tg", to: "bot", rate: 1, mode: "call" },
        lib: { from: "bot", to: "core", rate: 2, mode: "call" },
      },
      focus: ["site", "bot", "ai", "tg"],
      exchange: {
        edge: "mcp",
        request: {
          format: "json",
          head: "POST https://bitg.uz/mcp",
          headers: [
            ["Content-Type", "application/json"],
            ["Mcp-Protocol-Version", "2025-06-18"],
          ],
          body: `{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "convert_text",
    "arguments": { "text": "O'zbekiston shaharlari", "direction": "to_new" }
  }
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "content": [{ "type": "text", "text": "Özbekiston şaharlari" }],
    "structuredContent": { "text": "Özbekiston şaharlari", "direction": "to_new", "converted_by": "bitg (https://bitg.uz)" },
    "isError": false
  }
}`,
        },
        marks: ["Mcp-Protocol-Version", "method", "name", "direction", "structuredContent", "converted_by"],
      },
    },
    {
      id: "core",
      kind: "case",
      edges: { edit: { flow: "request" }, lib: { flow: "request" } },
      focus: ["core"],
      exchange: {
        edge: "edit",
        request: {
          format: "text",
          head: "crates/bitg-core: what is inside one word lookup",
          body: "token.rs      split the text into words, links, code, numbers\nlang.rs       is this word Uzbek?  uz.tsv 71 933 words, SCOWL English, brands, 3 419 foreign names\nlatin.rs      o' -> ö  g' -> ğ  sh -> ş  ch -> ç,  12 apostrophe forms -> ʼ (U+02BC)\nbuild.rs      the word lists become hash tables inside the binary\nload time     0 ms, memory 1.1 MB, 2.7 µs per Uzbek word, 1.4 µs per English word\neval/         3 000 Uzbek + 3 000 English sentences, never used to build the lexicon",
        },
        marks: ["token.rs", "lang.rs", "71 933", "U+02BC", "build.rs", "0 ms", "eval/"],
      },
    },
    {
      id: "platforms",
      kind: "case",
      edges: { keys: { flow: "request" }, edit: { flow: "ack" } },
      focus: ["app", "ime"],
      exchange: {
        edge: "keys",
        request: {
          format: "text",
          head: "one core, four input-method shells",
          body: "Windows  bitg-tsf (Rust DLL)   ITfTextEditSink sees the text change, an edit session swaps the word\n         Qt apps (Telegram) give no text: the word is rebuilt from keys, SendInput Backspace + new word\nLinux    bitg-ime (C ABI)  ->  IBus engine (C)  and  Fcitx5 addon (C++)\nmacOS    bitg-ime (C ABI)  ->  InputMethodKit (Swift), universal arm64 + x86_64\n         wants_before: ask the app for text only at word edges, \"choy \" 5 -> 2 calls\nno keyboard hook, no clipboard",
        },
        marks: ["ITfTextEditSink", "SendInput", "C ABI", "IBus", "Fcitx5", "InputMethodKit", "wants_before", "no keyboard hook"],
      },
    },
    {
      id: "privacy",
      kind: "fix",
      focus: ["app", "ime"],
      exchange: {
        edge: "keys",
        request: {
          format: "text",
          head: "%LOCALAPPDATA%\\bitg\\tsf.log   (events and error codes, never typed text)",
          body: "focus  WINWORD.EXE  activate\ninput scope: app: vt=13 scopes=[5] -> sensitive field, off\nfocus  KeePassXC.exe  default disabled app, off\nfocus  WindowsTerminal.exe  terminal, off\npanic caught at the COM boundary, logged, the host app keeps running",
        },
        marks: ["never typed text", "input scope", "sensitive field", "default disabled app", "terminal", "panic caught"],
      },
    },
    {
      id: "server",
      kind: "case",
      edges: { fb: { from: "app", to: "bot", rate: 1, mode: "call" } },
      focus: ["app", "bot", "tg"],
      exchange: {
        edge: "fb",
        request: {
          format: "json",
          head: "POST https://bitg.uz/api/feedback",
          headers: [["Content-Type", "application/json"]],
          body: `{
  "v": 1,
  "kind": "conversion",
  "typed": "Jordan keldi.",
  "got": "Jördan keldi.",
  "expected": "Jordan keldi.",
  "app": "windows",
  "version": "0.5.0",
  "id": "a1b2c3d4-install"
}`,
        },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK",
          body: `{ "ok": true, "ticket": "7KQ2MX" }`,
        },
        marks: ["kind", "typed", "expected", "app", "id", "ticket"],
      },
    },
    {
      id: "updates",
      kind: "case",
      nodes: {
        ci: { kind: "worker", at: [3, 10] },
        rel: { kind: "storage", at: [6, 10] },
      },
      edges: {
        manifest: { from: "app", to: "site", rate: 1, mode: "call" },
        upd: { from: "app", to: "rel", rate: 1, mode: "call" },
        fb: { rate: 0 },
      },
      focus: ["app", "site", "rel"],
      exchange: {
        edge: "manifest",
        request: { format: "http", head: "GET https://bitg.uz/update/stable.json" },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK   (Cache-Control: no-cache)",
          body: `{
  "version": "0.5.0",
  "date": "2026-11-17",
  "notes": ["Arch Linux ombori...", "Yolg'iz xorijiy ism..."],
  "windows": {
    "url": "https://github.com/dtwinuz/bitg/releases/download/v0.5.0/bitg-0.5.0-x64.msi",
    "sha256": "519d6bc2e282f16a2656bfe89a30f9aa252044ea9499711536eea113bdc8c137",
    "size": 6406144
  }
}`,
        },
        marks: ["version", "notes", "url", "sha256", "size"],
      },
    },
    {
      id: "ci",
      kind: "case",
      edges: { build: { from: "ci", to: "rel", rate: 2, mode: "async" }, upd: { rate: 0 }, manifest: { rate: 0 } },
      focus: ["ci"],
      exchange: {
        edge: "build",
        request: {
          format: "text",
          head: "checks around every pull request to main",
          body: "ci        fmt, clippy -D warnings, cargo test on ubuntu + windows; coverage gate: branches >= 90 %, lines >= 95 %\nlinux     a real ibus-daemon types into a test window; lintian; install and remove the .deb\nmacos     universal .pkg, install, register the input source (macos-15 and macos-15-intel)\ne2e       on tags and by hand: MSI on a Windows runner, keys sent into WPF, Win32 EDIT, Qt (PySide6), 32-bit\nfuzz      cargo-fuzz on convert and session, weekly and on core changes\nsecurity  CodeQL, cargo-deny (advisories, licences, sources), OpenSSF Scorecard, DCO sign-off\nmerge     squash only, 1 approval from someone other than the last pusher",
        },
        marks: ["coverage gate", "ibus-daemon", "macos-15", "Qt (PySide6)", "cargo-fuzz", "cargo-deny", "squash only"],
      },
    },
    {
      id: "release",
      kind: "case",
      edges: { build: { flow: "request", rate: 3 } },
      focus: ["ci", "rel"],
      exchange: {
        edge: "build",
        request: {
          format: "text",
          head: "git tag -a v0.5.0  ->  release.yml",
          body: "build.yml (reusable)  deb (IBus, Fcitx5), Arch .pkg.tar.zst, macOS .pkg, MSI\nattest                its own job, compiles nothing: SLSA provenance + SPDX SBOM\nverify                gh attestation verify --signer-workflow build.yml --source-ref refs/tags/v0.5.0\nadvisories            cargo deny again, with the advisory database of release day\npublish               exactly 15 files or no release\nthen                  crates.io (trusted publishing), Telegram announcement, package stores\nreproducible          two clean builds of .deb, MSI and .pkg give the same bytes",
        },
        marks: ["build.yml", "attest", "--signer-workflow", "advisories", "15 files", "trusted publishing", "reproducible"],
      },
    },
    {
      id: "channels",
      kind: "case",
      nodes: { stores: { kind: "external", at: [9, 10] } },
      edges: {
        pub: { from: "rel", to: "stores", rate: 2, mode: "async" },
        inst: { from: "stores", to: "ime", rate: 2, mode: "call" },
        build: { rate: 1 },
      },
      focus: ["rel", "stores", "ime"],
      exchange: {
        edge: "pub",
        request: {
          format: "text",
          head: "dtwinuz/homebrew-tap  autobump.yml   (every 3 hours)",
          body: "cask 0.4.0, latest release 0.5.0  ->  bump\ngh release download v0.5.0 ... bitg-0.5.0-macos.pkg\nsha256 matches bitg-0.5.0-macos.pkg.sha256\ngh attestation verify ... --signer-workflow dtwinuz/bitg/.github/workflows/build.yml\nbrew style, brew audit --cask --strict --online\nbrew install --cask dtwinuz/tap/bitg, then uninstall\ncommit \"bitg 0.5.0\" to main",
        },
        marks: ["every 3 hours", "sha256", "gh attestation verify", "brew audit", "brew install --cask", "commit"],
      },
    },
    {
      id: "deploy",
      kind: "case",
      edges: { deploy: { from: "rel", to: "site", rate: 2, mode: "async" }, inst: { rate: 1 } },
      focus: ["rel", "site"],
      exchange: {
        edge: "deploy",
        request: {
          format: "text",
          head: "deploy/deploy.sh   (run by a maintainer, only from origin/main)",
          body: "HEAD == origin/main, no uncommitted changes in web/, deploy/, tools/\nwasm: bitg-core built from a clean worktree of that commit\ngh release download v0.5.0: MSI, 2 .deb, .pkg, 2 Arch packages\nsha256 + gh attestation verify for each, or stop\napt and pacman indexes signed with a key that lives only on the maintainer's machine\nremote.sh: caddy validate, www/releases/<sha12>-<time>, atomic symlink swap, caddy reload\nhttps://bitg.uz/version.txt returns the commit, then IndexNow",
        },
        marks: ["origin/main", "clean worktree", "gh release download", "attestation verify", "signed", "atomic symlink swap", "version.txt"],
      },
    },
    {
      id: "monitor",
      kind: "case",
      edges: { alert: { from: "bot", to: "tg", rate: 1, mode: "async" }, deploy: { rate: 0 } },
      focus: ["site", "bot", "tg"],
      exchange: {
        edge: "alert",
        request: { format: "http", head: "GET https://bitg.uz/stats.json" },
        response: {
          format: "json",
          head: "HTTP/1.1 200 OK   (Cache-Control: public, max-age=600)",
          body: `{ "downloads": 330, "updated": "2026-11-19T08:38+05:00" }`,
        },
        marks: ["downloads", "updated"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "eval-leak",
      from: "core",
      steps: [
        {
          id: "leak",
          kind: "problem",
          metrics: { uz: 99.17, noapos: 69.07 },
          focus: ["core"],
          exchange: {
            edge: "edit",
            request: {
              format: "text",
              head: "first lexicon: word counts from a ready-made frequency list",
              body: "source     uzb_community_2017-words.txt   (counts over the whole corpus)\neval set   sentences taken from the same corpus\nuz         99.17 %\nuz, no apostrophes   69.07 %\nthe test sentences were counted while building the lexicon",
            },
            marks: ["words.txt", "eval set", "99.17", "69.07", "counted"],
          },
        },
        {
          id: "honest",
          kind: "fix",
          metrics: { uz: 98.87, noapos: 68.5 },
          focus: ["core"],
          exchange: {
            edge: "edit",
            request: {
              format: "text",
              head: "python -I tools/build_lexicon.py ... --exclude-eval eval/uz.tsv eval/uz_noapos.tsv",
              body: "lexicon rebuilt from sentences, eval sentences dropped first\nuz                   98.87 %\nuz, no apostrophes   68.50 %\nen                   99.73 %   (unchanged)\nthe eval set is published in eval/ (CC BY 4.0)",
            },
            marks: ["--exclude-eval", "98.87", "68.50", "99.73", "CC BY 4.0"],
          },
        },
        {
          id: "grow",
          kind: "fix",
          metrics: { noapos: 81.2 },
          focus: ["core"],
          exchange: {
            edge: "edit",
            request: {
              format: "text",
              head: "bitg eval eval/uz_noapos.tsv   (3 000 sentences typed without apostrophes)",
              body: "0.2.0    wider sources (Leipzig, Common Voice, Tatoeba), 71 933 words   81.30 %\n         a bare form never seen in Cyrillic gets weight 0: boladi -> bo'ladi\nnow      two real readings (och|maydi, o't|dim) are not guessed      81.20 %  (2436/3000)\n         3 sentences fixed, 10 words left as typed and marked",
            },
            marks: ["0.2.0", "weight 0", "81.30", "not guessed", "81.20", "marked"],
          },
        },
      ],
    },
    {
      id: "aur-closed",
      from: "channels",
      steps: [
        {
          id: "closed",
          kind: "problem",
          edges: { pub: { flow: "fail" } },
          metrics: { channels: 4 },
          focus: ["rel", "stores"],
          exchange: {
            edge: "pub",
            request: {
              format: "text",
              head: "stores.yml, aur job, release 0.4.0",
              body: "aur.archlinux.org/register   HTTP 503: new accounts cannot be created\nPKGBUILD                     ready: two packages, bitg and fcitx5-bitg, tested in a clean Arch container\naur job                      fails on every push\nArch users                   clone the repo and run makepkg themselves",
            },
            marks: ["HTTP 503", "fcitx5-bitg", "fails on every push", "makepkg"],
          },
        },
        {
          id: "pacman",
          kind: "fix",
          edges: { pub: { flow: "request" } },
          metrics: { channels: 5 },
          focus: ["rel", "stores", "ime"],
          exchange: {
            edge: "pub",
            request: {
              format: "text",
              head: "#94: Arch packages in the release and a signed pacman repo at bitg.uz/arch",
              body: "build.yml arch   git archive -> makepkg with check() -> namcap -> pacman -U test\nattest           provenance + SBOM, like every other release file\ndeploy.sh        sha256 + gh attestation verify, then pacman_repo.py builds bitg.db\nsigned           package and database .sig with the apt key; SigLevel = Required DatabaseRequired\nfirst release    0.4.1; users add [bitg] once, then pacman -Syu",
            },
            marks: ["namcap", "attest", "pacman_repo.py", "SigLevel = Required DatabaseRequired", "pacman -Syu"],
          },
        },
      ],
    },
    {
      id: "stale-msi",
      from: "deploy",
      steps: [
        {
          id: "stale",
          kind: "problem",
          edges: { deploy: { flow: "fail" } },
          metrics: { verified: 0 },
          focus: ["site", "rel"],
          exchange: {
            edge: "deploy",
            request: {
              format: "text",
              head: "12 Nov 2026, the day of v0.1.0",
              body: "bitg.uz/download   bitg-x64.msi   5.1 MB   built locally at 05:27\nGitHub Release     bitg-0.1.0-x64.msi   6.0 MB   sha256 75354713...\nthe site served an installer older than the release until 15:40\nnothing compared the two files",
            },
            marks: ["built locally", "6.0 MB", "older than the release", "nothing compared"],
          },
        },
        {
          id: "attested",
          kind: "fix",
          edges: { deploy: { flow: "request" } },
          metrics: { verified: 6 },
          focus: ["site", "rel"],
          exchange: {
            edge: "deploy",
            request: {
              format: "text",
              head: "deploy.sh now",
              body: "files come only from GitHub Release v$VER, never from a local build\nsha256sum vs .sha256 (the .sha256 file has CRLF: tr -d '\\r' first)\ngh attestation verify --signer-workflow build.yml --source-ref refs/tags/v$VER --deny-self-hosted-runners\none file fails -> deploy stops, the live site is not touched",
            },
            marks: ["only from GitHub Release", "CRLF", "--deny-self-hosted-runners", "deploy stops"],
          },
        },
      ],
    },
  ],
});
