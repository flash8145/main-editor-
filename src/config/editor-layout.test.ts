import { describe, it, expect } from 'vite-plus/test'
import { EDITOR_LAYOUT_CSS_VALUES, getEditorLayoutCssVars, getEditorLayout } from './editor-layout'

/**
 * The layout tokens travel a three-declaration chain: the density preset, the
 * `var(--x)` reference in `EDITOR_LAYOUT_CSS_VALUES`, and the emitter in
 * `getEditorLayoutCssVars`. Nothing type-checks across those three object
 * literals, so wiring a token into only two of them compiles cleanly and then
 * silently resolves to an empty custom property at runtime (the element gets no
 * width/height at all). These tests close that gap.
 */
describe('editor layout CSS var chain', () => {
  it('emits every custom property that EDITOR_LAYOUT_CSS_VALUES references', () => {
    const emitted = new Set(Object.keys(getEditorLayoutCssVars()))

    const missing = Object.entries(EDITOR_LAYOUT_CSS_VALUES)
      .map(([key, value]) => {
        const varName = /^var\((--[^)]+)\)$/.exec(value)?.[1]
        return { key, varName }
      })
      .filter(({ varName }) => varName && !emitted.has(varName))
      .map(({ key, varName }) => `${key} -> ${varName}`)

    expect(missing).toEqual([])
  })

  it('emits a concrete px value for every custom property', () => {
    // A token that lands as `undefinedpx` / `NaNpx` breaks layout just as
    // quietly as a missing one.
    for (const [name, value] of Object.entries(getEditorLayoutCssVars())) {
      expect(value, `${name} should be a px value`).toMatch(/^\d+(\.\d+)?px$/)
    }
  })

  it('gives the labeled (Easy) rail more room than the icon-only (Pro) rail', () => {
    // Easy mode renders a word under each rail icon (ADR 001); if this ever
    // inverts, the labels clip instead of the rail widening.
    const layout = getEditorLayout()
    expect(layout.sidebarRailLabeledWidth).toBeGreaterThan(layout.sidebarRailWidth)
  })
})
