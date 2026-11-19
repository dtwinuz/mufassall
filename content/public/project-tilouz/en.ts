import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Project: Tilo, a bridge between Deaf and hearing people",
  summary:
    "Tilo is an open-source, non-profit platform from wonmortech that removes the wall between Deaf, hard-of-hearing and non-speaking people and hearing people, Uzbekistan first. Today it is a test app on the phone (live captions, situation cards, video messages, an emergency card), a presentation site, a concept demo and a research plan; nothing personal ever reaches a Tilo server. The whole project: the user journeys, how the app works entirely in the browser, the privacy decisions, the planned interpreter calls and sign-language dataset, and the pipelines that check, deploy and roll back the site.",
  learn: [
    "The user side: face-to-face captions, situation cards, video messages and the emergency card, as a Deaf person and a hearing person use them",
    "Why everything runs on the device: browser speech recognition with consent, MediaRecorder, a service worker for offline cards, Uzbek Cyrillic generated from Latin",
    "Privacy as configuration: a CSP and Permissions-Policy that open camera and microphone only under /app/",
    "The pipelines: link and leak checks, REUSE and DCO, an atomic deploy with rollback, scheduled Telegram posts; and what is still only a plan",
  ],
  nodes: {
    deaf: "Deaf user",
    hearing: "Hearing person",
    app: "Tilo app",
    stt: "Browser speech engine",
    web: "tilo.wonmor.io",
    sw: "Offline cache",
    vri: "Planned platform",
    data: "Sign dataset",
    ci: "GitHub Actions",
    tg: "Telegram channel",
  },
  metrics: {
    offline: "Cards that open offline",
    server: "Personal data sent to Tilo",
    nolink: "Desktop slides with no way to the app",
    stuck: "PRs whose checks never start",
    unlicensed: "Files failing the licence check",
  },
  steps: {
    what: {
      short: "What it is",
      title: "A wall that Tilo wants to take down",
      body: "When a Deaf person goes to a clinic, a bank or an office, often nobody understands them and they do not understand the hearing person. Qualified sign-language interpreters are few, there is no open sign dictionary or data, and emergency services have no text or video channel. Tilo (repo `wonmortech/tilouz`; code Apache-2.0, documents CC BY 4.0) is a non-profit platform for this, Uzbekistan first, then the CIS.\n\nIts principles are written into the README: Deaf people lead (\"nothing about us without us\"), free and open, privacy first because a face video is biometric data, honest about what is a plan, and cooperation with existing services rather than competition.\n\nWhat a user can open today is the test app at `/app/`: four modules on the phone, with one promise on the home screen. Card texts are drafts waiting for the Deaf advisory council, and the app says so.",
      fields: {
        "Yuzma-yuz suhbat": "Face-to-face conversation: the core of the app.",
        "Vaziyat kartalari": "Ready phrases for the places where misunderstandings hurt most.",
        "Video xabar": "A message in sign language, recorded on the phone.",
        "Favqulodda karta": "For emergencies: the numbers and a card to show a stranger.",
        "nothing is sent": "Not a policy line but an architecture: there is no Tilo backend for the app to send to.",
      },
    },
    talk: {
      short: "Captions",
      title: "Face to face: the hearing person speaks, the Deaf person reads",
      body: "The phone lies between two people. The hearing person taps **Gapirish** (speak) and talks; their words appear as big captions for the Deaf person, while a grey interim line shows the phrase still forming. Recognition can be wrong, so every caption line is a button: tap it and fix the word. The Deaf person types an answer, presses **Ko'rsatish** (show) and can have it read aloud. A Burish (flip) button turns the screen for the person opposite.\n\nRecognition uses the browser's own engine through the Web Speech API. **Why:** it costs nothing, needs no server and works in Chrome and Edge today. The price is honesty: many browsers send the audio to their vendor, so before the first start the app shows a consent dialog that says exactly that. Whoever does not agree uses writing mode, where the hearing person types instead.\n\nThe interface has three text sizes up to very large, light and dark themes, and respects reduced motion.",
      check: {
        q: "The browser engine may send audio to its vendor. Why does Tilo still use it instead of its own server?",
        options: [
          "Because its own server would be faster",
          "A Tilo server would collect speech itself; with the browser engine Tilo stores nothing, says so up front, and offers writing mode",
          "Because the browser engine is more accurate for Uzbek than any other",
        ],
        answer: 1,
        why: "The test app has no backend at all, so there is nothing to leak or subpoena on Tilo's side. The remaining risk (the browser vendor) is disclosed before the microphone starts, and refusing does not lock anyone out. A self-hosted recognizer is part of the plan, after its accuracy is measured.",
      },
      fields: {
        SpeechRecognition: "The Web Speech API; prefixed as webkitSpeechRecognition in Chrome.",
        interimResults: "Partial guesses arrive while the person is still speaking, so the reader is not left waiting.",
        "tap it to correct": "Recognition errors are expected; the user fixes them, nothing is sent anywhere.",
        SpeechSynthesisUtterance: "Speech synthesis on the device for the typed reply.",
        sttOk: "The consent is remembered on this device only, in local settings.",
        "writing mode": "The fallback that needs no microphone and no third party.",
      },
    },
    cards: {
      short: "Cards",
      title: "Situation cards for the places that matter",
      body: "Eight sets, 47 cards: general, clinic, pharmacy, bank, taxi, police, office and shop. A card is one clear sentence (\"I am Deaf. Please write or sign.\") that the Deaf person opens and shows full-screen to the hearing person, with the Russian version next to it and a button to read it aloud.\n\nThe data is a plain JSON file next to the page, so changing a phrase is a content edit, not a code change. The file says what it is: `status: draft`, a note that the texts have not passed the Deaf advisory council and two Deaf experts, and that sign videos will be recorded by Deaf signers later; until then each card shows \"sign video: pending\".\n\nThe card texts exist in Uzbek Latin and Russian; Uzbek Cyrillic is generated (step 7).",
      fields: {
        status: "Draft until the Deaf advisory council approves: the app shows this on every card.",
        sets: "One set per situation, each with an icon and a title in two languages.",
        title: "Translated set name; the third language is generated.",
        cards: "Stable ids like general.deaf, so a future sign video can attach to the right card.",
        uz: "The Uzbek Latin original; Cyrillic is derived from it.",
      },
    },
    video: {
      short: "Video, SOS",
      title: "A video message and an emergency card, and nothing uploaded",
      body: "**Video xabar:** the Deaf person turns on the front camera and records a message in sign language. The preview is mirrored like a mirror, the recording is not, and the app explains this, because a signer's left and right hands matter. After recording it shows size and length and offers to share the file through the phone's share sheet, usually to Telegram. If the browser cannot share, **Saqlash** (save) downloads it. The clip never leaves the phone otherwise.\n\n**Favqulodda karta:** \"I am Deaf. I need text or sign language\", the numbers 101 (fire), 102 (police), 103 (ambulance) and 112, and an optional address field kept only on this phone. The app is blunt about its limits: it does not replace an emergency service, and no way to reach 112 by text or video was found yet, so the card asks a person nearby to call.",
      check: {
        q: "Why is the SOS address stored in localStorage and not sent anywhere, even though sending it could help rescuers?",
        options: [
          "Because localStorage is faster",
          "There is no channel to 112 that would receive it; storing it on a server would only create a list of Deaf people's home addresses",
          "Because browsers forbid sending addresses",
        ],
        answer: 1,
        why: "Without a real text channel to emergency services, an upload would help nobody and would create a sensitive database. Kept on the phone, the address is shown on the card when needed.",
      },
      fields: {
        getUserMedia: "Camera access, allowed by policy only on /app/.",
        MediaRecorder: "Records in the browser; the clip lives in memory as a blob.",
        "navigator.share": "The Web Share API hands the file to an app the user chooses.",
        localStorage: "Per-device settings under one key; reading is wrapped so a blocked storage does not break the app.",
        "no text or video channel": "Said on the card itself, not hidden in a FAQ.",
      },
    },
    privacy: {
      short: "Privacy",
      title: "The server decides where camera and microphone may be used",
      body: "The whole site is static files served by Caddy. Privacy is not only a promise in the text; it is in the headers. For every page outside `/app/` the Permissions-Policy is `camera=(), microphone=()`: the browser will refuse any script that asks. Only under `/app/` is it `camera=(self), microphone=(self)`, and only there may recorded clips play from `blob:` URLs.\n\nThe CSP allows scripts from the site itself only, `connect-src 'self'` means the page cannot talk to any other host, and `frame-ancestors 'none'` stops the app from being framed by a phishing page. All files are revalidated (`no-cache`) because names are not content-hashed; fonts are cached for 30 days.\n\nThe test app's own settings (language, text size, theme, the SOS address) live in one localStorage key, `tilo.app.v1`.",
      fields: {
        "Content-Security-Policy": "Only same-origin scripts and connections: even an injected script could not send data out.",
        "Permissions-Policy": "Camera and microphone are allowed for this origin only under /app/.",
        "Cache-Control": "Revalidate every time, so a fix is seen on the next visit.",
      },
    },
    offline: {
      short: "Offline",
      title: "Cards open with no internet",
      body: "A clinic basement or a taxi often has no signal, which is exactly when a card is needed. The product plan (06a, M3) requires that cards open offline, so `/app/` registers a service worker that caches its shell: the page, scripts, styles, `cards.json`, the icon and the fonts.\n\nThe strategy is **network first, cache as fallback**: online, every request goes to the network and refreshes the cached copy, so a new release is picked up on the next online visit; offline, the cached copy answers. The worker only touches GET requests to its own origin for paths in the shell list. It never caches anything the user made. When the shell is ready the app shows \"Ilova internetsiz ham ochiladi\" (the app also opens without internet).\n\nSpeech recognition still needs the network in most browsers; the app says so when it fails.",
      check: {
        q: "Why network first and not cache first for the app shell?",
        options: [
          "Cache first would keep serving an old cards.json and app.js after a fix, until the cache name changed",
          "Network first uses less battery",
          "Service workers cannot do cache first",
        ],
        answer: 0,
        why: "With draft texts that the Deaf council will correct, freshness matters: network first shows the newest version whenever there is a connection and falls back only when there is none.",
      },
      fields: {
        SHELL: "The exact list of files the app needs to start; nothing else is intercepted.",
        "network first": "Fresh content whenever possible.",
        "fall back": "Offline, the last good copy answers.",
        "only paths in SHELL": "A narrow scope means the worker cannot break the rest of the site.",
        never: "Videos and captions stay in memory; the cache holds only public files.",
      },
    },
    script: {
      short: "Scripts",
      title: "Uzbek Latin, Uzbek Cyrillic, Russian from two sources",
      body: "Uzbek is written in Latin and, by many older people, in Cyrillic. Instead of keeping three copies of every string, the app keeps Uzbek Latin and Russian, and generates Uzbek Cyrillic with a small rule-based transliterator in `translit.js`, which the settings offer as a separate language.\n\nThe rules handle the digraphs (o', g', sh, ch, yo, yu, ya, ye), the e/e-reversed choice by position, and loanwords where `ts` before `iya` becomes one letter. Placeholders such as `{mb}` are swapped out before transliteration and put back after, so a number slot is never turned into Cyrillic letters. Known gaps (a loanword like sirk) are listed in the code and left to human review; the settings say \"if you see a mistake, tell us\".",
      fields: {
        uzc: "The setting value for Uzbek Cyrillic; the page's lang becomes uz-Cyrl.",
        "by rules": "Deterministic and tiny: no dictionary, no network.",
        politsiya: "The loanword rule: written ts in Latin, one letter in Cyrillic.",
        placeholders: "Template slots are protected from the transliterator.",
        "human review": "The rules do not pretend to be perfect; reports go to people.",
      },
    },
    plan: {
      short: "The plan",
      title: "What is planned: calls to human interpreters",
      body: "The main MVP module is not built yet, and the docs say so: one-tap video calls to human sign-language interpreters (VRI), with working hours published openly. The technical plan (docs/06b) designs it from open components with the reason for each: Jitsi Meet with Jigasi for calls (Apache-2.0, lobby, pinning the interpreter, a mobile SDK), WhisperLive for live Uzbek and Russian captions behind a provider-agnostic ASR router, Global Signbank as the sign dictionary, spoken-to-signed-translation for text to sign.\n\nPrinciples behind those choices: permissive licences in the core and copyleft only in separate services; biometric data stored in Uzbekistan (law ZRU-547, article 27-1); no vendor's word-error claims taken on trust, Tilo measures its own; language codes as configuration, not a closed enum; secrets never in the repo. The call itself needs no login: an anonymous session, and statistics without personal data.",
      fields: {
        "anonymous session token": "A Deaf user in a hurry should not have to register first.",
        "every 15 s": "The waiting user always sees the queue moving.",
        "recording off": "Calls are not recorded by default: a face is biometric data.",
        lobby: "The hearing side joins by QR; the interpreter lets them in.",
        "no personal data": "Funders get minutes and waits, not people.",
      },
    },
    dataset: {
      short: "Dataset",
      title: "An open, consented Uzbek Sign Language dataset",
      body: "No open Uzbek Sign Language data exists today. docs/06c plans the first one in stages, starting with a 50-sign protocol test and then 300 core signs chosen by product need (the situation cards, the parents' module, fingerspelling for both alphabets), approved by the Deaf advisory council.\n\nThe consent model is the heart of it. Five layers, each agreed and withdrawn on its own: participation, showing a video in the app, an open worldwide dataset, Tilo's own training, named research partners. Consent is explained in sign-language video plus plain text. The text says plainly that pose and skeleton data are not anonymous. Withdrawing from the open dataset removes the person from future releases, and the docs say up front that copies already published cannot be recalled.\n\nOpen video and pose are planned under CC BY-SA 4.0, tools under Apache-2.0, and never a non-commercial licence; datasets with incompatible terms are kept out of the open release.",
      fields: {
        D1: "The first public release: 300 signs from 30 to 50 signers.",
        consent: "Layered, so a signer can be in the dictionary without being in a training set.",
        "withdrawn on its own": "Leaving one layer does not undo the others.",
        "not anonymous": "Body movement can identify a person; promising otherwise would be a lie.",
        "CC BY-SA 4.0": "Derivatives stay open; the final choice is made with the Deaf council and a lawyer.",
      },
    },
    ci: {
      short: "CI",
      title: "Checks on every pull request",
      body: "There is no build step: `site/` is served exactly as it is in the repo. So the checks guard what would otherwise reach users directly. `check-site.mjs` fails on missing pages, broken local links, inline scripts (the CSP would block them), third-party origins, and text that must never be published: IP addresses, phone numbers, personal e-mail addresses, tokens, private keys.\n\nREUSE compliance makes sure every file states its licence, which matters in a repo that mixes Apache-2.0 code, CC BY 4.0 documents and OFL fonts. The concept demo has a Playwright smoke test: every route, the main flows, no console errors. A DCO job requires `Signed-off-by` on every commit, and OpenSSF Scorecard runs on main. Third-party actions are pinned by commit SHA.",
      fields: {
        "check-site.mjs": "No dependencies, no build: a Node script that reads site/ and fails loudly.",
        REUSE: "Machine-checkable licensing for every file.",
        Playwright: "A real browser clicks through the demo before merge.",
        "Signed-off-by": "The contributor certifies they may submit the change (Developer Certificate of Origin).",
        Scorecard: "Supply-chain checks published for the README badge.",
      },
    },
    deploy: {
      short: "Deploy",
      title: "Deploy: atomic switch, proof, rollback",
      body: "A push to main that touches the site runs `deploy.yml`. The workflow checks the site again, stamps the commit SHA into `version.txt` and pipes a tarball of the site and the Caddyfile over SSH. The CI key can run only one server command, `bin/receive`; the host key is pinned.\n\nOn the server the release is unpacked into its own folder; a changed Caddyfile is validated before anything moves; then `releases/current` is switched by an atomic symlink swap and Caddy reloads. Caddy runs in a container that mounts config and releases read-only, behind the shared edge proxy of dtwin.uz.\n\nCI then waits until the live `version.txt` equals the SHA and runs a smoke test; if anything fails after shipping, `rollback` points `current` back to the previous release. **Why this design:** no build, no downtime, and the CI key cannot do anything else on the server.",
      check: {
        q: "A new Caddyfile has a syntax error. When is it caught?",
        options: [
          "After the reload, when users get errors",
          "On the server before the switch: caddy validate fails and nothing changes",
          "Never: Caddy ignores bad lines",
        ],
        answer: 1,
        why: "`receive.sh` validates the new config inside the container before swapping releases; a failed validation leaves the live site and config untouched. If a reload fails anyway, it swaps back.",
      },
      fields: {
        "version.txt": "The SHA served by the live site proves which release is live.",
        "bin/receive": "Forced command: a stolen CI key can only publish or roll back.",
        "caddy validate": "A broken config never replaces a working one.",
        "releases/current": "The symlink Caddy serves from; renaming over it is atomic.",
        rollback: "The previous release is kept, so going back is one swap.",
        "read-only": "The web server cannot change its own files.",
      },
    },
    telegram: {
      short: "Telegram",
      title: "A channel that posts itself twice a day",
      body: "The project's Telegram channel gets a fact post at 09:00 and 19:00 Tashkent time, from a list of posts in `content/telegram/posts.json` (rubrics like \"bilasizmi\", did you know, each with its sources). A scheduled workflow runs `tools/telegram-post.mjs` with the bot token from repository secrets.\n\nThe script is **stateless**: post number N goes out in slot N, counted from the first day, so nothing has to be committed back after posting. Because Actions cron can start late, the slot is chosen by half-day (before or after Tashkent noon), not by the exact minute. A manual run can send a specific post by id, and `--plan` prints the whole schedule without posting.",
      fields: {
        chat_id: "The public channel; can be overridden by an environment variable for tests.",
        text: "HTML with a source link at the end of every fact.",
        parse_mode: "Telegram renders bold and links from HTML.",
        ok: "If Telegram says no, the job fails and shows the reason.",
      },
    },
    recap: {
      short: "Recap",
      title: "Tilo in one screen",
      body: "**User side:** a phone app with live captions you can correct, 47 situation cards in 8 sets, sign-language video messages shared through the phone, and an emergency card; Uzbek Latin, Uzbek Cyrillic and Russian; large text and dark mode.\n\n**Technical side:** static files and a PWA, browser speech recognition behind an honest consent dialog, MediaRecorder and the Web Share API, a network-first service worker for offline cards, a rule-based transliterator. No backend: nothing personal reaches Tilo. Headers decide where camera and microphone are allowed.\n\n**Pipelines:** site check for links and leaks, REUSE, DCO, Playwright on the demo, Scorecard; an atomic deploy with a forced-command key, validation, proof by version.txt and rollback; scheduled, stateless Telegram posts.\n\n**Plan, not yet built:** interpreter video calls on Jitsi, an ASR router, a sign dictionary, and an open consented dataset with five consent layers.",
    },
  },
  scenarios: {
    "hidden-app": {
      label: "Hidden app",
      steps: {
        "hidden-bug": {
          short: "Unreachable",
          title: "The app shipped, but desktop visitors could not find it",
          body: "The presentation site runs as a slide deck on desktop. In deck mode the footer with its links is hidden, and the call to action with the `/app/` link sat only on the last of 26 slides. So right after the test app went live, a visitor on a computer practically had no way to reach it.",
          fields: {
            "26 slides": "A visitor clicks through a story; most leave before the end.",
            footer: "The usual place for links does not exist in this view.",
            "last slide": "The only link to the app.",
            unreachable: "Found the same day, from a desktop browser.",
          },
        },
        "hidden-fix": {
          short: "Top bar",
          title: "An app button that is always visible",
          body: "The fix was small: an app button in both top bars, deck view and story view, on the Uzbek, Russian and English pages. Under 400 px only the icon remains, with an aria-label so screen readers still announce it.",
          fields: {
            "both top bars": "Whatever view the visitor is in, the button is there.",
            "uz, ru and en": "Three static pages, three edits.",
            "aria-label": "An icon-only button still has a name for assistive technology.",
          },
        },
      },
    },
    "actions-off": {
      label: "Actions off",
      steps: {
        "off-bug": {
          short: "No CI",
          title: "A pull request whose checks never started",
          body: "PR #18 was opened from an account on which GitHub had disabled Actions. Every workflow ended in `startup_failure`. Closing and reopening, an empty commit and a manual dispatch changed nothing, and a merge by that account would not have started the deploy either: the CI gate and the deploy both depend on Actions running for the actor.",
          fields: {
            startup_failure: "The workflow never ran a single step.",
            "empty commit": "A new push from the same account hits the same block.",
            workflow_dispatch: "A manual start is also refused for that actor.",
            deploy: "No deploy means the live site silently stays old.",
          },
        },
        "off-fix": {
          short: "New rule",
          title: "Open and merge from an account where Actions run",
          body: "The rule since then: pull requests are opened and squash-merged from a maintainer account with Actions enabled, and a second maintainer approves. Sign-off on every commit stays. The test app, the desktop fix and the concept demo (PRs #19 to #21) all went through this way.",
          fields: {
            "squash-merge": "One commit per change on main, as the ruleset requires.",
            "second maintainer": "The ruleset asks for one approval from someone else.",
            "Signed-off-by": "The DCO check is still enforced.",
            "went through this way": "Three PRs after the change, each with checks and a deploy.",
          },
        },
      },
    },
    "reuse-lint": {
      label: "Licence check",
      steps: {
        "reuse-bug": {
          short: "133 files",
          title: "The licences were written down, but not where the tool looks",
          body: "The brand kit's README already said which licence covers what: artwork CC BY 4.0, brand code Apache-2.0, fonts OFL 1.1. But `REUSE.toml`, the file the REUSE tool reads, had no rule for those folders. `reuse lint` counted 133 files without licence information and the check failed.",
          fields: {
            "brand/README.md": "Correct for a human reader, invisible to the tool.",
            "REUSE.toml": "One file of path rules that tells REUSE which licence applies where.",
            "133 files": "Logos, fonts and the deck tooling.",
          },
        },
        "reuse-fix": {
          short: "433/433",
          title: "Mirror the rules for the machine",
          body: "PR #2 copied the README's rules into `REUSE.toml`, annotated the deck tooling, and added a licence reference file for GSAP that points to its upstream licence text. After that `reuse lint` reported all 433 files compliant, and every later pull request is held to that.",
          fields: {
            "mirrors the rules": "No new licence decision, only the same one in a machine-readable place.",
            "LicenseRef-GSAP-Standard": "GSAP is not an SPDX licence, so it gets a named reference file.",
            "433/433": "Every file in the repo states its licence.",
          },
        },
      },
    },
  },
};

export default text;
