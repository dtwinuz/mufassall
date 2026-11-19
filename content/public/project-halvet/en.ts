import type { LessonText } from "@mufassall/scene-schema";
import type lesson from "./lesson";

const text: LessonText<typeof lesson> = {
  title: "Project: Halvet, a premium site for hammam and pool builders",
  summary:
    "Halvet is the site of a small team that builds private Turkish hammams, saunas and pools turnkey: electrics, plumbing, pumps and filters, mosaic. Its clients are demanding, so the site has to feel premium and still load fast on a phone. A static site with no build step, GPU steam with a ladder of fallbacks, a consultation form that writes a letter, Russian and English generated from the Uzbek source with a gate that stops the deploy, a strict CSP and a deploy that ships only a clean main branch.",
  learn: [
    "The visitor's path: hero steam, a 3D flight through the spaces, engineering cutaways and drawings, gallery, FAQ and the consultation form",
    "A site without a bundler: section scripts, vendored three.js loaded lazily, and a fallback ladder from GPU fluid simulation to 2D sprites",
    "How a phone score went from 55 to 100: canvas resolution, frame rate, no blend modes, WebP srcset, self-hosted fonts",
    "Three languages from one source with a translation gate, cache-busting on deploy, a strict CSP, and rollback by keeping the previous site",
  ],
  nodes: {
    guest: "Visitor's browser",
    edge: "dtwin.uz edge proxy",
    site: "halvet-site (Caddy)",
    mail: "Visitor's mail app",
    gpu: "Visitor's GPU",
    tool: "tools/i18n.mjs",
    owner: "Owner's laptop",
  },
  metrics: {
    weight: "Page weight on mobile",
    lh: "Lighthouse mobile performance",
    tbt: "Total blocking time",
    langs: "Languages",
    broken: "Broken sections on the live site",
    blocked: "Deploys stopped by a dirty tree",
  },
  steps: {
    intro: {
      short: "What it is",
      title: "A site for people who have seen the best hammams",
      body: "Halvet (the hottest, most private room of a Turkish hammam) is the brand of a small team that builds hammams, Finnish saunas and pools from the first drawing to the last mosaic tile. The visitors are wealthy, well travelled and picky: the site must look like a world-class studio and explain the engineering that competitors keep hidden.\n\nIt is served at halvet.dtwin.uz by a small Caddy container behind the shared edge proxy of dtwin.uz. The response carries a strict CSP: scripts, styles, fonts and images only from the site itself, and a form may only post to the site or to `mailto:`.",
      fields: {
        Host: "A subdomain of dtwin.uz for now; the brand's own domain is not set up yet.",
        "Cache-Control": "HTML is revalidated every time; scripts and styles are cached for a year (see the deploy step).",
        "Content-Security-Policy": "No inline scripts or styles, no third-party origins; form-action allows mailto: for the lead form.",
        "Permissions-Policy": "The page asks for no camera, microphone or location.",
      },
    },
    journey: {
      short: "Journey",
      title: "The visitor's path down the page",
      body: "The page opens on a photo of a hammam with live steam rising from its basins; moving the pointer stirs the air. Below come what Halvet is (a 3D dome), the spaces (a camera flies through a hammam, a sauna and a pool as you scroll), then engineering: interactive 3D cutaways, a 3D plant room with colour-coded pipes and seven drawings of filtration, heating, electrics, plumbing, steam, water chemistry and automation.\n\nThen craft (a glass mosaic shader and a girih star pattern drawing itself), an inspiration gallery, a comparison, the six steps of a project, questions and the consultation form. The research behind it said the same thing about the best sites in this trade: cinematic photos, calm motion, one signature effect, and an engineering cutaway that nobody else shows.",
      fields: {
        hero: "The signature effect: real steam over a real photo.",
        "#makonlar": "Spaces: scroll drives the camera, so the visitor controls the pace.",
        "#muhandislik": "Engineering made visible: what is behind the tiles, in drawings and 3D.",
        "#boshqaruv": "A smart-control concept, labelled as not yet available.",
        "#ilhom": "Inspiration gallery with the author of every photo.",
        "#aloqa": "Where the page ends: one form, one action.",
      },
    },
    lead: {
      short: "Lead",
      title: "The consultation form writes a letter",
      body: "The form asks for a name, a phone number, which spaces the visitor wants (hammam, sauna, pool, engineering only), the location, the area and a comment. The script checks the name and that the phone has at least nine digits, then builds a `mailto:` link with the answers in the body. The visitor's own mail app opens with the letter ready to send.\n\nThere is no server, no database and no personal data stored by the site. The address is still a placeholder: a Telegram bot for leads and the team's real contacts are the next step, and the README says so instead of pretending.",
      check: {
        q: "Why does the CSP list mailto: in form-action?",
        options: [
          "To let the browser send the form to a mail server",
          "The form's action ends in a mailto: navigation, and form-action 'self' alone would block it",
          "It is needed for the Telegram bot",
        ],
        answer: 1,
        why: "form-action limits where a form may navigate. The lead flow ends in a mailto: link, so that scheme is allowed explicitly; everything else stays limited to the site itself.",
      },
      fields: {
        ism: "Name: required.",
        tel: "Phone: at least 9 digits, so a typo is caught before the letter is written.",
        makon: "Which spaces the project is about: helps the team prepare the first call.",
        mailto: "The letter is composed in the browser and sent by the visitor's mail app.",
        "stores nothing": "No backend means nothing to leak and nothing to secure yet.",
      },
    },
    trust: {
      short: "Honesty",
      title: "A premium page that does not invent anything",
      body: "Premium clients notice fakes. So the page is careful: photos are AI stand-ins only until the team's real project photos arrive, and there are no made-up projects, numbers or reviews. The smart-control section is labelled \"soon, a concept\": its values are simulated and Halvet does not sell that service yet.\n\nThe 14 gallery photos are licensed and show their author in the lightbox; the three mood videos come from Pexels and Mixkit and are credited in the footer.",
      fields: {
        "AI stand-ins": "Placeholders until real photos exist; nothing pretends to be a finished project.",
        konsepsiya: "The label shown on the smart-control panel.",
        licensed: "Each gallery photo carries its licence and author.",
        credited: "Free stock videos still get a credit line.",
      },
    },
    arch: {
      short: "Architecture",
      title: "No bundler: what is in git is what is served",
      body: "The site is plain HTML, one stylesheet and one script per section, in `v1/`. There is no build step, no framework and no npm dependency at runtime: three.js r170 and Lenis are copied into `vendor/` and served from the site itself. The heavy 3D sections are ES modules loaded only when their section comes near.\n\nWhy so simple: one person maintains it, every effect is a separate file that can be removed without touching the rest, and the deploy can copy files as they are.",
      fields: {
        "no build step": "Nothing to compile; the only generated files are the ru and en copies.",
        "vapor.js": "One effect per file: the hero steam can be swapped without touching the page.",
        "lazy modules": "Visitors who never scroll to the 3D sections never download them.",
        "vendor/": "Libraries served from the same origin, which the CSP requires anyway.",
        "WebP srcset": "The browser picks the width it needs, from 640 to 2000 px.",
      },
    },
    vapor: {
      short: "Steam",
      title: "Steam on the GPU, with a ladder of fallbacks",
      body: "The hero steam is a stable-fluids simulation on the GPU: advection, vorticity and pressure projection, with sources placed at the basins in the photo. Where the steam is dense, it bends the photo like hot air. It needs WebGL with half-float render targets; if those are missing it returns false and the page falls back to a lighter fog shader, then to 2D sprite puffs.\n\nTo keep the page responsive while it starts, the shaders compile in the background and the simulation warms up in 6 ms slices; a CSS steam layer shows until it is ready. On a data-saving connection the heavy effects are skipped, and with reduced motion the steam stands still.",
      check: {
        q: "An older phone has WebGL but no half-float textures. What does its visitor see?",
        options: [
          "A blank hero",
          "The fog shader, or the sprite puffs if that fails too",
          "An error message",
        ],
        answer: 1,
        why: "vapor.js reports that it cannot run, and startFog tries the next rung: the fog shader, then the 2D sprites. The photo and the text are always there; the steam is decoration that degrades.",
      },
      fields: {
        "stable fluids": "A classic, stable method for real-time fluid simulation.",
        "half-float": "16-bit float textures; without them the simulation is not precise enough.",
        KHR_parallel_shader_compile: "Asking for compile status later instead of blocking the main thread.",
        "fog.js": "The second rung: cheaper, still WebGL.",
        saveData: "The visitor asked to save data: no heavy effects.",
        "prefers-reduced-motion": "The steam is drawn once and does not move.",
      },
    },
    slow: {
      short: "Too slow",
      title: "The first version was beautiful and slow",
      body: "Lighthouse on a phone scored the first version 55, with 14.4 seconds of blocking time. The page weighed 3.6 MB, mostly JPEG photos of up to 0.8 MB and fonts from Google. The worst part was the hero: its steam canvas drew at full device resolution on every frame from the very first moment, with `mix-blend-mode` on top, which makes the browser composite the whole hero again every frame.",
      check: {
        q: "What made the blocking time so large?",
        options: [
          "The photos",
          "A full-resolution canvas redrawn every frame from page load, plus a blend mode that forces full compositing",
          "The fonts",
        ],
        answer: 1,
        why: "Photos cost bandwidth, not main-thread time. A full-resolution canvas redrawn on every frame from the start, blended with what is below it, keeps the main thread and the compositor busy before the page is even usable.",
      },
      fields: {
        "performance 55": "Mobile score of v1, measured on 2026-11-09.",
        "14.4 s": "Total blocking time: the page could not respond to taps.",
        "3.6 MB": "Mostly photos that were larger than any phone screen.",
        "full device resolution": "Far more pixels than a soft steam effect needs.",
        "mix-blend-mode": "Blending forces the browser to recompute the layers under the canvas.",
      },
    },
    fast: {
      short: "Fast",
      title: "Same look, a fraction of the work",
      body: "Version 1.1 drew the steam at 35% resolution and 30 frames per second, started it only after the page loaded and paused it off screen or in a hidden tab. Steam is soft, so nobody sees the lower resolution. The blend mode went away; fog and light rays move with transform and opacity only, which the compositor handles without repainting.\n\nPhotos became responsive WebP from 640 to 2000 px, regenerated by a script, and the fonts moved onto the site with preload. Result: mobile performance 55 to 100, page 3.6 to 0.65 MB, SEO 92 to 100. Later WebGL layers brought the live mobile score to 92 (v1.8), a cost the team accepted for the signature effect.",
      fields: {
        "35%": "Fewer pixels per frame; the blur of steam hides it.",
        "30 fps": "Half the frames, still smooth for slow-moving steam.",
        transform: "Moves that the compositor can do without layout or paint.",
        WebP: "Smaller files at the same quality, sized per screen.",
        "self-hosted": "No third-party font request, and a stricter CSP.",
      },
    },
    i18n: {
      short: "Languages",
      title: "Russian and English from the Uzbek source",
      body: "The page is written once, in Uzbek. `tools/i18n.mjs` cuts it into pieces: a block of text together with its inline tags, attribute texts like alt and aria-label, and the text strings inside the section scripts (code, shader and CSS strings are recognised and skipped). Each piece is looked up in `i18n/ru.json` and `i18n/en.json`, 609 pieces each, and the tool writes `index.ru.html`, `app.ru.js` and the rest.\n\nIf any piece has no translation, the tool exits with an error and the deploy stops. Why a hard stop: a half-translated page in front of a premium client is worse than a delayed update. New text means running `extract`, translating `*.missing.json`, then deploying.",
      check: {
        q: "A new FAQ answer is added in Uzbek and the deploy is started without translating it. What happens?",
        options: [
          "The ru and en pages show the Uzbek text for that answer",
          "i18n build exits 1 and the deploy stops before anything is copied",
          "The answer is left out of ru and en",
        ],
        answer: 1,
        why: "deploy.sh runs the i18n build first and stops on its error. Nothing is shipped, so the live site stays fully translated until the missing pieces are translated.",
      },
      fields: {
        "inline tags": "A translator sees a whole sentence with its emphasis and links, not fragments.",
        "single-quoted": "Text in scripts is extracted too: labels of drawings, captions, buttons.",
        "609": "Pieces in each dictionary at v1.8.",
        "not in git": "Generated copies are rebuilt on every deploy, so they never drift from the source.",
        "exit 1": "A missing translation is a failed build, not a silent fallback.",
      },
    },
    caddy: {
      short: "Serving",
      title: "Language routes and cache rules in the Caddyfile",
      body: "`/ru` and `/en` are separate static pages, mapped by rewrites; a trailing slash redirects to the short form. Scripts, styles, fonts and vendor files are cached for a year as immutable, which is safe because the deploy changes their URL on every release. Photos and videos are cached for a week, HTML and `version.txt` are revalidated each time. An unknown path redirects to the home page.",
      fields: {
        rewrite: "Clean language URLs served from generated files.",
        immutable: "Safe only because every deploy adds ?v=<sha> to the links.",
        "604800": "One week for photos and videos, which change rarely.",
        "no-cache": "Pages and the version file are always checked, so a deploy is visible at once.",
        "404": "A one-page site: unknown paths go home instead of to an error page.",
      },
    },
    deploy: {
      short: "Deploy",
      title: "Only a clean main branch reaches the server",
      body: "Deploys run from the owner's laptop with one script. It refuses to start if the working tree has any change or if `HEAD` is not exactly `origin/main`, so what is live is always a commit anyone can see. It builds the languages, copies `v1/` to a staging folder, appends `?v=<sha>` to every script and stylesheet link, writes `version.txt` and streams it all to the server.\n\nThere the current site is moved to `site.prev` and the new one takes its place. The script then polls the public `version.txt` until it shows the new commit; if it never does, it prints the one-line rollback.",
      check: {
        q: "Why may scripts be cached for a year if the site is deployed several times a day?",
        options: [
          "Browsers ignore long caches for scripts",
          "Each deploy rewrites the links to ?v=<new sha>, so a new release is a new URL",
          "The edge proxy clears the cache",
        ],
        answer: 1,
        why: "The HTML is revalidated on every load and points to `app.js?v=<sha>`. A new release changes that query string, so the browser fetches the new file; an old cached copy is simply never asked for again.",
      },
      fields: {
        "--porcelain": "Any modified or untracked file stops the deploy.",
        "origin/main": "Never a local branch or an unpushed commit.",
        "?v=": "Cache-busting: the first 8 characters of the commit.",
        "site.prev": "The previous site stays on disk for a one-command rollback.",
        "version.txt": "Checked through the public URL, so the edge and the container are both proven.",
      },
    },
    demo: {
      short: "Demo",
      title: "A live demo and a smoke test",
      body: "A later pull request added a copy of the site that runs under any sub-path, for the demo gallery at wonmor.io/demo/halvet/. The build changes only what a copy needs: relative language links, a small Demo badge, and a form that shows the letter it would send instead of opening a mail app.\n\nPlaywright opens that copy in all three languages and walks every section, the tabs of the cutaways and drawings, the gallery lightbox, the FAQ and the form; the same tooling writes 26 screenshots for the README. The repository itself has no CI workflow yet: the deploy script and this smoke test are the checks.",
      fields: {
        "dist-demo": "A separate output folder; v1/ and the deploy are untouched.",
        "Demo badge": "Visitors of the demo know it is not the live studio site.",
        Playwright: "A browser test that fails on missing sections or console errors.",
        "26 shots": "Screenshots for the README, regenerated by one command.",
        "no CI workflow": "Changes are reviewed by CODEOWNERS; automatic checks are a next step.",
      },
    },
    recap: {
      short: "Recap",
      title: "Recap",
      body: "1) Know the audience: premium visitors need calm motion, real engineering and no fakes. 2) A static site without a build step is enough: section scripts, vendored libraries, lazy 3D modules. 3) Every heavy effect has a fallback ladder and respects save-data and reduced motion. 4) Performance is a design constraint: a soft effect can run at 35% resolution and 30 fps, motion uses transform and opacity, photos are sized per screen. 5) Write once, translate by pieces, and stop the deploy on any missing piece. 6) A strict CSP is tested on the live site, not on a laptop server that sends none. 7) Ship only a clean main branch, bust caches with the commit in the URL, keep the previous site for rollback, and check the public version file.",
    },
  },
  scenarios: {
    "csp-style": {
      label: "CSP blocks styles",
      steps: {
        "style-blocked": {
          short: "Blocked",
          title: "A section that worked locally falls apart in production",
          body: "Version 1.3 added a stack of the eight layers of a pool, from soil to water. Each layer took its position from an inline `style=\"--i:3\"` attribute. On the laptop it was perfect. On the live site the strict CSP (`style-src 'self'`) refused every inline style, all layers fell into the same place, and hovering a list item no longer lit its layer. The local Python server sends no CSP, so the bug could only appear in production.",
          check: {
            q: "Why did nobody see this before the deploy?",
            options: [
              "The browser cache hid it",
              "The local server sends no CSP headers; only the production Caddy does",
              "The CSS file was not deployed",
            ],
            answer: 1,
            why: "The CSP is a response header added by the production Caddyfile. A local static server serves the same files without it, so anything the policy forbids works fine locally.",
          },
          fields: {
            "style=": "An inline style attribute: exactly what style-src 'self' forbids.",
            "style-src": "The directive that blocked it; the console names it.",
            "same place": "Without --i every layer has the same offset.",
            "no CSP": "The difference between the test server and production.",
          },
        },
        "style-fix": {
          short: "nth-child",
          title: "Move the index into the stylesheet",
          body: "The fix took the attributes out of the HTML. The stylesheet gives each layer its index with `:nth-child`, and the script that links list items to layers takes the index from their position instead of reading `li.style`. Setting a property from a script with `style.setProperty` is also allowed, because it goes through the CSSOM rather than an attribute. The lasting rule: after every deploy, open the live site and read the console.",
          fields: {
            "nth-child": "Position-based styling: no attribute, nothing for the CSP to block.",
            setProperty: "CSSOM changes from an allowed script are not inline styles.",
            "live site": "The only place where the real headers apply.",
          },
        },
      },
    },
    "dirty-tree": {
      label: "Dirty tree",
      steps: {
        "tree-stop": {
          short: "Stopped",
          title: "The deploy refuses: someone else's files in the folder",
          body: "Another working session had saved research folders into the same clone. They were not part of the site and nobody meant to commit them, but `git status --porcelain` listed them, and the deploy script stopped with its Uzbek message: there are uncommitted changes. Nothing reached the server.",
          check: {
            q: "What is the right fix?",
            options: [
              "Remove the porcelain check from deploy.sh",
              "Keep the check and tell this clone to ignore those folders locally",
              "Commit the research folders",
            ],
            answer: 1,
            why: "The check is what guarantees that live equals a pushed commit. The folders are local noise, so they are excluded locally; committing them would publish unrelated files, and removing the check would let real local edits ship.",
          },
          fields: {
            "--porcelain": "The machine-readable status: any line means stop.",
            "sites/": "An untracked folder from another session.",
            "to'xtatildi": "\"Stopped\": the script's own message.",
            "nothing was shipped": "The safety rule failed closed, as it should.",
          },
        },
        "tree-fix": {
          short: "Exclude",
          title: "Ignore locally, keep the rule",
          body: "The two folders went into `.git/info/exclude`, a per-clone ignore file that is never committed. The other session keeps its files, the deploy sees a clean tree again, and any change to a tracked file still stops it.",
          fields: {
            ".git/info/exclude": "Like .gitignore, but local to one clone and invisible to everyone else.",
            "not weakened": "Only these two untracked folders are ignored; the check itself is unchanged.",
          },
        },
      },
    },
  },
};

export default text;
