import { describe, expect, it } from 'vite-plus/test'
import { TransitionRegistry } from '../registry'
import { registerIrisTransitions } from './iris'

// gpuTransitionId links each CPU-fallback iris variant to its WebGPU shader
// (infrastructure/gpu-transitions/aperture-masks). Without it, preview playback
// falls back to the slow CPU Canvas-2D path for that transition (bug #9).
const IRIS_VARIANT_IDS = [
  'arrowIris',
  'crossIris',
  'diamondIris',
  'eyeIris',
  'hexagonIris',
  'ovalIris',
  'pentagonIris',
  'squareIris',
  'triangleIris',
] as const

describe('registerIrisTransitions', () => {
  const registry = new TransitionRegistry()
  registerIrisTransitions(registry)

  it('registers all 9 iris-shape variants', () => {
    expect(registry.getIds()).toEqual(expect.arrayContaining([...IRIS_VARIANT_IDS]))
  })

  it.each(IRIS_VARIANT_IDS)(
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
