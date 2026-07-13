import { describe, expect, it } from 'vite-plus/test'
import { TransitionRegistry } from '../registry'
import { registerWipeTransitions } from './wipe'

// gpuTransitionId links each CPU-fallback wipe variant to its WebGPU shader
// (infrastructure/gpu-transitions). Without it, preview playback falls back
// to the slow CPU Canvas-2D path for that transition (the bug this guards
// against — see docs/bugs.md #9).
const WIPE_MASK_VARIANT_IDS = [
  'bandWipe',
  'centerWipe',
  'edgeWipe',
  'radialWipe',
  'spiralWipe',
  'venetianBlindWipe',
  'xWipe',
] as const

describe('registerWipeTransitions', () => {
  const registry = new TransitionRegistry()
  registerWipeTransitions(registry)

  it('registers the plain wipe plus all 7 wipe-mask variants and clockWipe', () => {
    const ids = registry.getIds()
    expect(ids).toEqual(
      expect.arrayContaining(['wipe', 'clockWipe', ...WIPE_MASK_VARIANT_IDS]),
    )
  })

  it.each(WIPE_MASK_VARIANT_IDS)(
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

  it('only edgeWipe carries a direction (matches the other wipe-mask kinds having none)', () => {
    expect(registry.getDefinition('edgeWipe')?.hasDirection).toBe(true)
    for (const id of WIPE_MASK_VARIANT_IDS) {
      if (id === 'edgeWipe') continue
      expect(registry.getDefinition(id)?.hasDirection, id).toBe(false)
    }
  })
})
