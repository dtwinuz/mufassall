import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Project: Vutric, a photo thrown from the phone to the desktop",
  summary:
    "Vutric is an open-source app from wonmortech: you flick a photo off the edge of the phone screen and it flies out of a glowing ring at the edge of the desktop, following the speed and angle of your throw. No account, no cloud, end-to-end encrypted, and it works on a shared network with no internet. The whole project as it stands in Phase 0: what the user sees, the Rust core shared with the Flutter phone app, iroh QUIC, a wgpu overlay that never takes focus, pairing that cannot be ground, the pipelines (CI, fuzzing, mobile builds, the design-system site deploy with rollback) and the rules the work runs by.",
  learn: [
    "The user side: gallery-first sending, the throw, the Halqa ring on the desktop, pairing by QR or by six digits",
    "The architecture: a pure Rust core shared byte-for-byte with the phone, thin platform hosts, a preview-first protocol over QUIC",
    "Why each tool: iroh for keys and NAT traversal, wgpu + DirectComposition for a transparent click-through overlay, Flutter + flutter_rust_bridge for the phone",
    "The pipelines: CI on Windows and Linux, fuzzing every parser, iOS and Android builds, an atomic site deploy that rolls itself back",
  ],
  nodes: {
    phone: "Phone app",
    desk: "Desktop daemon",
    overlay: "wgpu overlay",
    find: "LAN discovery",
    relay: "iroh relay",
    store: "Trust store",
    ci: "GitHub Actions",
    web: "vutric.wonmor.io",
  },
  metrics: {
    fps: "Overlay frame rate",
    missed: "Missed vblanks per run",
    unknown: "Unknown devices let in",
    stall: "Wait behind a silent client",
    bugs: "Open file-name bugs",
    flaky: "Main runs failing on a timing guess",
  },
  steps: {
    what: {
      short: "What it is",
      title: "Throw a photo, watch it land",
      body: "Vutric (a coined name, repo `wonmortech/vutric`, Apache-2.0) sends photos and files between a phone and a computer with a gesture. You throw the item off the edge of the phone screen; a portal opens at the edge of the desktop and the item flies out of it, GPU-rendered, at the speed and angle of your throw. Local network first, end-to-end encrypted, no account.\n\nThe trick behind \"instant\" is **preview first**: `FlingStart` carries a small JPEG preview and the gesture, so the receiver starts the effect at once while the full file streams next to it and is checked with BLAKE3. The receiver answers `EffectStarted` only after the frame that shows the photo was presented. The target from the brief: under 100 ms from finger release to the first frame.\n\nStatus, honestly: Phase 0, technical spikes. The Windows overlay passed its exit criteria; network exit criteria on a real Wi-Fi with two devices are still open.",
      fields: {
        FlingStart: "One message per thrown item: the receiver needs nothing else to start the animation.",
        gesture: "Speed and angle of the throw, so the photo leaves the portal the way it left the thumb.",
        preview: "A small JPEG made on the sender; the effect starts from it, not from the 4 MB original.",
        blake3: "Hash of the whole file: the streamed bytes are checked against it before the file is kept.",
        EffectStarted: "The receiver's answer after the photo was really drawn, so the round trip is an honest upper bound.",
        receiver_micros: "The receiver's monotonic clock: latency is measured without synchronised clocks.",
      },
    },
    send: {
      short: "Sending",
      title: "The phone opens on its own gallery",
      body: "The owner asked that the first screen be the phone's gallery and files inside Vutric, not a system picker (ADR-0008). Two tabs, **Galereya** and **Fayllar**. Thumbnails come from the OS cache at 200 px, the grid builds only visible cells and loads 120 items per page, so thousands of photos open fast.\n\nYou tap as many items as you like; each cell shows its number and files go in that **tap order**. One button: if there is no session yet it says \"Ulanib yuborish · N ta\" (connect and send) and opens one connect sheet: scan the computer's QR, find it on the same Wi-Fi, or show my QR. Many files are one `Offer`; the receiver answers once.\n\nThe interface is in Uzbek Latin with i18n keys. Everything here is built and tested in Flutter, but the backlog marks it done only after a run on a real phone.",
      fields: {
        Offer: "Files on offer, at most 256 entries per message; a bigger transfer is several offers with the same id.",
        entries: "Name, type and size of each file; the receiver decides before a single byte flows.",
        "tap order": "The order the user chose is the order the receiver sees.",
        OfferReply: "One yes or no for the whole transfer.",
        have: "Bytes already held from an interrupted transfer: the sender resumes there and still proves the whole file by hash.",
      },
    },
    land: {
      short: "Landing",
      title: "On the desktop: a ring that never steals your keyboard",
      body: "On the computer the photo comes out of the **Halqa** (\"ring\") effect at the Send Zone edge, then a card offers to open it. The hard requirement: you keep typing in your editor while it plays. The overlay must draw partly transparent, anti-aliased pixels over every window, let every click fall through and never take focus.\n\nOn Windows a swapchain made from a window handle only offers opaque alpha (wgpu issue 5661), which would black out the screen. So the window is created once with these extended styles and composed through DirectComposition, and stays shown, transparent, between effects: no show and hide, so no flicker. If the adapter cannot do transparency, the overlay refuses to start rather than cover the desktop.\n\nAn Android phone that receives shows Halqa inside the app, or a heads-up notification; Vutric never asks for the \"draw over other apps\" permission. The first measurement on the target machine was not good enough: below 60 fps with missed vblanks.",
      watch: "Watch the overlay node: the effect works, but the numbers miss the 60 fps bar.",
      fields: {
        WS_EX_TRANSPARENT: "Input passes through to whatever window is below.",
        WS_EX_NOACTIVATE: "Showing or drawing never makes it the active window, so your cursor stays where it was.",
        PreMultiplied: "Per-pixel transparency through DirectComposition; the shader outputs premultiplied linear colour.",
        "missed vblanks": "A frame not ready at the screen refresh: the motion stutters.",
      },
    },
    pair: {
      short: "Pairing",
      title: "Pairing: a QR that pins the key",
      body: "Before devices exchange anything they pair. The device with a screen shows a QR with a pairing ticket; the one with a camera scans it. The ticket carries the device's **Ed25519 endpoint key**, so QUIC will refuse an impostor on connect. It also carries up to 8 LAN address hints, for networks that drop multicast, and, while the pairing window is open, a one-time secret.\n\nNo camera on either side (desktop to desktop)? You pick the device from the nearby list and both screens show six digits to compare. A typed LAN address or a short `ABCD-EFGH` code works too, and always ends with the same six-digit check.\n\nThe weak spot of spike 0.2: a listener accepted any device that reached it, and the six digits were shown but nobody had to confirm them. That is the 100 % on the metric.",
      check: {
        q: "The QR already pins the peer's key. Why does nearby pairing still need users to compare six digits?",
        options: [
          "It doesn't; the digits are only for looks",
          "Without a QR no key is pinned: a man in the middle who answers mDNS could sit between the two devices",
          "Because mDNS is slower than QR",
        ],
        answer: 1,
        why: "A scanned QR tells the dialer exactly which key to expect. A device found on the network could be anyone who answered first. The digits are derived from the TLS secret of this very connection, so a man in the middle would make the two screens show different numbers.",
      },
      fields: {
        v: "Protocol version: another version is rejected, not guessed.",
        id: "64 hex characters of the endpoint key, checked by QUIC on every connection.",
        a: "IP:port hints, best first; virtual adapters last.",
        s: "16 random bytes, present only while the pairing window is open; a repeated value makes the link invalid.",
        PairProof: "The dialer proves it read the current QR, so the listener can store it as paired by ticket.",
      },
    },
    crates: {
      short: "Architecture",
      title: "A pure core, thin hosts",
      body: "The repo is one Cargo workspace (Rust 1.96 pinned in `rust-toolchain.toml`, edition 2024). The shape is deliberate:\n\n- **Pure core.** Protocol, framing, pairing and file-name safety have no I/O, so they are tested exhaustively and shared byte-for-byte with the phone through `flutter_rust_bridge`. The phone and the desktop cannot drift apart.\n- **Pure timeline.** An effect is a function of time; the renderer is one scissored SDF pass in WGSL. A new effect is a timeline plus a shader, testable without a GPU and portable to every host.\n- **Thin hosts.** Everything platform-specific is how a transparent, input-transparent, non-activating surface reaches the screen: DirectComposition on Windows, layer-shell on KDE and wlroots, a Shell extension on GNOME, `NSPanel` on macOS.\n\nMessages are postcard-encoded behind a 4-byte length; a body over 128 KiB is refused from the header, before anything is allocated.",
      fields: {
        "vutric-core": "No sockets, no files: only bytes in, values out. That is what makes fuzzing and sharing easy.",
        "vutric-mobile": "The phone's bridge: Dart calls the same Rust code the desktop runs.",
        "vutric-overlay": "Timeline + renderer; knows nothing about windows.",
        "vutric-host-win": "The only Windows-specific crate on the drawing path.",
        "128 KiB": "A hostile length prefix cannot make the receiver allocate gigabytes.",
      },
    },
    "overlay-fix": {
      short: "60 fps",
      title: "Two settings that bought 60 fps",
      body: "The spike measured three variants on an integrated Intel UHD 730 at 2560x1440 (ADR-0004). With a frame latency of 1 the GPU had no slack and missed 5 to 14 vblanks per run. Two changes fixed it: `desired_maximum_frame_latency = 2` and **split scissors**, where each frame clears the surface and shades only the regions the timeline returns (portal, card and trail), never the whole screen.\n\nThe cost is one extra frame of queueing, about 16.7 ms, accepted for smooth pacing; first-frame latency from a warm window stays far inside the 100 ms budget. Focus was sampled every frame with `GetForegroundWindow`: never taken in 15 runs.\n\nTwo lessons from measuring: a process in session 0 (a service, an SSH shell) cannot create a visible surface, so the spike must run from the desktop session; and screen-recording during a measurement dropped the same build to about 41 fps.",
      check: {
        q: "Latency 2 adds about 16.7 ms of queueing. Why accept it when the goal is \"instant\"?",
        options: [
          "Because the 100 ms budget leaves room, and stutter is more visible than one frame",
          "Because latency 1 is not supported by wgpu",
          "Because the network is slower anyway, so nothing matters",
        ],
        answer: 0,
        why: "The release-to-pixel budget is 100 ms and the warm first frame took at most 10.7 ms, so one extra frame fits. Dropped frames during the flight are what the eye notices. Not yet verified: NVIDIA and AMD GPUs, Windows 11, mixed-DPI monitors.",
      },
      fields: {
        "union scissor": "One rectangle around everything: more pixels shaded every frame.",
        "split scissor": "Only the portal and the card are shaded.",
        "latency 2": "The swapchain may queue two frames, so a slow frame does not miss the refresh.",
        "focus taken": "Measured, not assumed: the foreground window was checked on every frame.",
      },
    },
    net: {
      short: "Network",
      title: "iroh QUIC: same Wi-Fi first, the internet when needed",
      body: "Every device is a peer (ADR-0005): the same Rust core runs everywhere, holds an iroh endpoint with a persistent Ed25519 identity, and any device can send to any other, phone to phone and desktop to desktop included. **Why iroh:** QUIC with TLS 1.3 where the peer is authenticated by its key, local discovery, NAT hole punching and an encrypted relay fallback in one library.\n\nFinding a peer: mDNS, the ticket's address hints, and Vutric's own 41-byte UDP beacon for networks where mDNS misbehaves; a visible device answers a query at most once per 500 ms per source. Reach: by default local first, then the internet. Hole punching works on most networks; where it fails, the iroh relay forwards ciphertext only. A LAN-only mode touches nothing outside the network. The device name is never published to lookup.\n\nMeasured so far on one machine, two processes: mDNS discovery 138 ms, QUIC connect plus Hello 6 ms. Not a Wi-Fi number, and the report says so.",
      check: {
        q: "Guest and hotel Wi-Fi often isolate clients. What does Vutric do there?",
        options: [
          "Scan the subnet harder until the peer answers",
          "Detect it (ticket addresses unreachable) and offer Hotspot mode: one phone makes a local network",
          "Send the photo over Bluetooth at full size",
        ],
        answer: 1,
        why: "Client isolation blocks unicast too, so no discovery trick helps. The app detects it and offers a local-only hotspot whose SSID and password are in the same QR. Bluetooth is used only for finding and the handshake: well under 1 Mbit/s would take tens of seconds for one photo.",
      },
      fields: {
        "41 bytes": "Fixed size: anything else is not a beacon.",
        VTRC: "Magic bytes: a stray datagram from another app fails at once.",
        "endpoint id": "The 32-byte key; the address comes from the datagram's source IP.",
        "dropped unread": "The beacon is unauthenticated, so it only says where to dial; QUIC still checks the key.",
      },
    },
    trust: {
      short: "Trust",
      title: "A gate before the first byte, and digits that cannot be ground",
      body: "The six-digit code of the spike was `TLS exporter mod 10^6`. A man in the middle who answers mDNS can grind it: as the server of one victim he retries his key share until both codes match, about 2^20 tries, seconds of CPU. ADR-0050 replaced it with **commit-then-reveal**, the scheme of Bluetooth numeric comparison: the attacker must pick his nonce before he sees the other one, so each attempt matches with probability 10^-6 and costs a visible pairing on both screens.\n\nThe second half is the **trust store**, keyed by the endpoint key only: a name or an address never makes a device trusted, and seeing a device never adds it. Admission is decided as soon as QUIC has authenticated the key, before the control stream is read; a refused peer gets code 403 and nothing it sent is parsed. \"Everyone\" lasts at most 10 minutes, and a window that ends further ahead counts as expired, so a clock set back cannot keep it open.",
      check: {
        q: "Someone edits the settings file so that \"everyone\" ends in the year 2030. What happens?",
        options: [
          "Unknown devices can send until 2030",
          "The window counts as expired, because it ends more than 10 minutes ahead",
          "The app crashes on start",
        ],
        answer: 1,
        why: "The rule is checked against the maximum length, not only against the end time: anything longer than 10 minutes is treated as already over. A damaged trust file is moved aside and the store starts empty: pairing again is safe, guessing is not.",
      },
      fields: {
        PairCommit: "A hash of the TLS secret and the dialer's random value: binding, but it reveals nothing.",
        PairNonce: "The listener's random value, sent only after the commitment arrived.",
        PairReveal: "Opens the commitment; a mismatch or a message out of order is PairingTampered.",
        "six digits": "From BLAKE3 in derive-key mode, separate contexts for commitment and code.",
        "403": "QUIC application error: the dialer gets the typed error NotAdmitted and the UI can explain it.",
        "10 minutes": "Like AirDrop: openness switches itself off.",
      },
    },
    interop: {
      short: "Interop",
      title: "Speaking the protocols people already use",
      body: "Vutric wants to replace several apps at once, so ADR-0010 adds adapters: each is a crate `vutric-compat-<name>` that maps a foreign protocol onto the same internal pipeline. A file that arrives through LocalSend gets the same Halqa, the same folder rules and the same gallery copy as a Vutric file.\n\nThe rules are strict because these parsers read strangers' bytes: each adapter has a sandboxed parser process, a fuzzer in the same PR, and a test against the real app. The magic-wormhole adapter, for example, is tested in the `Interop` workflow against the reference Python tool with its own mailbox server and transit relay, all on the runner, with pinned versions so an upstream release shows up as a deliberate bump.\n\nAn adapter never auto-accepts from an unknown sender.",
      fields: {
        LocalSend: "Open spec, REST over HTTPS, multicast plus an HTTP subnet scan.",
        "Quick Share": "Google's LAN mode as documented by NearDrop: UKEY2 handshake and protobuf frames.",
        "KDE Connect": "Only the share plugin: files in and out, nothing that controls the computer.",
        "magic-wormhole": "PAKE with a short code: it works between two machines with no shared network.",
        "same pipeline": "One code path after parsing, so storage rules and effects never diverge per protocol.",
      },
    },
    ci: {
      short: "CI",
      title: "CI: Windows and Linux, warnings are errors",
      body: "Every push to main and every PR runs `ci.yml` on `windows-latest` and `ubuntu-latest`: the overlay host is Windows-only code, and the rest must build on both. `RUSTFLAGS=-D warnings` and clippy with the **pedantic** group on make any warning a failure; `--locked` refuses a build whose `Cargo.lock` would change.\n\nOn Linux the job also checks formatting and runs `tools/check-site.mjs` on the design-system site. The ruleset on `main` requires both checks, one approval and squash merge.\n\nOne constraint shaped the YAML: the org allows only GitHub-owned or verified actions, so the popular community Rust cache is out and `actions/cache` is keyed by the toolchain file and the lockfile instead.",
      fields: {
        RUSTFLAGS: "Set for the whole job, so a warning in any crate stops the build.",
        "check-site": "The site's own guard: inline code, foreign origins, IPv4 addresses and Cyrillic fail it.",
        clippy: "All targets, tests included; pedantic lints are warnings, and warnings are errors.",
        "--locked": "CI builds exactly the dependency set that was reviewed.",
        "actions/cache": "Registry and target folders cached by toolchain + lockfile hash.",
      },
    },
    fuzz: {
      short: "Fuzzing",
      title: "Every parser that sees peer input is fuzzed",
      body: "ADR-0051: anything that reads bytes from a peer or a file has a fuzz target, and each target checks a property, not only \"no panic\". The frame decoder must buffer at most one frame plus one read; every accepted message must round-trip unchanged; a saved path must stay under the save folder and be a valid name on Windows, Linux and macOS.\n\n`fuzz/` is a cargo-fuzz crate in its own workspace, so nightly flags never reach the main build. Each target is a plain function, so the same checks run three ways: a stable smoke run on every push (works on Windows too), libFuzzer with AddressSanitizer on Linux in CI, and a replay of any crash file by hand. libFuzzer does not link on Windows MSVC, which is why it runs only on Linux.",
      check: {
        q: "Why is each fuzz target written as a plain function in fuzz/src/lib.rs?",
        options: [
          "So the same property runs both on stable (smoke test) and under nightly libFuzzer",
          "Because libFuzzer cannot call Rust code",
          "To make the binaries smaller",
        ],
        answer: 0,
        why: "The `fuzz_targets/<name>.rs` files only hand bytes to those functions. The stable smoke test calls the same functions with random and bit-flipped inputs, so a contributor without nightly or a C++ toolchain still runs every check.",
      },
      fields: {
        smoke: "Deterministic and fast: seconds on every push.",
        libfuzzer: "Coverage-guided; the corpus is cached between runs.",
        targets: "Every adapter adds its own frame parser here in the same PR.",
        "fuzz/regressions/": "Each crash found once is replayed forever.",
      },
    },
    mobile: {
      short: "Mobile builds",
      title: "Building the phone app: iOS traps found the hard way",
      body: "The Android APK builds on the owner's Windows machine with the NDK. The iPhone build needed a Mac, so it runs in the `iOS spike` workflow and produces an unsigned IPA for sideloading. iOS was pulled ahead of Phase 3 only to measure on the owner's iPhone.\n\nEach line of this step is a bug that happened: `libc` 0.2.190 broke two crates of iroh's network stack on iOS, so fixed copies are vendored under `third_party/` with `[patch.crates-io]` until upstream releases them. The Flutter linker stripped the Rust bridge as dead code and the app crashed on start, so dead-code stripping is off and CI checks with `nm` that the bridge symbol is really there. The arm64 macOS queue timed out, so the job runs on `macos-15-intel`.\n\nAlso found on iOS: multicast needs an Apple entitlement a free Apple ID cannot get, so `vutric-net` keeps running without mDNS and pairs by QR.",
      fields: {
        "verified actions": "No third-party setup action allowed: Flutter is cloned from its own repository.",
        "third_party/netdev": "Vendored with the upstream fix; removed once the fix is released.",
        "DEAD_CODE_STRIPPING=NO": "Otherwise the linker removes Rust code that Dart calls only at run time.",
        frb_get_rust_content_hash: "A symbol flutter_rust_bridge exports: if it is missing, the bridge is gone.",
      },
    },
    site: {
      short: "Site deploy",
      title: "The design-system site: atomic deploy, automatic rollback",
      body: "`site/` is a static page at vutric.wonmor.io (palette cobalt and sand, self-hosted Geist fonts, the Halqa drawn in Canvas 2D) that documents the design system and the screens. It is deployed by `deploy.yml` on a push to main that touches the site, behind the shared edge proxy of dtwin.uz.\n\nThe CI key on the server is bound to one command, `bin/receive` (`restrict,command=` in authorized_keys), so a stolen key can publish a release and nothing else. The host key is pinned, never trusted on first use. The new release is unpacked next to the old ones and `releases/current` is switched with a symlink swap; Caddy serves through it, so no request is dropped.\n\nThen CI proves it: it polls `version.txt` until it shows the commit, checks 7 paths, a 404 and the CSP header. If any check fails after shipping, the workflow runs `rollback`, which points `current` back to the previous release.",
      check: {
        q: "The deploy shipped, but the smoke test finds the CSP header missing. What happens?",
        options: [
          "Nothing: the deploy step already succeeded",
          "The Roll back step runs and current points to the previous release again",
          "The server deletes the site",
        ],
        answer: 1,
        why: "The rollback step runs on `failure()` when the ship step succeeded. The previous release is still on disk (5 are kept, plus the previous), so going back is one more symlink swap.",
      },
      fields: {
        "check-site": "The same guard as in CI, run again right before shipping.",
        "version.txt": "The commit SHA inside the site: proof that the live page is the new one.",
        "StrictHostKeyChecking=yes": "The server's key is a secret in CI; an unknown host is refused.",
        rollback: "Runs only if shipping succeeded and a later check failed.",
        "bin/receive": "Forced command: the only thing this key can make the server do.",
        "mv -T": "Rename over the old symlink is atomic: readers see either the old site or the new one.",
      },
    },
    process: {
      short: "Process",
      title: "How the work is organised",
      body: "From 2026-11-18 the work runs as parallel streams, one AI session each, every stream in its own git worktree and branch: W1 phone, W2 desktop, W3 network and interop (later also Linux, macOS and Android-native streams). Each stream owns its files exclusively and its own range of ADR numbers, so two sessions never edit the same file or collide on a decision number. W3 owns the public Rust API and changes it only additively; others ask through an issue labelled `needs-w3`.\n\nThe owner's bar is \"the best in every respect\", made checkable: no performance claim ships without a measurement written into an ADR or a report. One example: the desktop window toolkit was chosen by measuring the same screen in Slint, Tauri and Flutter (Slint with the software renderer used 6.3 MB private memory against about 200 MB for the others); that ADR is still a proposal awaiting the owner. Every phase ends with a report and an explicit go or no-go.",
      fields: {
        W1: "Flutter phone app on the design handoff, Kotlin and Swift modules.",
        W2: "Rust daemon, overlay cards and effects, desktop windows.",
        W3: "Routes, relay, trust and security, storage engine, adapters, fuzzing.",
        "no performance claim": "Measured numbers or nothing; a guess is never written as a measurement.",
        "go / no-go": "Phase 0 is still open: its network exit criteria need a real Wi-Fi run.",
      },
    },
    recap: {
      short: "Recap",
      title: "Vutric in one screen",
      body: "**User side:** pick photos on the phone's own gallery, tap send, throw; the photo flies out of a ring on the desktop while you keep typing. Pair once by QR, or by comparing six digits.\n\n**Technical side:** a pure Rust core shared with the phone through flutter_rust_bridge; iroh QUIC with keys as identities, mDNS, a 41-byte beacon and an encrypted relay; preview-first messages over a length-checked postcard framing; a trust store that decides before the first byte; a wgpu overlay through DirectComposition at 60.3 fps with zero focus loss.\n\n**Pipelines:** CI on Windows and Linux with warnings as errors, 17 fuzz targets on stable and libFuzzer, an iOS build with its own guard checks, a site deploy with a forced-command key, atomic symlink swap and automatic rollback.\n\n**Still open:** real Wi-Fi measurements with two devices, discrete GPUs and Windows 11.",
    },
  },
  scenarios: {
    "stalled-client": {
      label: "Silent client",
      steps: {
        "stall-bug": {
          short: "Stuck",
          title: "One silent client held up everyone",
          body: "In the first network code the listener took one connection at a time: accept, handshake, then the next. A client that opened QUIC and then sent nothing blocked every real device behind it. There were no timeouts anywhere, so a silent peer could also hang a throw or a handshake forever. An independent review of the 0.2 code found it.",
          fields: {
            "one at a time": "A serial accept loop: the slowest client sets the pace for all.",
            "sends nothing": "Cheap for an attacker on the same network, or just a broken phone.",
            "t=7.9 s": "The real phone waited 7.8 s for nothing.",
            "no timeout": "Without a deadline, \"waiting\" and \"dead\" look the same.",
          },
        },
        "stall-fix": {
          short: "Side by side",
          title: "Handshakes side by side, every wait bounded",
          body: "Now each incoming connection gets its own task, the handshake has an 8 s deadline and an answer to a fling 5 s. A bad client is skipped and the listener keeps going. A test with a real stalled client and a real phone-like client in one process measures it: 7.8 s before, under 0.4 s now.",
          fields: {
            "own task": "One slow peer costs one task, not the whole listener.",
            "8 s": "Long enough for a slow phone on bad Wi-Fi, short enough not to look frozen.",
            "5 s": "A thrower learns quickly that the receiver did not react.",
            "stalled_client.rs": "The fix is pinned by a test, so it cannot quietly come back.",
          },
        },
      },
    },
    "fuzz-finds": {
      label: "Fuzzer finds",
      steps: {
        "fuzz-spaces": {
          short: "2 bugs",
          title: "The first smoke run: two Windows file-name traps",
          body: "The stable smoke run found two real bugs in `sanitize`, the function that turns a peer-supplied name into a safe file name. Cutting a long extension to 16 characters could leave trailing spaces, which Windows silently drops, so the saved name differed from the checked one. And `com1 .tar.gz` was not recognised as the COM1 device, because Win32 ignores spaces before the dot.",
          fields: {
            "trailing spaces": "Windows strips them on save, so two different checked names can become one file.",
            COM1: "A reserved device name: opening it does not create a file at all.",
          },
        },
        "fuzz-long": {
          short: "3rd bug",
          title: "libFuzzer finds a third in 26 seconds",
          body: "The first libFuzzer run in CI found a combination the random run had missed: a reserved name whose stem was already cut to the 120-character limit got the safety prefix on top, ending one character over the limit.",
          fields: {
            "120 characters": "The length cap for a stem.",
            "121 characters": "Two correct rules, applied one after the other, broke the limit together.",
          },
        },
        "fuzz-fixed": {
          short: "Fixed",
          title: "Fixed, and replayed on every push",
          body: "Each fix came with a regression test. The reserved list grew to include COM0, LPT0, the superscript COM and LPT names, CONIN$ and CONOUT$. The prefix now replaces the last character instead of adding one. The crashing input is kept in `fuzz/regressions/`, and the stable smoke run replays it on every push.",
          fields: {
            "trailing spaces": "The cut now trims, so the checked name is the saved name.",
            CONIN$: "Console device names Win32 also reserves.",
            "replaces the last character": "The length limit holds after every rule.",
            "fuzz/regressions/": "Found once, tested forever.",
          },
        },
      },
    },
    "flaky-smoke": {
      label: "Flaky smoke",
      steps: {
        "flaky-bug": {
          short: "Red on main",
          title: "Green in the PR, red on main, same build",
          body: "The macOS package smoke test installs the app and checks that the share extension and the quick action are registered with `pluginkit`. It waited a fixed 2 seconds. On one main-branch run the quick action was not listed yet, so the job failed, although the identical build had passed in the pull request. Registration is asynchronous and its timing varies on the runners.",
          fields: {
            "sleep 2": "A fixed wait is a guess about someone else's timing.",
            "registered: NO": "A real build, failed only by the clock.",
            asynchronous: "pluginkit returns before the system has listed the extension.",
          },
        },
        "flaky-fix": {
          short: "Poll",
          title: "Poll for up to 20 seconds, fail only if it never appears",
          body: "The fix replaces the guess with a bounded poll: add the extension, check once a second, re-add it every 5 seconds, and fail only if it is still not listed after 20 seconds. The log now says how long registration took, so a slow runner is visible instead of being a mystery.",
          fields: {
            "re-add": "If the first registration was lost, the next one catches it.",
            "after ~N s": "The time is logged: a trend can be seen later.",
            "not listed after 20 s": "A real failure still fails, with a clear reason.",
          },
        },
      },
    },
  },
};

export default text;
