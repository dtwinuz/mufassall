# mufassall

**Systems and business processes, step by step, in a live scene.** Each lesson is one problem and its fix: requests move across an isometric scene, nodes fail, numbers change, and every step shows exactly what changed.

Languages: O'zbekcha · Русский · English. Site: https://mufassall.dtwin.uz (soon).

## Run locally

```bash
pnpm install
pnpm dev          # http://localhost:4381/uz/
pnpm check        # typecheck, tests, i18n, build, leak-guard
```

Node 22.12+ and pnpm 10 (`corepack enable`).

## Layout

| Path | What |
|---|---|
| `packages/scene-schema` | Lesson format: steps are patches over the previous scene; `resolve` folds them, `diff` explains a step. Strict validation in `./validate`. |
| `packages/scene-engine` | React player: isometric SVG scene, packet layer, metric tiles, step panel, keyboard and progress. |
| `content/public/<slug>` | A lesson: `lesson.ts` (scene) + `uz.ts`, `ru.ts`, `en.ts` (texts, type-checked against the scene ids). |
| `apps/web` | Astro static site, one page per language and lesson. |
| `tools/` | `check-i18n` and `leak-guard` (the public build must never carry internal data). |
| `docs/` | Teardown of the format, references, architecture, roadmap, ADRs. |

## Writing a lesson

1. Copy `content/public/callbacks`, rename the slug, and register it in `content/index.ts`.
2. Every step names its kind (`problem`, `fix`, `case`, `recap`) and only what changes.
3. Write all three languages; `pnpm test` fails on any missing text.
4. Numbers in a lesson are a model scenario and are labelled as such in the player.

## Public and internal content

This repository holds only public lessons. Company-specific lessons live in a private repository and are served by role; secrets are referenced as `{{secret:key}}` and resolved server-side, never shipped. CI runs `leak-guard` on every build.

## Licence

Code: [MIT](LICENSE). Lesson texts and scenes in `content/`: [CC BY-SA 4.0](content/LICENSE).
