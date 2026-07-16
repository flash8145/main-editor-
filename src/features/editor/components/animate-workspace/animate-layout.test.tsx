import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useSettingsStore } from '@/features/editor/deps/settings'
import { AnimateLayout } from './animate-layout'

const PROJECT = { width: 1920, height: 1080, fps: 30 }

vi.mock('../preview-area', () => ({
  PreviewArea: () => <div data-testid="preview-area" />,
}))

vi.mock('./animate-timeline-strip', () => ({
  AnimateTimelineStrip: () => <div data-testid="animate-timeline-strip" />,
}))

vi.mock('./animation-preset-library', () => ({
  AnimationPresetLibrary: ({ layout }: { layout?: string }) => (
    <div data-testid="animation-preset-library" data-layout={layout ?? 'rail'} />
  ),
}))

vi.mock('@/features/editor/deps/timeline-contract', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/editor/deps/timeline-contract')>()
  return {
    ...actual,
    KeyframeGraphPanel: () => <div data-testid="keyframe-graph-panel" />,
  }
})

describe('AnimateLayout', () => {
  beforeEach(() => {
    // The editing surface depends on the UI mode (ADR 001), so every test
    // states the mode it means rather than riding on whatever the default is.
    useSettingsStore.setState({ uiMode: 'pro' })
  })

  it('gives Pro the dopesheet + curve editor by default, rail-sized preset library beside it', () => {
    render(<AnimateLayout project={PROJECT} />)

    expect(screen.getByTestId('keyframe-graph-panel')).toBeInTheDocument()
    expect(screen.getByTestId('animation-preset-library')).toHaveAttribute('data-layout', 'rail')
    expect(screen.queryByRole('button', { name: /advanced/i })).not.toBeInTheDocument()
  })

  it('leads the Easy surface with presets and defers the dopesheet to Advanced', () => {
    useSettingsStore.setState({ uiMode: 'easy' })
    render(<AnimateLayout project={PROJECT} />)

    // The one-click animations are the primary surface — no curve editor yet,
    // but nothing has been removed (ADR 001): the toggle to reach it is right
    // there.
    expect(screen.getByTestId('animation-preset-library')).toHaveAttribute(
      'data-layout',
      'primary',
    )
    expect(screen.queryByTestId('keyframe-graph-panel')).not.toBeInTheDocument()

    const toggle = screen.getByRole('button', { expanded: false })
    fireEvent.click(toggle)

    expect(screen.getByTestId('keyframe-graph-panel')).toBeInTheDocument()
    expect(screen.getByRole('button', { expanded: true })).toBeInTheDocument()
  })
})
