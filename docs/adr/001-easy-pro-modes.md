# ADR 001 — Easy/Pro modes: progressive disclosure by redesign, not removal

**Status:** accepted (2026-07-14) · Supersedes the "experts only / anti-CapCut" stance in `PRODUCT.md` and `DESIGN.md` (both updated to match — see Consequences).

## Context

MASTERPLAN §5 A2 requires the editor to be usable by someone who only knows basic editing, without losing any pro depth. FreeCut's own product docs currently forbid this: `PRODUCT.md` targets "experienced video editors", lists CapCut/iMovie under **Anti-references** ("FreeCut is a pro tool, not a toy"), and its Design Principle 5 is *"Expert confidence, not hand-holding. Trust the user; don't over-explain."* That stance is now stale — but the *taste* behind it (precise, calm, no whimsy, dark-only) is worth keeping.

The owner (the project's beginner-UX benchmark) set the direction explicitly: **every feature must remain available in Easy mode**, presented cleanly with a Canva-style sidebar. Two surfaces were called out as unusable today:

- **Keyframes/animation** — "i dont know how to apply keyframe and how to edit it".
- **Color grading** — "very complex".

## Decision

**Easy mode is a re-presentation of the whole app, not a subset of it.** No capability is removed in Easy mode. What changes is the *default hierarchy*: the approachable path is primary and visible; the expert path is one disclosure away, unchanged.

1. **`uiMode: 'easy' | 'pro'` is an orthogonal axis**, not a fourth workspace. `EditorWorkspaceId` stays the closed `'edit' | 'color' | 'animate'` union; `uiMode` sits beside it. Defined in `config/ui-mode.ts` (mirroring `config/editor-layout.ts`'s `DEFAULT_*` + `normalize*` idiom) and persisted in `features/settings/stores/settings-store.ts` as a sibling to `editorDensity`. **No schema version bump** — a `persist` migration exists to *change* an already-stored value; `uiMode` is a new field, so the `merge` normalizer lands existing users on the default. Default `easy` on first run; persisted thereafter. Toggle is visible in the toolbar (a mode switch must be discoverable) and mirrored in Settings → General.

2. **Same engine, same project files, switch anytime.** `uiMode` may never affect project data, the timeline action modules, or render output — it only selects presentation. This mirrors the existing `WorkspaceSwitcher` contract ("applies a panel layout preset without touching selection, playhead, or project state").

3. **The disclosure pattern, applied uniformly** to every complex surface:
   - **Presets first** — a visual, one-click gallery is the primary surface.
   - **Then plain sliders** — a few named controls in human words.
   - **Then "Advanced"** — today's pro controls, *re-parented verbatim behind a disclosure*. Pro components are reused, never forked, so there is no second UI to maintain and no drift.

4. **Animate — invert the hierarchy (the headline fix).** `AnimationPresetLibrary` already ships 20 one-click animations (entrance/exit/emphasis: fade, slide×4, pop, zoom, spin, bounce, pulse, shake, wobble, flash) with animated thumbnails, committing through the undo-integrated `addKeyframes` path. It is already rendered — but `animate-workspace/animate-layout.tsx` gives the dopesheet + curve editor the dominant `flex-1` slot and pins the presets to a narrow right rail. **The easy path exists and is merely buried.** In Easy mode the preset gallery becomes the primary surface and the dopesheet/graph editor moves behind "Advanced". Additionally, animation presets are surfaced on clip selection in the **Edit** workspace, so applying an animation never requires discovering the Animate workspace at all.

5. **Color — ship the missing easy path.** The grade preset gallery today holds **only user-saved presets** (save/apply/delete), so a beginner opens Color to wheels + curves + scopes and an empty gallery. Easy Color becomes: **Looks** (a built-in gallery) → **Adjust** (named sliders) → **Advanced** (today's wheels/curves/scopes, unchanged). Built-in Looks are **parameter bundles over the existing GPU effect registry** — `gpu-brightness`, `gpu-contrast`, `gpu-exposure`, `gpu-saturation`, `gpu-temperature`, `gpu-levels`, `gpu-curves`, `gpu-lut` all already exist. **No new shaders**, preserving the one-implementation invariant (MASTERPLAN §3).

6. **Canva-style navigation.** The 8-panel left rail (`media`/`text`/`shapes`/`effects`/`transitions`/`lottie`/`transcript`/`ai`) keeps all 8 entries in Easy mode but gains labels (not icon-only) and a flyout panel. All 8 tab bodies are already mounted and CSS-toggled, so the flyout is a presentation change.

7. **Plain language via a runtime label-override table**, keyed by existing identifiers and applied when `uiMode === 'easy'` (e.g. "Razor" → "Split"). Tool names live in two places: i18n partials (9 languages) *and* `config/hotkeys.ts` as plain TS constants outside i18n. A single override table covers both without duplicating partial files across 9 languages.

8. **First-run tour** (3–5 steps: import → drag to timeline → cut → animate/effect → export), triggered via the localStorage "seen-once" pattern already proven by the What's-New dialog (`whats-new-seen.ts`, `freecut:whatsNewLastSeen`) under a new `freecut:tourSeen` key.

## Alternatives rejected

- **Easy mode as a feature subset** (hide Lottie/Transcript/AI, hide Color/Animate workspaces). Rejected by the owner: every feature must stay reachable. Hiding also creates a cliff — the moment a user needs a hidden feature, Easy mode becomes a dead end.
- **Easy as a fourth workspace** (`'edit' | 'color' | 'animate' | 'easy'`). Collides with `setWorkspace`'s per-workspace layout snapshot/restore logic and forces a nonsensical "Easy vs Color" choice. Easy/Pro is orthogonal to *what you are doing*.
- **A separate simplified editor app/route.** Two UIs over one engine = permanent drift, double the bugs, and the Easy→Pro graduation path breaks.
- **Duplicating i18n partials into an `easy` namespace per feature.** Would double the translation surface across 9 languages for what is a handful of words.
- **Forking pro panels into easy variants.** Violates the one-implementation spirit; the Advanced disclosure re-parents the *same* components instead.
- **A light/friendly theme for Easy mode.** `DESIGN.md` is dark-only by policy and that policy stands — clarity comes from hierarchy and language, not from a softer palette.

## Consequences

- **`PRODUCT.md` and `DESIGN.md` are rewritten to a dual-audience stance** ("pro engine, progressive UI"). The anti-CapCut *aesthetic* guardrails (no candy buttons, no emoji, no gamified flourishes, no whimsy) and the dark-only ramp **stay**; only the "experts only / no hand-holding / don't explain" audience stance is replaced. Easy mode must still look like a precise instrument.
- **New content to author:** a built-in Looks library (param bundles, no shaders) and tour copy. `docs/pages/01-getting-started.ts` is the source for tour wording.
- **`uiMode` must never leak into project data or render output.** Any PR that makes render/export depend on `uiMode` is a bug.
- The WCAG AA `--muted-foreground` issue flagged in both docs (`oklch(0.6)`, borderline ~4.8:1) is **A3 scope**, not A2 — but Easy mode must not stack opacity on `text-muted-foreground` (already a documented DESIGN.md "don't").
- `npm run verify` (boundaries, deps contracts, edge budgets) stays green per slice; a new `uiMode` read across features goes through `deps/` contracts like any other cross-feature value.

## Delivery slices

Each slice ends runnable with `npm run verify` green (MASTERPLAN §5).

| Slice | Scope |
|---|---|
| **A2a** | This ADR + `uiMode` infrastructure (settings `version: 3`, editor-store wiring, toolbar toggle + Settings→General) + `PRODUCT.md`/`DESIGN.md` rewrite |
| **A2b** | Canva-style rail (labels + flyout) + simple-by-default layout (advanced docks on demand) |
| **A2c** ✅ | **Easy Animate** — inverted `animate-layout` hierarchy (presets primary, dopesheet behind Advanced); the same `AnimationPresetLibrary` also surfaced as an "Animate" tab on clip selection in the Edit workspace (Properties sidebar), Easy-only, via a new `embedded` layout variant. Pro is pixel-identical to before |
| **A2d** ✅ | **Easy Color** — built-in Looks gallery (`color-look-presets.ts`, param bundles over existing GPU effects, no new shaders) + Adjust sliders + Advanced disclosure revealing the unchanged Pro dock |
| **A2e** | Plain-language label-override table |
| **A2f** | First-run tour |
| **A2g** | Deferred A1 bugs #2 (Add-Effect truncation) / #3 (workspace dead space) / #7 (mediabunny VideoSample GC leak) + the 10-task friction audit |
