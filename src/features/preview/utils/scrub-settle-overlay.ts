export interface ScrubSettleOverlayInput {
  /** The fast-scrub overlay is currently the visible layer. */
  showFastScrubOverlay: boolean
  /**
   * A rendered overlay is required for this frame regardless of the current
   * layer (forced overlay, or high-fidelity backward preview).
   */
  requiresRenderedPath: boolean
}

/**
 * On scrub/skim settle (`previewFrame` → null), decides whether the fast-scrub
 * overlay must stay the visible layer and be redrawn to `currentFrame` instead
 * of being hidden in favor of the DOM Player.
 *
 * Returns `true` when a rendered overlay is required OR the overlay is already
 * the visible layer. The latter is essential: a ruler hover-skim previews a
 * `previewFrame` that is never committed to `currentFrame`, so on mouse-leave
 * the overlay would otherwise be orphaned on the stale skimmed frame with no
 * later edit or seek repainting it (only play force-clears it). Redrawing to
 * `currentFrame` keeps the visible layer tracking the playhead. (bug #8)
 */
export function shouldRedrawSettledScrubOverlay({
  showFastScrubOverlay,
  requiresRenderedPath,
}: ScrubSettleOverlayInput): boolean {
  return showFastScrubOverlay || requiresRenderedPath
}
