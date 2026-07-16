import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import { ErrorBoundary } from '@/app/error-boundary'
import { KeyframeGraphPanel } from '@/features/editor/deps/timeline-contract'
import { useSettingsStore } from '@/features/editor/deps/settings'
import { cn } from '@/shared/ui/cn'
import { PreviewArea } from '../preview-area'
import { AnimateTimelineStrip } from './animate-timeline-strip'
import { AnimationPresetLibrary } from './animation-preset-library'

interface AnimateLayoutProps {
  project: {
    width: number
    height: number
    fps: number
  }
}

const noop = () => {}

function DopesheetPanel() {
  return (
    <ErrorBoundary level="feature">
      <KeyframeGraphPanel
        isOpen
        splitView
        showCloseButton={false}
        onToggle={noop}
        onClose={noop}
        placement="side"
      />
    </ErrorBoundary>
  )
}

/**
 * Pro surface: the dopesheet + curve editor own the space and the preset
 * library sits in its rail — the layout an editor who works in keyframes wants.
 */
const ProAnimateSurface = memo(function ProAnimateSurface({ project }: AnimateLayoutProps) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden border-t border-border">
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DopesheetPanel />
      </div>
      <ErrorBoundary level="feature">
        <AnimationPresetLibrary canvas={project} />
      </ErrorBoundary>
    </div>
  )
})

/**
 * Easy surface: the same preset library, promoted to the primary surface, with
 * the dopesheet/curve editor behind an Advanced disclosure (ADR 001).
 *
 * The inversion is the point: the one-click animations already existed, but as
 * a narrow rail beside a dopesheet that dominated the screen — which is why
 * "apply an animation" read as "learn the curve editor first". Nothing is
 * removed; Advanced reveals the identical panel Pro shows by default.
 */
const EasyAnimateSurface = memo(function EasyAnimateSurface({
  project,
  advancedOpen,
  onToggleAdvanced,
}: AnimateLayoutProps & { advancedOpen: boolean; onToggleAdvanced: () => void }) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <ErrorBoundary level="feature">
          <AnimationPresetLibrary canvas={project} layout="primary" />
        </ErrorBoundary>
        {advancedOpen && (
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-l border-border">
            <DopesheetPanel />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onToggleAdvanced}
        aria-expanded={advancedOpen}
        className="flex shrink-0 items-center gap-1.5 border-t border-border px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDown
          className={cn('h-3.5 w-3.5 transition-transform', !advancedOpen && '-rotate-90')}
        />
        {t('editor.animateStages.advancedToggle')}
      </button>
    </div>
  )
})

/**
 * Animate workspace layout: a fixed column of a small preview, the shared mini
 * timeline (film tiles + IO bar + ruler + track lanes + playhead — the same
 * primitives the Color workspace uses) for selecting the animation target and
 * scrubbing context, and the editing surface filling the rest. Mirrors the
 * Color workspace's imperative-branch approach in `editor.tsx` rather than the
 * resizable preview/timeline split.
 *
 * Only the editing surface flips with the UI mode (ADR 001) — the preview and
 * strip above it are shared, so switching modes never disturbs them.
 */
export const AnimateLayout = memo(function AnimateLayout({ project }: AnimateLayoutProps) {
  const isEasyMode = useSettingsStore((s) => s.uiMode) === 'easy'
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // With the dopesheet collapsed, Easy's preset list is short and would leave
  // the freed height as an empty band. Spend it on the preview instead —
  // watching the animation is the point of the workspace. Opening Advanced
  // hands the space back so the curve editor is usable.
  const previewFillsFreedSpace = isEasyMode && !advancedOpen

  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      {/* Small preview — the animation result stays visible while editing */}
      <div
        className={cn(
          'flex min-h-0 flex-col overflow-hidden',
          previewFillsFreedSpace ? 'basis-[58%]' : 'basis-[38%]',
        )}
      >
        <ErrorBoundary level="feature">
          <PreviewArea project={project} />
        </ErrorBoundary>
      </div>

      {/* Mini timeline — select the clip to animate + scrub for context */}
      <ErrorBoundary level="feature">
        <AnimateTimelineStrip />
      </ErrorBoundary>

      {isEasyMode ? (
        <EasyAnimateSurface
          project={project}
          advancedOpen={advancedOpen}
          onToggleAdvanced={() => setAdvancedOpen((open) => !open)}
        />
      ) : (
        <ProAnimateSurface project={project} />
      )}
    </div>
  )
})
