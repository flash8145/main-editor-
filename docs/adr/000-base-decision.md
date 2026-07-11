# ADR 000 — Base editor: FreeCut

**Status:** accepted (2026-07-11) · **Decision is final — do not re-litigate.**

## Context

Goal: a professional web video editor that is also easy for beginners, followed by an AI agent/MCP layer that edits footage by emitting editor operations (it does not generate video). Three open-source candidates were evaluated as the base: FreeCut, OpenCut (local fork "flash-maker"), and OpenReel.

## Decision

Build on **FreeCut** (this repo, MIT). OpenCut and OpenReel are demoted to **read-only parts bins** — ideas may be borrowed, code is never pasted across (see MASTERPLAN §7).

## Evidence

Three independent evaluation layers agreed:

1. **Code audit** — FreeCut: ~395k LOC TypeScript, 461 test files, weekly changelog, and architecture *enforced by scripts* (feature boundaries, dependency contracts, edge budgets, unused-export checks). OpenCut: ~95k LOC, elegant Rust/wgpu core but only one implemented effect. OpenReel: ~210k LOC with a wide feature list but weak coupling — features exist but don't reliably reach the preview.
2. **Owner's hands-on test** — OpenCut smooth but bare; OpenReel buggy (color grades not applying to preview); FreeCut "very good and professional" with only cosmetic UI-size bugs.
3. **Automated hands-on test** — driven live on this machine: media import → timeline (linked A/V, waveform) → grayscale effect applied instantly to preview (RGB-parade scopes confirmed) → export preflight. Headless: `edit.mjs` applied split/addText ops through the real timeline action modules and `render.mjs` produced an H.264 MP4.

The deciding extra: FreeCut's **headless harness** (`src/headless/`, `headless/*.mjs`) already drives the real action modules and export pipeline from outside the UI — the future AI/MCP layer is a thin wrapper instead of a build-from-scratch.

## Alternatives rejected

- **OpenReel as base** — most features on paper, but the integration bugs are the expensive kind (state/pipeline wiring), and it has the weakest test/architecture discipline of the three.
- **OpenCut as base** — best raw performance ceiling (shared Rust/wgpu core), but the editor itself is far from feature-complete; we would rebuild most of what FreeCut already has. Its Rust crates remain the reference if a CPU-bound hot path ever demands WASM.
- **Merging repos / porting libopenshot (C++)** — incompatible architectures, license friction (LGPL), and a third toolchain; guaranteed maintenance nightmare.

## Consequences

- The stack stays TypeScript + WebGPU + WebCodecs + Workers. No C++/Rust unless profiling proves a need (ADR required at that point).
- `npm run verify` (including boundary/contract checks) must stay green — it is the enforced form of the project's "clean, senior-dev-readable architecture" requirement.
- Product stance changes from FreeCut's "experts only": we add progressive disclosure (Easy/Pro modes) per MASTERPLAN §5 A2.
