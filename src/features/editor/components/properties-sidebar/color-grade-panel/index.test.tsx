import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { VideoItem } from '@/types/timeline'
import { useSettingsStore } from '@/features/editor/deps/settings'
import { ColorGradePanel } from './index'

const { VIDEO_ITEM } = vi.hoisted(() => ({
  VIDEO_ITEM: {
    id: 'clip-1',
    type: 'video',
    trackId: 'track-1',
    from: 0,
    durationInFrames: 90,
    label: 'clip.mp4',
    src: 'blob:clip',
    mediaId: 'media-1',
  } satisfies VideoItem,
}))

vi.mock('@/features/editor/deps/timeline-store', () => ({
  useItemsStore: (selector: (state: { itemById: Record<string, VideoItem> }) => unknown) =>
    selector({ itemById: { [VIDEO_ITEM.id]: VIDEO_ITEM } }),
}))

vi.mock('@/shared/state/selection', () => ({
  useSelectionStore: (selector: (state: { selectedItemIds: string[] }) => unknown) =>
    selector({ selectedItemIds: [VIDEO_ITEM.id] }),
}))

vi.mock('@/features/editor/deps/effects-contract', () => ({
  ColorGradeSection: ({
    layout,
    onCreateAdjustmentLayer,
  }: {
    layout?: string
    onCreateAdjustmentLayer?: () => void
  }) => (
    <div data-testid="color-grade-section" data-layout={layout}>
      {onCreateAdjustmentLayer ? 'has adjustment action' : null}
    </div>
  ),
  EffectsSection: ({ layout }: { layout?: string }) => (
    <div data-testid="effects-section" data-layout={layout}>
      Add Effect
    </div>
  ),
  ColorLooksSection: () => <div data-testid="color-looks-section">Looks</div>,
}))

vi.mock('@/features/editor/deps/timeline-contract', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/editor/deps/timeline-contract')>()
  return {
    ...actual,
    KeyframeGraphPanel: ({
      isOpen,
      placement,
      showCloseButton,
    }: {
      isOpen: boolean
      placement?: string
      showCloseButton?: boolean
    }) => (
      <div
        data-testid="keyframe-graph-panel"
        data-open={String(isOpen)}
        data-placement={placement}
        data-show-close={String(showCloseButton)}
      />
    ),
  }
})

describe('ColorGradePanel', () => {
  beforeEach(() => {
    // The dock's shape depends on the UI mode (ADR 001), so every test states
    // the mode it means rather than riding on whatever the default is.
    useSettingsStore.setState({ uiMode: 'pro' })
  })

  it('renders the fitted color dock with effects and a persistent keyframes lane', async () => {
    render(<ColorGradePanel layout="dock" />)

    // ColorGradeSection is lazy()-loaded behind Suspense; allow extra time for the
    // dynamic import to resolve under parallel-suite CPU contention.
    const gradeSection = await screen.findByTestId('color-grade-section', {}, { timeout: 5000 })
    expect(gradeSection).toHaveAttribute('data-layout', 'dock')
    expect(gradeSection).toHaveTextContent('has adjustment action')

    expect(screen.getByTestId('effects-section-dock')).toBeInTheDocument()
    expect(screen.getByText('Add Effect')).toBeInTheDocument()

    const keyframesLane = screen.getByTestId('color-keyframes-lane')
    expect(keyframesLane).toBeInTheDocument()

    const keyframePanel = screen.getByTestId('keyframe-graph-panel')
    expect(keyframePanel).toHaveAttribute('data-open', 'true')
    expect(keyframePanel).toHaveAttribute('data-placement', 'side')
    expect(keyframePanel).toHaveAttribute('data-show-close', 'false')
  })

  it('leads the Easy dock with looks and defers the grading controls to Advanced', async () => {
    useSettingsStore.setState({ uiMode: 'easy' })
    render(<ColorGradePanel layout="dock" />)

    // Looks are the surface; wheels/curves/effects/keyframes wait behind the
    // disclosure — but they must still be reachable, not removed (ADR 001).
    await screen.findByTestId('color-looks-section', {}, { timeout: 5000 })
    expect(screen.queryByTestId('color-keyframes-lane')).not.toBeInTheDocument()
    expect(screen.queryByTestId('color-grade-section')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { expanded: false }))

    const gradeSection = await screen.findByTestId('color-grade-section', {}, { timeout: 5000 })
    expect(gradeSection).toHaveAttribute('data-layout', 'dock')
    expect(screen.getByTestId('color-keyframes-lane')).toBeInTheDocument()
    expect(screen.getByRole('button', { expanded: true })).toBeInTheDocument()
  })

  it('keeps the sidebar variant stacked without the dock keyframes lane', async () => {
    render(<ColorGradePanel />)

    await waitFor(() => expect(screen.getByTestId('color-grade-section')).toBeInTheDocument(), {
      timeout: 5000,
    })
    expect(screen.queryByTestId('color-keyframes-lane')).not.toBeInTheDocument()
    expect(screen.queryByTestId('keyframe-graph-panel')).not.toBeInTheDocument()
  })
})
