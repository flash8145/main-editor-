/**
 * UI mode — the progressive-disclosure axis (ADR 001).
 *
 * `easy` and `pro` expose the SAME feature set over the SAME engine; the mode
 * only selects presentation and default hierarchy (presets first, pro controls
 * behind an "Advanced" disclosure). It must never affect project data, the
 * timeline action modules, or render/export output — a project authored in one
 * mode is byte-identical to the same project authored in the other.
 *
 * Orthogonal to `EditorWorkspaceId` ('edit' | 'color' | 'animate') in
 * `editor-workspaces.ts`: the workspace is *what you are doing*, the mode is
 * *how much is spelled out*. Modelling this as a fourth workspace would collide
 * with the per-workspace layout snapshot/restore in the editor store.
 */

export const UI_MODES = ['easy', 'pro'] as const

export type UiMode = (typeof UI_MODES)[number]

/**
 * New users start in Easy. The mode is persisted, so this only applies until
 * the user picks one (MASTERPLAN §5: the beginner is the benchmark).
 */
export const DEFAULT_UI_MODE: UiMode = 'easy'

export function normalizeUiMode(value: unknown): UiMode {
  return value === 'easy' || value === 'pro' ? value : DEFAULT_UI_MODE
}
