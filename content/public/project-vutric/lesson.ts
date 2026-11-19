import { defineLesson } from "@mufassall/scene-schema";

/**
 * Vutric (wonmortech/vutric, public, Apache-2.0): flick a photo off the phone, watch it land on the
 * desktop. Rust core shared with the Flutter phone app, iroh QUIC on the local network, a wgpu overlay
 * drawn through DirectComposition on Windows. Every number comes from the repo: ADR-0004/0005/0006/
 * 0008/0010/0050/0051, docs/protocol.md, docs/reports/phase-0.1 and phase-0.2, .github/workflows,
 * deploy/receive.sh, docs/workstreams.md. Status: Phase 0 (spikes); device runs on real Wi-Fi are open.
 */
export default defineLesson({
  slug: "project-vutric",
  level: "advanced",
  minutes: 18,
  tier: "public",
  metrics: [
    { id: "fps", unit: "fps", better: "up" },
    { id: "missed", unit: "/run", better: "down" },
    { id: "unknown", unit: "%", better: "down" },
    { id: "stall", unit: "s", better: "down" },
    { id: "bugs", unit: "", better: "down" },
    { id: "flaky", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "what",
      kind: "case",
      nodes: {
        phone: { kind: "client", at: [0, 5] },
        desk: { kind: "service", at: [6, 5] },
      },
      edges: {
        fling: { from: "phone", to: "desk", rate: 2, mode: "call" },
      },
      focus: ["phone", "desk"],
      exchange: {
        edge: "fling",
        request: {
          format: "text",
          head: "FlingStart  (control stream, vutric/1)",
          body: "id          7\nfile_name   IMG_2041.jpg\nmime        image/jpeg\nsize        4 183 552\nblake3      9f2c...e1\ngesture     { velocity, angle }\neffect      Halqa\npreview     JPEG, at most 96 KiB",
        },
        response: {
          format: "text",
          head: "EffectStarted",
          body: "id               7\nreceiver_micros  first frame presented, on the receiver's own clock",
        },
        marks: ["FlingStart", "gesture", "preview", "blake3", "EffectStarted", "receiver_micros"],
      },
    },
    {
      id: "send",
      kind: "case",
      focus: ["phone"],
      exchange: {
        edge: "fling",
        request: {
          format: "text",
          head: "Offer  (three photos picked on the Galereya tab)",
          body: "id           8\nfirst        0\nentries      IMG_2041.jpg, IMG_2042.jpg, VID_0007.mp4   (tap order)\ntotal_files  3\ntotal_bytes  48 900 112",
        },
        response: {
          format: "text",
          head: "OfferReply",
          body: "id      8\naccept  true\nhave    [0, 0, 12 582 912]   -- the video was cut off last time: resume from 12 MB",
        },
        marks: ["Offer", "entries", "tap order", "OfferReply", "have"],
      },
    },
    {
      id: "land",
      kind: "case",
      nodes: { overlay: { kind: "worker", at: [10, 2] } },
      edges: { play: { from: "desk", to: "overlay", rate: 2 } },
      metrics: { fps: 56, missed: 14 },
      focus: ["desk", "overlay"],
      exchange: {
        edge: "play",
        request: {
          format: "text",
          head: "overlay window, created once and kept shown (transparent)",
          body: "WS_EX_LAYERED | WS_EX_TRANSPARENT     every click falls through\nWS_EX_NOACTIVATE | WS_EX_TOOLWINDOW   never takes focus, no taskbar button\nWS_EX_TOPMOST                         above every window\nCompositeAlphaMode::PreMultiplied     the desktop shows through the glow\n-- first try, frame latency 1: 55-58 fps, 5-14 missed vblanks per run",
        },
        marks: ["WS_EX_TRANSPARENT", "WS_EX_NOACTIVATE", "PreMultiplied", "missed vblanks"],
      },
    },
    {
      id: "pair",
      kind: "case",
      nodes: { find: { kind: "lb", at: [3, 10] } },
      edges: {
        look: { from: "phone", to: "find", rate: 1, mode: "async" },
        announce: { from: "desk", to: "find", rate: 1, mode: "async" },
      },
      metrics: { unknown: 100 },
      focus: ["phone", "find", "desk"],
      exchange: {
        edge: "look",
        request: {
          format: "text",
          head: "QR on the desktop screen (pairing ticket)",
          body: "vutric://pair?v=2&id=<64 hex endpoint id>&n=Studio%20PC\n  &a=[LAN ip:port, up to 8]&s=<one-time secret, 32 hex>",
        },
        response: {
          format: "text",
          head: "the phone scanned it",
          body: "v   protocol version: anything else is rejected, never guessed\nid  the Ed25519 key that QUIC will check on connect\na   LAN hints for networks that drop multicast\ns   proves the dialer really read this QR (PairProof)",
        },
        marks: ["v", "id", "a", "s", "PairProof"],
      },
    },
    {
      id: "crates",
      kind: "case",
      focus: ["phone", "desk", "overlay"],
      exchange: {
        edge: "fling",
        request: {
          format: "text",
          head: "Cargo workspace, Rust 1.96, edition 2024",
          body: "vutric-core      messages, framing, tickets, safe file names: pure, no I/O\nvutric-net       iroh endpoint, sessions, transfers, trust gate\nvutric-mobile    the same core for Flutter through flutter_rust_bridge\nvutric-overlay   effect timeline as a pure function of time + one WGSL pass\nvutric-host-win  the transparent click-through window (DirectComposition)\nframing          u32 little-endian length + postcard; over 128 KiB = error before allocating",
        },
        marks: ["vutric-core", "vutric-mobile", "vutric-overlay", "vutric-host-win", "128 KiB"],
      },
    },
    {
      id: "overlay-fix",
      kind: "fix",
      metrics: { fps: 60, missed: 0 },
      focus: ["overlay"],
      exchange: {
        edge: "play",
        request: {
          format: "text",
          head: "A/B on Intel UHD 730, 2560x1440 @ 60 Hz",
          body: "latency 1, one union scissor   56.9-58.7 fps   p99 31-32 ms   5-10 missed\nlatency 1, split scissor       55.2-58.6 fps   p99 31-32 ms   5-14 missed\nlatency 2, split scissor       60.3 fps        p99 19-20 ms   0 missed\nfocus taken in 15 runs: 0      first frame from a warm window: 0.56-10.67 ms",
        },
        marks: ["union scissor", "split scissor", "latency 2", "focus taken"],
      },
    },
    {
      id: "net",
      kind: "case",
      nodes: { relay: { kind: "external", at: [3, 0] } },
      edges: {
        hop1: { from: "phone", to: "relay", rate: 1, mode: "async" },
        hop2: { from: "relay", to: "desk", rate: 1, mode: "async" },
      },
      focus: ["phone", "find", "relay", "desk"],
      exchange: {
        edge: "announce",
        request: {
          format: "text",
          head: "LAN beacon, UDP, exactly 41 bytes, to a local-network multicast group",
          body: "0-3    VTRC\n4      version 1\n5      kind: 0 announce, 1 query\n6-37   endpoint id\n38-39  QUIC port, little-endian, never 0\n40     flags: bit 0 = phone\n-- any other datagram is dropped unread; the key is still checked by QUIC",
        },
        marks: ["41 bytes", "VTRC", "endpoint id", "dropped unread"],
      },
    },
    {
      id: "trust",
      kind: "fix",
      nodes: { store: { kind: "db", at: [9, 9] } },
      edges: { gate: { from: "desk", to: "store", rate: 1, mode: "call" } },
      metrics: { unknown: 0 },
      focus: ["desk", "store"],
      exchange: {
        edge: "gate",
        request: {
          format: "text",
          head: "pairing from the nearby list (no QR): commit, then reveal",
          body: "dialer   -> PairCommit  { H(x, a) }    x = TLS exporter of this very connection\nlistener -> PairNonce   { b }          only after the commit arrived\ndialer   -> PairReveal  { a }          must open the commitment\nboth     show code(x, a, b): six digits, users press Yes on both screens\nboth     -> PairResult  { confirmed }",
        },
        response: {
          format: "text",
          head: "later connections, before the control stream is read",
          body: "trusted_only (default)  trusted key: in   unknown key: closed with code 403\neveryone(until)         at most 10 minutes, every offer asked about",
        },
        marks: ["PairCommit", "PairNonce", "PairReveal", "six digits", "403", "10 minutes"],
      },
    },
    {
      id: "interop",
      kind: "case",
      focus: ["desk", "phone"],
      exchange: {
        edge: "fling",
        request: {
          format: "text",
          head: "ADR-0010: talk to the apps people already have",
          body: "vutric-compat-localsend    LocalSend v2.1, HTTPS + multicast\nvutric-compat-quickshare   Quick Share LAN mode (UKEY2 + protobuf)\nvutric-compat-kdeconnect   KDE Connect v8, share plugin only\nvutric-compat-wormhole     magic-wormhole, tested in CI against the Python 0.24.0 tool\n-- same pipeline after the parser: offer -> accept -> storage rules -> Halqa",
        },
        marks: ["LocalSend", "Quick Share", "KDE Connect", "magic-wormhole", "same pipeline"],
      },
    },
    {
      id: "ci",
      kind: "case",
      nodes: { ci: { kind: "worker", at: [12, 6] } },
      edges: { build: { from: "ci", to: "desk", rate: 1 } },
      focus: ["ci"],
      exchange: {
        edge: "build",
        request: {
          format: "text",
          head: ".github/workflows/ci.yml  (matrix: windows-latest, ubuntu-latest)",
          body: "env RUSTFLAGS=-D warnings\nnode tools/check-site.mjs                      Linux only\ncargo fmt --all --check                        Linux only\ncargo clippy --workspace --all-targets --locked -- -D warnings   pedantic lints on\ncargo test --workspace --locked\nactions/cache@v4, keyed by rust-toolchain.toml + Cargo.lock",
        },
        marks: ["RUSTFLAGS", "check-site", "clippy", "--locked", "actions/cache"],
      },
    },
    {
      id: "fuzz",
      kind: "fix",
      focus: ["ci", "desk"],
      exchange: {
        edge: "build",
        request: {
          format: "text",
          head: ".github/workflows/fuzz.yml",
          body: "smoke      stable, every push and PR: 20 000 random inputs per target + bit-flipped valid frames\nlibfuzzer  nightly + AddressSanitizer: 60 s per target on protocol PRs, 600 s every night\ntargets    17: frame_stream, message, pairing_ticket, save_target, filename, beacon, ...\ncrash      the input is uploaded as an artifact and kept in fuzz/regressions/",
        },
        marks: ["smoke", "libfuzzer", "targets", "fuzz/regressions/"],
      },
    },
    {
      id: "mobile",
      kind: "case",
      focus: ["ci", "phone"],
      exchange: {
        edge: "build",
        request: {
          format: "text",
          head: ".github/workflows/ios-spike.yml  (macos-15-intel)",
          body: "Flutter from its git repo: the org allows only GitHub-owned or verified actions\nthird_party/netdev, netwatch: vendored fixes, libc >= 0.2.190 broke iOS builds\nRunner links -framework Network, DEAD_CODE_STRIPPING=NO\nnm checks that frb_get_rust_content_hash is in the binary\nartifact vutric-spike-ios: an unsigned IPA for sideloading",
        },
        marks: ["verified actions", "third_party/netdev", "DEAD_CODE_STRIPPING=NO", "frb_get_rust_content_hash"],
      },
    },
    {
      id: "site",
      kind: "fix",
      nodes: { web: { kind: "cdn", at: [12, 11] } },
      edges: { ship: { from: "ci", to: "web", rate: 1, mode: "call" } },
      focus: ["ci", "web"],
      exchange: {
        edge: "ship",
        request: {
          format: "text",
          head: ".github/workflows/deploy.yml  (push to main touching site/)",
          body: "node tools/check-site.mjs          no inline code, no foreign origins, no IPv4, no Cyrillic\nsite/version.txt = $GITHUB_SHA\ntar site + Caddyfile | ssh -o StrictHostKeyChecking=yes root@$DEPLOY_HOST \"deploy $GITHUB_SHA\"\ncurl https://vutric.wonmor.io/version.txt until it equals the SHA\nsmoke: 7 paths 200, unknown path 404, CSP header present\non failure: ssh ... rollback",
        },
        response: {
          format: "text",
          head: "server side: bin/receive, the only command the CI key may run",
          body: "unpack to releases/<sha>, check version.txt, refuse links and special files\nln -sfn + mv -T: releases/current switches atomically, no request dropped\nkeep 5 releases + the previous one",
        },
        marks: ["check-site", "version.txt", "StrictHostKeyChecking=yes", "rollback", "bin/receive", "mv -T"],
      },
    },
    {
      id: "process",
      kind: "case",
      focus: ["phone", "desk", "ci"],
      exchange: {
        edge: "build",
        request: {
          format: "text",
          head: "docs/workstreams.md",
          body: "W1 phone     apps/mobile-spike, crates/vutric-mobile, design/      ADR 0011-0029\nW2 desktop   vutric-overlay, vutric-host-*, vutric-daemon           ADR 0030-0049\nW3 network   vutric-core, vutric-net, vutric-compat-*, fuzz/        ADR 0050-0069\nrule         no performance claim without a measurement in an ADR or report\nphase end    written report + the owner's go / no-go",
        },
        marks: ["W1", "W2", "W3", "no performance claim", "go / no-go"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "stalled-client",
      from: "net",
      steps: [
        {
          id: "stall-bug",
          kind: "problem",
          edges: { fling: { flow: "fail" } },
          metrics: { stall: 7.8 },
          focus: ["phone", "desk"],
          exchange: {
            edge: "fling",
            request: {
              format: "text",
              head: "listener: accept -> handshake -> next, one at a time",
              body: "t=0.0 s  client A opens QUIC, then sends nothing\nt=0.1 s  the real phone connects and waits behind A\nt=7.9 s  the phone's Hello is finally read\n-- no timeout anywhere: a silent peer could hang a throw or the listener forever",
            },
            marks: ["one at a time", "sends nothing", "t=7.9 s", "no timeout"],
          },
        },
        {
          id: "stall-fix",
          kind: "fix",
          edges: { fling: { flow: "request" } },
          metrics: { stall: 0.4 },
          focus: ["desk"],
          exchange: {
            edge: "fling",
            request: {
              format: "text",
              head: "handshakes side by side, every wait bounded",
              body: "each incoming connection gets its own task\nhandshake timeout 8 s: a bad client is skipped, the listener keeps going\nanswer to a fling: 5 s\ncrates/vutric-net/tests/stalled_client.rs: the real client now waits under 0.4 s",
            },
            marks: ["own task", "8 s", "5 s", "stalled_client.rs"],
          },
        },
      ],
    },
    {
      id: "fuzz-finds",
      from: "fuzz",
      steps: [
        {
          id: "fuzz-spaces",
          kind: "problem",
          metrics: { bugs: 2 },
          focus: ["ci", "desk"],
          exchange: {
            edge: "build",
            request: {
              format: "text",
              head: "stable smoke run, first day: vutric_core::filename::sanitize",
              body: "in   a.b<20 spaces>c\nout  a.b<15 spaces>        Windows drops trailing spaces: the saved name is not the checked one\nin   com1 .tar.gz\nout  com1 .tar.gz          Win32 ignores spaces before the dot: this is the COM1 device",
            },
            marks: ["trailing spaces", "COM1"],
          },
        },
        {
          id: "fuzz-long",
          kind: "problem",
          metrics: { bugs: 3 },
          focus: ["ci"],
          exchange: {
            edge: "build",
            request: {
              format: "text",
              head: "first libFuzzer run in CI, 26 s",
              body: "a reserved device name whose stem was already cut to 120 characters\ngot its '_' prefix on top: 121 characters, one over the limit",
            },
            marks: ["120 characters", "121 characters"],
          },
        },
        {
          id: "fuzz-fixed",
          kind: "fix",
          metrics: { bugs: 0 },
          focus: ["ci", "desk"],
          exchange: {
            edge: "build",
            request: {
              format: "text",
              head: "fixes, each with a regression test",
              body: "extension cut never leaves trailing spaces\nreserved list + COM0, LPT0, COM1-3 superscripts, CONIN$, CONOUT$\nthe prefix replaces the last character instead of adding one\nthe crashing input lives in fuzz/regressions/ and the smoke run replays it",
            },
            marks: ["trailing spaces", "CONIN$", "replaces the last character", "fuzz/regressions/"],
          },
        },
      ],
    },
    {
      id: "flaky-smoke",
      from: "ci",
      steps: [
        {
          id: "flaky-bug",
          kind: "problem",
          metrics: { flaky: 1 },
          focus: ["ci", "desk"],
          exchange: {
            edge: "build",
            request: {
              format: "text",
              head: "packaging/macos/smoke.sh on main, after the same build passed in the PR",
              body: "pluginkit -a VutricQuickAction.appex\nsleep 2\npluginkit -m -v -i io.wonmor.vutric.quickaction   (empty)\nquick action registered: NO\n-- registration is asynchronous; 2 seconds was a guess",
            },
            marks: ["sleep 2", "registered: NO", "asynchronous"],
          },
        },
        {
          id: "flaky-fix",
          kind: "fix",
          metrics: { flaky: 0 },
          focus: ["ci"],
          exchange: {
            edge: "build",
            request: {
              format: "text",
              head: "smoke.sh: poll instead of sleeping",
              body: "for i in 1..20: re-add the extension every 5 s, check once a second\nlisted  -> \"quick action registered: yes (after ~N s)\"\nnever   -> \"registered: NO (not listed after 20 s)\", fail\nsame for the share extension",
            },
            marks: ["re-add", "after ~N s", "not listed after 20 s"],
          },
        },
      ],
    },
  ],
});
