# Code Tour — how this editor is put together

One page. Read this before touching anything. Deeper context: `../MASTERPLAN.md` (in `D:\motion\`), `docs/adr/`, `CLAUDE.md`, `DESIGN.md`, `PRODUCT.md`.

## The one diagram that matters

```
┌────────────────────────────── UI (React) ──────────────────────────────┐
│  src/features/*  (editor, timeline, preview, effects, media-library,    │
│  export, keyframes, projects, scene-browser, settings, docs, ...)       │
│  Features talk to each other ONLY through their deps/ contract files.   │
└───────────────┬──────────────────────────────────────────────────────────┘
                │ every mutation goes through
┌───────────────▼──────────────────────────────────────────────────────────┐
│  TIMELINE ACTION MODULES — the single write path                         │
│  src/features/timeline/stores/actions/*                                  │
│  (item/keyframe/effect/marker/transform/track actions, split             │
│  bookkeeping, linked-clip cascades, transition repair, undo)             │
└───────┬────────────────────────────────────────────────┬─────────────────┘
        │ Zustand stores                                 │ also driven by
┌───────▼───────────────┐                    ┌───────────▼─────────────────┐
│  RENDER PIPELINE      │                    │  HEADLESS HARNESS           │
│  src/infrastructure/  │◄── same engine ───│  src/headless/ exposes       │
│  gpu-effects,         │                    │  window.freecut.editProject │
│  gpu-compositor;      │                    │  /renderTimeline; driven by │
│  WebCodecs export in  │                    │  headless/*.mjs (Playwright │
│  features/export      │                    │  headless Chrome CLIs)      │
└───────────────────────┘                    └─────────────────────────────┘
```

**The action modules are the spine.** UI buttons, tests, the headless CLI, and (Phase B) the AI agent all mutate the timeline through the same functions. That's what keeps undo/redo, repair logic, and AI edits coherent. Never write to a store around them.

## Directory map

| Path | What lives there |
|---|---|
| `src/features/<name>/` | One product capability per folder: `components/`, `hooks/`, `stores/`, `utils/`, and `deps/` (the ONLY sanctioned way another feature's API enters — contract files, enforced by `npm run check:boundaries` / `check:deps-contracts`) |
| `src/features/timeline/stores/actions/` | All timeline mutations (see diagram). Start here to understand any edit behavior |
| `src/infrastructure/` | Engine-level, feature-agnostic: `gpu-effects/` (effect registry + WGSL-in-TS passes; add effects here), `gpu-compositor/`, `analysis/` (scene detection, optical flow), `browser/` (OPFS, mediabunny sources), `storage/`, `llm/` |
| `src/shared/` | Cross-cutting small utilities (logging, timeline math, typography, project migrations in `shared/projects/migrations`) |
| `src/headless/` | Browser-side harness (`window.freecut`) — UI-less entry that reuses the real engine + action modules |
| `headless/` (repo root) | Node CLI drivers: `render.mjs`, `edit.mjs`, `serve.mjs`, smoke tests. Docs in `headless/README.md` |
| `src/config/` | App config incl. `hotkeys.ts` (all keyboard shortcuts) |
| `src/features/docs/pages/` | The 26-page in-app user guide — doubles as the feature inventory/checklist |
| `scripts/` | The architecture enforcement scripts run by `npm run verify` |

## Key facts

- **Stack:** TypeScript + React + Vite(`vp`) · Zustand · WebGPU (effects/color) · WebCodecs + mediabunny (decode/encode) · Web Workers everywhere heavy · OPFS + File System Access (local-first: a user-chosen workspace folder on disk is the source of truth) · transformers.js for local AI (transcription, TTS, music, semantic search).
- **Projects on disk:** `<workspace>/projects/<id>/project.json` (+ `media/<id>/…`). Schema: `src/types/project.ts`; migrations: `src/shared/projects/migrations` (bump `schemaVersion`).
- **One-implementation invariant:** each effect/transition exists once, in the GPU pipeline, shared by preview AND export. Never add a second implementation of anything.
- **Hotkeys:** Premiere-style — tools V/T/C/R/Y/U, split at cursor `Shift+C`, insert/overwrite `,`/`.`, full map in `src/config/hotkeys.ts`.

## Working here

- Dev: `npm run dev` → http://localhost:5173 (Chrome/Edge only — WebGPU/WebCodecs/FSA).
- Before calling any change done: `npm run verify` (lint, types, boundaries, dep contracts, unused exports, edge budgets, tests, build). **A boundary violation is a failing test.**
- Headless render/edit (no UI): `npm run build` once, then
  `node headless/render.mjs --workspace <dir> --project <id> --out <file>`
  `node headless/edit.mjs --workspace <dir> --project <id> --ops ops.json --out <file>` (dry run without `--out`/`--in-place`).
- New code rules (MASTERPLAN §4): new capability = new feature slice or `infrastructure/` module; tests beside code; delete don't comment out; decisions get a short ADR in `docs/adr/`; copy the structure of a neighboring feature before inventing your own.
- Known gotcha: if `npm run dev` black-screens with an unresolved `lucide-react` icon import, the package install is corrupted — `rm -rf node_modules/lucide-react && npm install`.
