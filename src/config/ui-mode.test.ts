import { describe, it, expect } from 'vite-plus/test'
import { DEFAULT_UI_MODE, normalizeUiMode, UI_MODES } from './ui-mode'

describe('normalizeUiMode', () => {
  it('passes through both valid modes', () => {
    expect(normalizeUiMode('easy')).toBe('easy')
    expect(normalizeUiMode('pro')).toBe('pro')
  })

  it('falls back to the default for absent or unknown persisted values', () => {
    // The persist `merge` normalizer relies on this: a user persisted before
    // uiMode existed has `undefined` here and must land on the default rather
    // than an invalid mode leaking into the UI.
    expect(normalizeUiMode(undefined)).toBe(DEFAULT_UI_MODE)
    expect(normalizeUiMode(null)).toBe(DEFAULT_UI_MODE)
    expect(normalizeUiMode('advanced')).toBe(DEFAULT_UI_MODE)
    expect(normalizeUiMode('')).toBe(DEFAULT_UI_MODE)
    expect(normalizeUiMode(0)).toBe(DEFAULT_UI_MODE)
    expect(normalizeUiMode({ mode: 'pro' })).toBe(DEFAULT_UI_MODE)
  })

  it('always returns a member of UI_MODES', () => {
    for (const value of ['easy', 'pro', 'nonsense', undefined, 42]) {
      expect(UI_MODES).toContain(normalizeUiMode(value))
    }
  })
})
