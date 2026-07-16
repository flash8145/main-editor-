# Product

## Register

product

## Users

**Two audiences, one app, one engine** (see `docs/adr/001-easy-pro-modes.md`).

**Experienced video editors** — the depth benchmark. They come from Premiere Pro
and DaVinci Resolve and expect those workflows: keyboard-driven, frame-accurate,
dense panels they read at a glance. Their context is a focused editing session,
often hours long, eyes on the preview and timeline, hands on shortcuts. Serving
them is **Pro mode**, and it loses nothing.

**Capable people who are not editors** — the clarity benchmark. They know what
they want the cut to look like but not what a "razor" or a "keyframe" is. They
should be able to build a real edit — trim, text, music, transitions, a look,
export — without a manual and without hunting. Serving them is **Easy mode**.

Easy mode is a *re-presentation of the whole app, not a subset of it*: every
capability stays reachable, the approachable path is simply what you see first
and the expert controls sit one disclosure away. Both audiences want
professional power without an install, a subscription, or cloud uploads. The
headline draw is that projects and media stay local on disk while editing,
analysis, transcription, AI generation, and export all run in the browser.

## Product Purpose

FreeCut is a browser-based, local-first, multi-track video editor. It exists to
give a real NLE that runs entirely in the browser, with a workspace folder on
their own disk as the source of truth (projects, media metadata, thumbnails,
waveforms, transcripts, scene cuts, caches all as plain files).

Success has two faces, and both must hold at once:

- An editor who would otherwise open Premiere chooses FreeCut for a real cut and
  never notices the browser, because playback is frame-accurate, scrubbing is
  responsive, and the tools they reach for by muscle memory are all there.
- Someone who only knows basic editing completes a real edit without asking how,
  and never hits a wall where the answer is "that feature isn't in your mode."

## Brand Personality

Precise and professional. Three words: **precise, confident, calm.** The UI is a
serious instrument, not a consumer toy — in *both* modes. No exclamation, no
whimsy, no mascots; Easy mode is not a costume change.

Voice adapts to the mode without changing character:

- **Pro mode** speaks the language editors already use (ripple, rolling, slip,
  slide, mark in/out, source-time). Precision is the courtesy.
- **Easy mode** speaks plain language for the same actions ("Split" for razor,
  "Trim" for in/out points) and says what a control does before it says what
  it's called. Clarity is the courtesy.

Guiding a first-time user is not hand-holding — it is the same respect for the
user's time that a pro shows by never explaining. The interface projects
confidence by being legible, predictable, and fast for whoever is holding it.

## Anti-references

- **Consumer-cute editors** (CapCut, iMovie) — their *look*: playful mascots,
  rounded candy buttons, emoji, gamified flourishes. FreeCut is a pro tool, not
  a toy, and Easy mode does not change that. Note the split: their
  **approachability is a goal** (see Easy mode), their **aesthetic is not**. We
  take the clear first-run path and the one-click starting points; we leave the
  candy behind.
- **Flashy SaaS dashboards**: gradient heroes, glassmorphism, big-number metric
  cards, marketing-grade decoration inside the working UI.
- **Cramped legacy NLE chrome**: dense to the point of noise, beveled gray
  toolbars, illegible 10px labels. Density here must stay clean and readable.
- **Bare-bones open-source utility look**: default browser controls, unstyled
  forms, no considered visual hierarchy.

## Design Principles

1. **The footage is the hero.** Chrome stays quiet and recedes; the preview and
   the editor's content carry the color and attention. The UI earns pixels only
   when it helps the cut.
2. **Density without noise.** High information density is a feature for the pro
   user, but every panel must stay scannable, aligned, and legible. Clean is not
   the enemy of dense. Density is a Pro-mode default, not a universal one —
   where density would confuse a newcomer, the answer is a better default
   hierarchy, never a removed feature.
3. **Frame-accurate and responsive, always.** Perceived precision is part of the
   brand. Interactions (scrub, zoom, playback, edits) must feel instant and
   exact; sluggishness or imprecision reads as amateur.
4. **Respect muscle memory.** Match the conventions pro editors already carry
   (Remotion-style timing, NLE edit tools, keyboard-first operation). Surprise is
   a cost, not a delight.
5. **Meet the user where they are.** Speak plainly to whoever is holding the
   tool: the editor's own vocabulary in Pro, ordinary words in Easy. Trust the
   user — never decorate, never condescend, never explain what the user already
   knows. Trust is not the same as silence: an unexplained control the user
   cannot decode is a failure, not a display of confidence.
6. **Progressive disclosure over removal.** Complexity is deferred, never
   deleted. Every capability stays reachable in both modes; the mode only
   decides what is shown first and what waits behind "Advanced". A mode that
   dead-ends the user is a bug (ADR 001).

## Accessibility & Inclusion

- **WCAG AA contrast.** Body text holds >=4.5:1 against its panel background;
  large/bold text >=3:1. The current `--muted-foreground` (oklch 0.6) on dark
  panels is borderline and should be verified and bumped toward ink where it
  fails. Placeholder text held to the same 4.5:1.
- Always-dark theme is intentional for long sessions and color-critical work
  (scopes, grading); contrast work happens within the dark ramp, not by adding a
  light mode.
- Honor `prefers-reduced-motion` for panel transitions, scrub overlays, and
  reveals as the system grows (not yet captured as a hard requirement, revisit
  with the user).
