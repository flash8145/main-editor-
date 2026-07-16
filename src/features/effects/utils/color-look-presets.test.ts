import { describe, it, expect } from 'vite-plus/test'
import { getGpuEffect } from '@/infrastructure/gpu-effects'
import {
  COLOR_ADJUST_CONTROLS,
  COLOR_LOOKS,
  LOOK_OWNED_EFFECT_TYPES,
  resolveActiveLookId,
} from './color-look-presets'

function applied(gpuEffectType: string, params: Record<string, number>, enabled = true) {
  return { gpuEffectType, params, enabled }
}

/**
 * Clone the params — `readonly` on the catalog array does not freeze the nested
 * param objects, so handing a test the live reference lets a mutation rewrite
 * the preset itself (and silently corrupt every later assertion).
 */
function layersOf(lookId: string) {
  const look = COLOR_LOOKS.find((candidate) => candidate.id === lookId)
  if (!look) throw new Error(`missing look: ${lookId}`)
  return look.layers.map((layer) => applied(layer.gpuEffectType, { ...layer.params }))
}

describe('built-in colour looks', () => {
  // A look is only "no new shaders" if every layer names an effect that already
  // exists in the registry — a typo here would fail silently at apply time.
  it('only reference GPU effects that exist in the registry', () => {
    const unknown = COLOR_LOOKS.flatMap((look) =>
      look.layers
        .filter((layer) => !getGpuEffect(layer.gpuEffectType))
        .map((layer) => `${look.id} -> ${layer.gpuEffectType}`),
    )
    expect(unknown).toEqual([])
  })

  it('only set params the referenced effect actually declares', () => {
    const bogus = COLOR_LOOKS.flatMap((look) =>
      look.layers.flatMap((layer) => {
        const def = getGpuEffect(layer.gpuEffectType)
        if (!def) return []
        return Object.keys(layer.params)
          .filter((key) => !(key in def.params))
          .map((key) => `${look.id} -> ${layer.gpuEffectType}.${key}`)
      }),
    )
    expect(bogus).toEqual([])
  })

  it('keep every value inside the effect param min/max', () => {
    // The preview thumbnail lerps default -> target; a value outside the
    // declared range renders differently there than through the real pipeline.
    const outOfRange = COLOR_LOOKS.flatMap((look) =>
      look.layers.flatMap((layer) => {
        const def = getGpuEffect(layer.gpuEffectType)
        if (!def) return []
        return Object.entries(layer.params)
          .filter(([key, value]) => {
            const param = def.params[key]
            if (!param || param.type !== 'number') return false
            const min = param.min ?? Number.NEGATIVE_INFINITY
            const max = param.max ?? Number.POSITIVE_INFINITY
            return value < min || value > max
          })
          .map(([key, value]) => `${look.id} -> ${layer.gpuEffectType}.${key}=${value}`)
      }),
    )
    expect(outOfRange).toEqual([])
  })

  it('covers every look layer and adjust target in the owned-effect set', () => {
    // Applying a look clears LOOK_OWNED_EFFECT_TYPES first. A layer missing from
    // that set would survive the clear and stack onto the next look.
    for (const look of COLOR_LOOKS) {
      for (const layer of look.layers) {
        expect(LOOK_OWNED_EFFECT_TYPES).toContain(layer.gpuEffectType)
      }
    }
    for (const control of COLOR_ADJUST_CONTROLS) {
      expect(LOOK_OWNED_EFFECT_TYPES).toContain(control.gpuEffectType)
    }
  })

  it('maps every adjust control onto a real param of a real effect', () => {
    for (const control of COLOR_ADJUST_CONTROLS) {
      const def = getGpuEffect(control.gpuEffectType)
      expect(def, `${control.id} -> ${control.gpuEffectType}`).toBeTruthy()
      expect(def?.params[control.paramKey], `${control.id} -> ${control.paramKey}`).toBeTruthy()
    }
  })
})

describe('resolveActiveLookId', () => {
  it('identifies an exactly-applied look', () => {
    expect(resolveActiveLookId(layersOf('warm'))).toBe('warm')
    expect(resolveActiveLookId(layersOf('moody'))).toBe('moody')
  })

  it('returns null for an empty stack', () => {
    expect(resolveActiveLookId([])).toBeNull()
  })

  it('returns null once a value drifts off the preset', () => {
    // Nudging the warmth slider means the image is no longer "Warm" — the tile
    // must not stay highlighted.
    const drifted = layersOf('warm')
    drifted[0]!.params.temperature = 0.9
    expect(resolveActiveLookId(drifted)).toBeNull()
  })

  it('returns null when an extra owned effect is stacked on top', () => {
    expect(resolveActiveLookId([...layersOf('warm'), applied('gpu-contrast', { amount: 1.5 })])).toBeNull()
  })

  it('ignores disabled effects', () => {
    const disabled = layersOf('warm').map((effect) => ({ ...effect, enabled: false }))
    expect(resolveActiveLookId(disabled)).toBeNull()
  })

  it('ignores effects outside the look-owned set', () => {
    // A user's own curves grade must not stop the look from reading as active.
    expect(resolveActiveLookId([...layersOf('warm'), applied('gpu-curves', { contrast: 1.2 })])).toBe(
      'warm',
    )
  })
})
