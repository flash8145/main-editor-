/**
 * Built-in colour looks for Easy mode (ADR 001).
 *
 * A look is nothing but a **bundle of parameters over the existing GPU colour
 * effects** — no new shaders, no second colour pipeline, no new project data.
 * Applying one is exactly equivalent to the user adding those effects by hand in
 * the Pro grade panel, which keeps the one-implementation invariant
 * (MASTERPLAN §3) and means a look stays fully editable afterwards: it leaves
 * ordinary effect entries behind, not an opaque "look" object.
 *
 * Why this exists: the grade panel's preset gallery only ever held the user's
 * *own saved* presets, so a newcomer opened Color to wheels + curves + scopes
 * and an empty gallery — nothing to start from. These are the starting points.
 *
 * Every value stays inside its effect's declared min/max so the preview
 * thumbnails (which lerp default → target) and the real pipeline agree.
 */

export interface ColorLookLayer {
  /** Registry id of an existing GPU effect. */
  gpuEffectType: string
  /** Target params; anything omitted keeps the effect's declared default. */
  params: Record<string, number>
}

export interface ColorLook {
  id: string
  /** i18n key under `effects.colorLooks.items`. */
  labelKey: string
  layers: readonly ColorLookLayer[]
}

export const COLOR_LOOKS: readonly ColorLook[] = [
  {
    id: 'warm',
    labelKey: 'warm',
    layers: [{ gpuEffectType: 'gpu-temperature', params: { temperature: 0.28, tint: 0.04 } }],
  },
  {
    id: 'cool',
    labelKey: 'cool',
    layers: [{ gpuEffectType: 'gpu-temperature', params: { temperature: -0.28, tint: -0.03 } }],
  },
  {
    id: 'vivid',
    labelKey: 'vivid',
    layers: [
      { gpuEffectType: 'gpu-saturation', params: { amount: 1.35 } },
      { gpuEffectType: 'gpu-contrast', params: { amount: 1.15 } },
    ],
  },
  {
    id: 'muted',
    labelKey: 'muted',
    layers: [
      { gpuEffectType: 'gpu-saturation', params: { amount: 0.65 } },
      { gpuEffectType: 'gpu-contrast', params: { amount: 0.94 } },
    ],
  },
  {
    id: 'bright',
    labelKey: 'bright',
    layers: [
      { gpuEffectType: 'gpu-exposure', params: { exposure: 0.32 } },
      { gpuEffectType: 'gpu-contrast', params: { amount: 0.96 } },
    ],
  },
  {
    id: 'moody',
    labelKey: 'moody',
    layers: [
      { gpuEffectType: 'gpu-contrast', params: { amount: 1.28 } },
      { gpuEffectType: 'gpu-saturation', params: { amount: 0.78 } },
      { gpuEffectType: 'gpu-temperature', params: { temperature: -0.14 } },
    ],
  },
  {
    id: 'blackAndWhite',
    labelKey: 'blackAndWhite',
    layers: [
      { gpuEffectType: 'gpu-grayscale', params: { amount: 1 } },
      { gpuEffectType: 'gpu-contrast', params: { amount: 1.12 } },
    ],
  },
  {
    id: 'sepia',
    labelKey: 'sepia',
    layers: [{ gpuEffectType: 'gpu-sepia', params: { amount: 1 } }],
  },
]

/**
 * The plain-language adjust sliders Easy mode shows under the look gallery.
 * Each maps 1:1 onto a single existing GPU effect param — "Warmth" is simply
 * `gpu-temperature.temperature` in words the user already has.
 */
export interface ColorAdjustControl {
  id: string
  /** i18n key under `effects.colorLooks.adjust`. */
  labelKey: string
  gpuEffectType: string
  paramKey: string
}

/**
 * The effect types the look gallery and the adjust sliders own between them.
 *
 * Looks are mutually exclusive starting points, so applying one clears these
 * before writing the new values — otherwise picking Warm then Cool would stack
 * two `gpu-temperature` passes that fight each other. Anything outside this set
 * (curves, wheels, qualifiers, a user's own effects) is never touched.
 */
export const LOOK_OWNED_EFFECT_TYPES: readonly string[] = Array.from(
  new Set([
    ...COLOR_LOOKS.flatMap((look) => look.layers.map((layer) => layer.gpuEffectType)),
    'gpu-exposure',
    'gpu-contrast',
    'gpu-saturation',
    'gpu-temperature',
  ]),
)

interface AppliedEffectLike {
  gpuEffectType: string
  enabled: boolean
  params: Record<string, unknown>
}

function paramsMatch(target: Record<string, number>, actual: Record<string, unknown>): boolean {
  return Object.entries(target).every(([key, value]) => {
    const found = actual[key]
    return typeof found === 'number' && Math.abs(found - value) < 1e-3
  })
}

/**
 * Which built-in look the current effect stack represents, or `null` for none.
 *
 * A look matches when every one of its layers is present and enabled with the
 * look's values, and the stack carries no *other* look-owned effect — that
 * second half matters: without it, tuning an adjust slider would leave the old
 * look tile highlighted even though the image no longer matches it.
 */
export function resolveActiveLookId(effects: readonly AppliedEffectLike[]): string | null {
  const owned = effects.filter(
    (effect) => effect.enabled && LOOK_OWNED_EFFECT_TYPES.includes(effect.gpuEffectType),
  )
  if (owned.length === 0) return null

  for (const look of COLOR_LOOKS) {
    if (owned.length !== look.layers.length) continue
    const matched = look.layers.every((layer) =>
      owned.some(
        (effect) =>
          effect.gpuEffectType === layer.gpuEffectType && paramsMatch(layer.params, effect.params),
      ),
    )
    if (matched) return look.id
  }
  return null
}

export const COLOR_ADJUST_CONTROLS: readonly ColorAdjustControl[] = [
  {
    id: 'exposure',
    labelKey: 'exposure',
    gpuEffectType: 'gpu-exposure',
    paramKey: 'exposure',
  },
  {
    id: 'contrast',
    labelKey: 'contrast',
    gpuEffectType: 'gpu-contrast',
    paramKey: 'amount',
  },
  {
    id: 'saturation',
    labelKey: 'saturation',
    gpuEffectType: 'gpu-saturation',
    paramKey: 'amount',
  },
  {
    id: 'warmth',
    labelKey: 'warmth',
    gpuEffectType: 'gpu-temperature',
    paramKey: 'temperature',
  },
]
