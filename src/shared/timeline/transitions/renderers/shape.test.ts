import { describe, expect, it } from 'vite-plus/test'
import { TransitionRegistry } from '../registry'
import { registerShapeTransitions } from './shape'

// gpuTransitionId links each CPU-fallback shape variant to its WebGPU shader
// (infrastructure/gpu-transitions/aperture-masks). Without it, preview playback
// falls back to the slow CPU Canvas-2D path for that transition (bug #9).
const SHAPE_VARIANT_IDS = [
  'boxShape',
  'heartShape',
  'starShape',
  'triangleLeftShape',
  'triangleRightShape',
] as const

describe('registerShapeTransitions', () => {
  const registry = new TransitionRegistry()
  registerShapeTransitions(registry)

  it('registers all 5 shape variants', () => {
    expect(registry.getIds()).toEqual(expect.arrayContaining([...SHAPE_VARIANT_IDS]))
  })

  it.each(SHAPE_VARIANT_IDS)(
    '"%s" has a gpuTransitionId matching its own registry id (GPU-backed, not CPU-fallback)',
    (id) => {
      const renderer = registry.getRenderer(id)
      expect(renderer, `${id} renderer should be registered`).toBeDefined()
      expect(renderer?.gpuTransitionId, `${id} should set gpuTransitionId`).toBe(id)
      expect(typeof renderer?.renderCanvas, `${id} should keep a Canvas 2D fallback`).toBe(
        'function',
      )
    },
  )
})
