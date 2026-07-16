import { lazy, memo, Suspense, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Palette } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useSelectionStore } from '@/shared/state/selection'
import { useItemsStore } from '@/features/editor/deps/timeline-store'
import { KeyframeGraphPanel } from '@/features/editor/deps/timeline-contract'
import { useSettingsStore } from '@/features/editor/deps/settings'
import { addAdjustmentLayer } from '@/features/editor/utils/add-adjustment-layer'
import { cn } from '@/shared/ui/cn'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { TimelineItem } from '@/types/timeline'

const LazyColorGradeSection = lazy(() =>
  import('@/features/editor/deps/effects-contract').then((module) => ({
    default: module.ColorGradeSection,
  })),
)
const LazyEffectsSection = lazy(() =>
  import('@/features/editor/deps/effects-contract').then((module) => ({
    default: module.EffectsSection,
  })),
)
const LazyColorLooksSection = lazy(() =>
  import('@/features/editor/deps/effects-contract').then((module) => ({
    default: module.ColorLooksSection,
  })),
)

/**
 * Color workspace inspector: always-visible grade controls (wheels + curves)
 * on top, with the remaining effect stack below. Shown in place of the
 * regular clip panel while the Color workspace is active.
 */
const COLOR_PANEL_EFFECT_TYPES = ['gpu-color-wheels', 'gpu-curves'] as const

interface ColorGradePanelProps {
  layout?: 'sidebar' | 'dock'
}

export const ColorGradePanel = memo(function ColorGradePanel({
  layout = 'sidebar',
}: ColorGradePanelProps) {
  const { t } = useTranslation()
  const isEasyMode = useSettingsStore((s) => s.uiMode) === 'easy'
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const selectedItemIds = useSelectionStore((s) => s.selectedItemIds)
  const visualItems = useItemsStore(
    useShallow(
      useCallback(
        (s) => {
          const items: TimelineItem[] = []
          for (const itemId of selectedItemIds) {
            const item = s.itemById[itemId]
            if (item && item.type !== 'audio') {
              items.push(item)
            }
          }
          return items
        },
        [selectedItemIds],
      ),
    ),
  )

  const handleCreateAdjustmentLayer = useCallback(() => {
    addAdjustmentLayer(undefined, t('editor.colorPanel.adjustmentLayerLabel'))
  }, [t])
  const handleKeepKeyframesOpen = useCallback(() => {
    // The Color page owns this dock; the shared keyframe editor needs a close
    // callback for its sidebar placement but the color lane is intentionally fixed.
  }, [])

  const hasVisualSelection = useMemo(() => visualItems.length > 0, [visualItems])

  if (!hasVisualSelection) {
    return (
      <div className="flex h-full min-h-[12rem] flex-col items-center justify-center gap-2 px-4 py-10 text-center">
        <Palette className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-xs text-muted-foreground">{t('editor.colorPanel.emptyState')}</p>
      </div>
    )
  }

  const sectionClassName = layout === 'dock' ? 'min-h-0 overflow-hidden' : undefined

  if (layout === 'dock' && isEasyMode) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {/* Looks first: the gallery is what a newcomer can actually start from.
            The Pro dock (wheels + curves + effect stack + keyframe lane, all at
            once) is the same panel, one disclosure away. (ADR 001) */}
        <ScrollArea className="min-h-0 flex-1">
          <div className="mx-auto w-full max-w-3xl p-3">
            <Suspense fallback={null}>
              <LazyColorLooksSection items={visualItems} />
            </Suspense>
          </div>
        </ScrollArea>

        {advancedOpen && (
          <div className="min-h-0 flex-[2] border-t border-border pt-3">
            <div className="grid h-full min-h-0 grid-cols-[minmax(0,10fr)_minmax(0,3fr)_minmax(0,7fr)] gap-3">
              <Suspense fallback={null}>
                <div className={sectionClassName}>
                  <LazyColorGradeSection
                    items={visualItems}
                    layout="dock"
                    onCreateAdjustmentLayer={handleCreateAdjustmentLayer}
                  />
                </div>
                <div className="min-h-0 overflow-hidden rounded-[3px] border border-border/70 bg-background/35">
                  <LazyEffectsSection
                    items={visualItems}
                    hiddenGpuEffectTypes={COLOR_PANEL_EFFECT_TYPES}
                    layout="dock"
                  />
                </div>
                <div
                  className="min-h-0 overflow-hidden rounded-[3px] border border-border/70 bg-background/35"
                  data-testid="color-keyframes-lane"
                >
                  <KeyframeGraphPanel
                    isOpen={true}
                    placement="side"
                    showCloseButton={false}
                    onClose={handleKeepKeyframesOpen}
                  />
                </div>
              </Suspense>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setAdvancedOpen((open) => !open)}
          aria-expanded={advancedOpen}
          className="flex shrink-0 items-center gap-1.5 border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronDown
            className={cn('h-3.5 w-3.5 transition-transform', !advancedOpen && '-rotate-90')}
          />
          {t('editor.colorPanel.advancedToggle')}
        </button>
      </div>
    )
  }

  if (layout === 'dock') {
    return (
      <div className="grid h-full min-h-0 grid-cols-[minmax(0,10fr)_minmax(0,3fr)_minmax(0,7fr)] gap-3">
        <Suspense fallback={null}>
          <div className={sectionClassName}>
            <LazyColorGradeSection
              items={visualItems}
              layout={layout}
              onCreateAdjustmentLayer={handleCreateAdjustmentLayer}
            />
          </div>
          <div className="min-h-0 overflow-hidden rounded-[3px] border border-border/70 bg-background/35">
            <LazyEffectsSection
              items={visualItems}
              hiddenGpuEffectTypes={COLOR_PANEL_EFFECT_TYPES}
              layout="dock"
            />
          </div>
          <div
            className="min-h-0 overflow-hidden rounded-[3px] border border-border/70 bg-background/35"
            data-testid="color-keyframes-lane"
          >
            <KeyframeGraphPanel
              isOpen={true}
              placement="side"
              showCloseButton={false}
              onClose={handleKeepKeyframesOpen}
            />
          </div>
        </Suspense>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <Suspense fallback={null}>
        <div className={sectionClassName}>
          <LazyColorGradeSection
            items={visualItems}
            layout={layout}
            onCreateAdjustmentLayer={handleCreateAdjustmentLayer}
          />
        </div>
        <div className={sectionClassName}>
          <LazyEffectsSection items={visualItems} hiddenGpuEffectTypes={COLOR_PANEL_EFFECT_TYPES} />
        </div>
      </Suspense>
    </div>
  )
})
