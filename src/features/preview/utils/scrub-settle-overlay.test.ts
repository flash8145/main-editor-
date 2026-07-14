import { describe, it, expect } from 'vite-plus/test'
import { shouldRedrawSettledScrubOverlay } from './scrub-settle-overlay'

describe('shouldRedrawSettledScrubOverlay', () => {
  // Regression for bug #8: a ruler hover-skim shows a previewFrame that is
  // never committed to currentFrame. On mouse-leave (settle) the overlay is
  // still the visible layer, so it must be redrawn to currentFrame — otherwise
  // it is orphaned on the stale skimmed frame until the next play.
  it('redraws when the overlay is already the visible layer', () => {
    expect(
      shouldRedrawSettledScrubOverlay({
        showFastScrubOverlay: true,
        requiresRenderedPath: false,
      }),
    ).toBe(true)
  })

  it('redraws when a rendered overlay is required (forced / high-fidelity backward)', () => {
    expect(
      shouldRedrawSettledScrubOverlay({
        showFastScrubOverlay: false,
        requiresRenderedPath: true,
      }),
    ).toBe(true)
  })

  it('does not force the overlay when neither the overlay is visible nor a rendered path is required', () => {
    // Falls through to the hide-and-reveal-Player settle path.
    expect(
      shouldRedrawSettledScrubOverlay({
        showFastScrubOverlay: false,
        requiresRenderedPath: false,
      }),
    ).toBe(false)
  })
})
