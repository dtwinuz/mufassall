import { defineLesson } from "@mufassall/scene-schema";

/**
 * Project lesson: Halvet, the site of a team that builds private Turkish hammams, saunas and pools
 * turnkey. A static site without a build step (v1/), WebGL and three.js layers with fallbacks, a
 * consultation form that writes a letter, Russian and English generated from the Uzbek source by
 * tools/i18n.mjs with a gate that stops the deploy on any missing string, a strict CSP, and a
 * deploy script that ships only a clean origin/main and keeps the previous site for rollback.
 * Facts come from dtwinuz/halvet (README, v1/, tools/, deploy/, commit messages v1 to v1.8, #4).
 * Scenarios: inline style attributes blocked by the production CSP, and a deploy stopped by files
 * another session left in the working tree.
 */
export default defineLesson({
  slug: "project-halvet",
  level: "intermediate",
  minutes: 15,
  tier: "public",
  metrics: [
    { id: "weight", unit: "MB", better: "down" },
    { id: "lh", unit: "", better: "up" },
    { id: "tbt", unit: "s", better: "down" },
    { id: "langs", unit: "", better: "up" },
    { id: "broken", unit: "", better: "down" },
    { id: "blocked", unit: "", better: "down" },
  ],
  steps: [
    {
      id: "intro",
      kind: "case",
      nodes: {
        guest: { kind: "client", at: [0, 3] },
        edge: { kind: "lb", at: [4, 3] },
        site: { kind: "service", at: [8, 3] },
      },
      edges: {
        open: { from: "guest", to: "edge", rate: 2, mode: "call" },
        pass: { from: "edge", to: "site", rate: 2, mode: "call" },
      },
      metrics: { weight: 3.6, lh: 55, tbt: 14.4, langs: 1, broken: 0, blocked: 0 },
      focus: ["guest", "edge", "site"],
      exchange: {
        edge: "open",
        request: {
          format: "http",
          head: "GET / HTTP/1.1",
          headers: [["Host", "halvet.dtwin.uz"]],
        },
        response: {
          format: "http",
          head: "HTTP/1.1 200 OK",
          headers: [
            ["Cache-Control", "no-cache"],
            ["Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self' mailto:"],
            ["Permissions-Policy", "camera=(), microphone=(), geolocation=(), interest-cohort=()"],
          ],
        },
        marks: ["Host", "Cache-Control", "Content-Security-Policy", "Permissions-Policy"],
      },
    },
    {
      id: "journey",
      kind: "case",
      focus: ["guest", "site"],
      exchange: {
        edge: "open",
        request: {
          format: "text",
          head: "v1/index.html: the page from top to bottom",
          body: "hero        steam rises from the kurnas of a hammam photo, the pointer stirs it\n#halvet     what Halvet is: a 3D dome, the photo projected on a hemisphere\n#makonlar   hammam, sauna, pool: a 3D camera flight on scroll, then a mood reel\n#muhandislik  3D cutaways (pool, Finnish sauna, Turkish hammam), a 3D plant room, 7 drawings\n#boshqaruv  smart control: a concept panel, marked \"soon\"\n#mozaika #naqsh  a glass mosaic shader and a girih pattern being drawn\n#ilhom      14 licensed photos with authors, #nega compare, #jarayon 6 steps, #savollar FAQ\n#aloqa      the consultation form",
        },
        marks: ["hero", "#makonlar", "#muhandislik", "#boshqaruv", "#ilhom", "#aloqa"],
      },
    },
    {
      id: "lead",
      kind: "case",
      nodes: {
        mail: { kind: "external", at: [0, 9] },
      },
      edges: {
        letter: { from: "guest", to: "mail", rate: 1, mode: "call" },
      },
      focus: ["guest", "mail"],
      exchange: {
        edge: "letter",
        request: {
          format: "text",
          head: "submit #aloqa form -> window.location.href = mailto:...",
          body: "check: ism not empty; tel has at least 9 digits; otherwise the field turns red\nmakon = the ticked boxes: Hammom, Sauna, Basseyn, Muhandislik\nmailto:ariza@halvet.example?subject=Konsultatsiya&body=\n  Ism: Ali\n  Telefon: +998 90 000 00 00\n  Makon: Hammom, Basseyn\n  Joy: Toshkent viloyati\n  Maydon: 60\n  Izoh: -\n-- the visitor's own mail app sends it; the site stores nothing",
        },
        marks: ["ism", "tel", "makon", "mailto", "stores nothing"],
      },
    },
    {
      id: "trust",
      kind: "case",
      focus: ["guest", "site"],
      exchange: {
        edge: "pass",
        request: {
          format: "text",
          head: "what the page says about itself",
          body: "photos in v1/img: AI stand-ins until real project photos arrive; no invented projects or reviews\n#boshqaruv: \"Tez kunda · konsepsiya\" (soon, a concept); values are simulated, the service is not sold yet\n#ilhom: 14 licensed photos, the author shown in the lightbox\nmood reel: 3 videos from Pexels and Mixkit, credited in the footer\ngauges of norms in #muhandislik: values verified in v1.5",
        },
        marks: ["AI stand-ins", "konsepsiya", "licensed", "credited"],
      },
    },
    {
      id: "arch",
      kind: "case",
      nodes: {
        gpu: { kind: "worker", at: [4, 0] },
      },
      edges: {
        draw: { from: "guest", to: "gpu", rate: 2 },
      },
      focus: ["guest", "gpu", "site"],
      exchange: {
        edge: "pass",
        request: {
          format: "text",
          head: "v1/  (no bundler, no build step: what is in git is what is served)",
          body: "index.html  styles.css  app.js            the page, one stylesheet, the glue\nvapor.js fog.js steam.js                  hero steam, from the best to the simplest\nspaces3d.js dome.js equip3d.js            three.js scenes, loaded as lazy modules\nblueprints.js systems.js iot.js girih.js mosaic.js   drawings, cutaways and craft\nvendor/  three r170, Lenis (MIT), served from the site itself\nimg/ fonts/ media/                        WebP srcset, self-hosted fonts, 3 short videos",
        },
        marks: ["no build step", "vapor.js", "lazy modules", "vendor/", "WebP srcset"],
      },
    },
    {
      id: "vapor",
      kind: "case",
      focus: ["guest", "gpu"],
      exchange: {
        edge: "draw",
        request: {
          format: "text",
          head: "app.js startFog(): pick the hero steam this device can afford",
          body: "1. vapor.js   GPU stable fluids: advection, vorticity, pressure projection; heat haze bends the photo\n             needs WebGL with half-float render targets, else returns false\n             shaders compile in the background (KHR_parallel_shader_compile), prewarm in 6 ms slices\n2. fog.js     a lighter WebGL shader: two fbm layers and light shafts\n3. steam.js   2D sprite puffs on a canvas\nskipped when navigator.connection.saveData; still frames when prefers-reduced-motion",
        },
        marks: ["stable fluids", "half-float", "KHR_parallel_shader_compile", "fog.js", "saveData", "prefers-reduced-motion"],
      },
    },
    {
      id: "slow",
      kind: "problem",
      nodes: { guest: { state: "slow", load: 95 } },
      focus: ["guest", "gpu"],
      exchange: {
        edge: "draw",
        request: {
          format: "text",
          head: "Lighthouse, mobile, v1 (2026-11-09)",
          body: "performance 55   total blocking time 14.4 s\npage weight 3.6 MB: JPEG photos of 0.3-0.8 MB each, fonts from Google\nthe steam canvas drew at full device resolution, every frame, from the first moment\nmix-blend-mode on the canvas: the browser re-composites the whole hero each frame",
        },
        marks: ["performance 55", "14.4 s", "3.6 MB", "full device resolution", "mix-blend-mode"],
      },
    },
    {
      id: "fast",
      kind: "fix",
      nodes: { guest: { state: "ok", load: 20 } },
      metrics: { weight: 0.65, lh: 100, tbt: 0 },
      focus: ["guest", "gpu", "site"],
      exchange: {
        edge: "draw",
        request: {
          format: "text",
          head: "v1.1 (f0739fe)",
          body: "steam canvas at 35% resolution, 30 fps, starts after load, pauses offscreen and in a hidden tab\nno mix-blend-mode; the fog drifts with transform and opacity only\nresponsive WebP srcset 640-2000 px, regenerated by tools/images.ps1\nfonts self-hosted with preload; the CSP no longer allows Google Fonts\n-- Lighthouse mobile 55 -> 100, page 3.6 -> 0.65 MB, SEO 92 -> 100",
        },
        marks: ["35%", "30 fps", "transform", "WebP", "self-hosted"],
      },
    },
    {
      id: "i18n",
      kind: "fix",
      nodes: {
        tool: { kind: "worker", at: [12, 7] },
      },
      edges: {
        gen: { from: "tool", to: "site", rate: 1 },
      },
      metrics: { langs: 3 },
      focus: ["tool", "site"],
      exchange: {
        edge: "gen",
        request: {
          format: "text",
          head: "node tools/i18n.mjs build",
          body: "source: v1/index.html and 9 section scripts, written in Uzbek\nHTML: a block of text with its inline tags (em, strong, a, br ...) is one piece; alt, aria-label, title too\nJS: single-quoted strings that are text; code, shader and CSS strings are skipped\ndictionaries: i18n/ru.json and i18n/en.json, 609 pieces each\nout: index.ru.html index.en.html app.ru.js vapor.en.js ...  (generated, not in git)\na piece missing from a dictionary: exit 1  \"tarjimasiz bo'lak bor\"",
        },
        marks: ["inline tags", "single-quoted", "609", "not in git", "exit 1"],
      },
    },
    {
      id: "caddy",
      kind: "case",
      nodes: { tool: null },
      focus: ["edge", "site"],
      exchange: {
        edge: "pass",
        request: {
          format: "text",
          head: "deploy/Caddyfile  (TLS and the domain live at the shared edge of dtwin.uz)",
          body: "rewrite /ru /index.ru.html     rewrite /en /index.en.html     redir /ru/ /ru 301\n/*.js /*.css /fonts/* /vendor/*  Cache-Control: public, max-age=31536000, immutable\n/img/* /media/*                 Cache-Control: public, max-age=604800\n/ /index*.html /ru /en /version.txt  Cache-Control: no-cache\nhandle_errors 404 -> redir / 302",
        },
        marks: ["rewrite", "immutable", "604800", "no-cache", "404"],
      },
    },
    {
      id: "deploy",
      kind: "fix",
      nodes: {
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
          head: "bash deploy/deploy.sh",
          body: "git status --porcelain must be empty; HEAD must equal origin/main\nnode tools/i18n.mjs build || stop\ncopy v1/ to a stage; add ?v=<first 8 of the sha> to every .js and .css link\nwrite version.txt = sha; tar | ssh; site -> site.prev, new site in place\ndocker compose up -d; poll https://halvet.dtwin.uz/version.txt 20 x 3 s\nfailed: print the rollback (rm -rf site && mv site.prev site)",
        },
        marks: ["--porcelain", "origin/main", "?v=", "site.prev", "version.txt"],
      },
    },
    {
      id: "demo",
      kind: "case",
      focus: ["owner", "site", "guest"],
      exchange: {
        edge: "ship",
        request: {
          format: "text",
          head: "PR #4: a live demo for wonmor.io/demo/halvet/",
          body: "npm run build:demo   tools/demo-build.mjs -> dist-demo/ from v1/: relative language links,\n                     a Demo badge, the form shows the letter instead of opening mail\nnpm run test:demo    Playwright: every section in uz, ru and en; systems and blueprint tabs,\n                     gallery lightbox, FAQ, form\nnpm run site:screenshots  26 shots into docs/screenshots/\n-- v1/ and deploy/ are unchanged; the repository has no CI workflow, CODEOWNERS asks core to review",
        },
        marks: ["dist-demo", "Demo badge", "Playwright", "26 shots", "no CI workflow"],
      },
    },
    { id: "recap", kind: "recap" },
  ],
  scenarios: [
    {
      id: "csp-style",
      from: "caddy",
      steps: [
        {
          id: "style-blocked",
          kind: "problem",
          nodes: { site: { state: "slow" } },
          metrics: { broken: 1 },
          focus: ["guest", "site"],
          exchange: {
            edge: "pass",
            request: {
              format: "text",
              head: "v1.3, the layers stack in #muhandislik, live on halvet.dtwin.uz",
              body: "<i style=\"--i:3\" class=\"l-screed\">  8 pool layers, soil to water: each took its index from an inline style\nconsole: Refused to apply inline style because it violates the following\n         Content Security Policy directive: \"style-src 'self'\"\n-- every layer falls into the same place; the stack is a pile\n-- on the laptop it looked right: python -m http.server sends no CSP",
            },
            marks: ["style=", "style-src", "same place", "no CSP"],
          },
        },
        {
          id: "style-fix",
          kind: "fix",
          nodes: { site: { state: "ok" } },
          metrics: { broken: 0 },
          focus: ["guest", "site"],
          exchange: {
            edge: "pass",
            request: {
              format: "text",
              head: "52a616e: drop inline style attrs blocked by CSP, index via nth-child",
              body: ".hv-layers__stack i:nth-child(4) { --i: 3 }   the index now comes from the stylesheet\napp.js: a list item takes its index from its position, not from li.style\nanother allowed way: el.style.setProperty('--i', 3), the CSSOM, not an attribute\nrule since then: after every deploy, open the live site and read the console",
            },
            marks: ["nth-child", "setProperty", "live site"],
          },
        },
      ],
    },
    {
      id: "dirty-tree",
      from: "deploy",
      steps: [
        {
          id: "tree-stop",
          kind: "problem",
          edges: { ship: { flow: "fail" } },
          metrics: { blocked: 1 },
          focus: ["owner", "site"],
          exchange: {
            edge: "ship",
            request: {
              format: "text",
              head: "bash deploy/deploy.sh",
              body: "git status --porcelain\n?? sites/\n?? research_notes/\ndeploy to'xtatildi: commit qilinmagan o'zgarish bor\n-- another working session had left research files in the same folder\n-- nothing was shipped: the rule \"only a clean origin/main\" did its job",
            },
            marks: ["--porcelain", "sites/", "to'xtatildi", "nothing was shipped"],
          },
        },
        {
          id: "tree-fix",
          kind: "fix",
          edges: { ship: { flow: "request" } },
          metrics: { blocked: 0 },
          focus: ["owner", "site"],
          exchange: {
            edge: "ship",
            request: {
              format: "text",
              head: ".git/info/exclude  (local to this clone, never committed)",
              body: "sites/\nresearch_notes/\n-- the other session's files stay where they are and stop counting as changes\n-- the check is not weakened: a modified tracked file still stops the deploy",
            },
            marks: [".git/info/exclude", "not weakened"],
          },
        },
      ],
    },
  ],
});
