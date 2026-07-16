import { memo, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Undo2 } from 'lucide-react'
import type { TimelineItem } from '@/types/timeline'
import type { GpuEffect, ItemEffect } from '@/types/effects'
import { getGpuEffect, getGpuEffectDefaultParams } from '@/infrastructure/gpu-effects'
import { useTimelineStore } from '@/features/effects/deps/timeline-contract'
import { SliderInput } from '@/shared/ui/property-controls'
import { Button } from '@/components/ui/button'
import { cn } from '@/shared/ui/cn'
import {
  COLOR_ADJUST_CONTROLS,
  COLOR_LOOKS,
  LOOK_OWNED_EFFECT_TYPES,
  resolveActiveLookId,
  type ColorLook,
} from '@/features/effects/utils/color-look-presets'
import { EffectThumbnail } from './effect-thumbnail'

function gpuEntriesOf(item: TimelineItem | undefined) {
  const out: Array<{ entry: ItemEffect; effect: GpuEffect }> = []
  for (const entry of item?.effects ?? []) {
    if (entry.effect.type === 'gpu-effect') out.push({ entry, effect: entry.effect })
  }
  return out
}

interface ColorLooksSectionProps {
  items: TimelineItem[]
}

/**
 * Easy-mode colour: a gallery of built-in looks over plain adjust sliders
 * (ADR 001).
 *
 * Both write ordinary GPU effect entries through the same actions the Pro grade
 * panel uses, so a look is a starting point rather than a mode — switch to Pro
 * (or open Advanced) and the wheels/curves show exactly what the look did.
 */
export const ColorLooksSection = memo(function ColorLooksSection({
  items,
}: ColorLooksSectionProps) {
  const { t } = useTranslation()
  const addEffects = useTimelineStore((s) => s.addEffects)
  const updateEffect = useTimelineStore((s) => s.updateEffect)
  const removeEffect = useTimelineStore((s) => s.removeEffect)
  const [hoveredLookId, setHoveredLookId] = useState<string | null>(null)

  const primaryItem = items[0]
  const gpuEntries = useMemo(() => gpuEntriesOf(primaryItem), [primaryItem])

  const activeLookId = useMemo(
    () =>
      resolveActiveLookId(
        gpuEntries.map(({ entry, effect }) => ({
          gpuEffectType: effect.gpuEffectType,
          enabled: entry.enabled,
          params: effect.params,
        })),
      ),
    [gpuEntries],
  )

  /** Drop every look-owned effect from every selected item. */
  const clearOwnedEffects = useCallback(() => {
    for (const item of items) {
      for (const { entry, effect } of gpuEntriesOf(item)) {
        if (LOOK_OWNED_EFFECT_TYPES.includes(effect.gpuEffectType)) {
          removeEffect(item.id, entry.id)
        }
      }
    }
  }, [items, removeEffect])

  const handleApplyLook = useCallback(
    (look: ColorLook) => {
      // Looks are mutually exclusive: clear what a previous look (or the adjust
      // sliders) wrote before laying down the new one, so Warm→Cool swaps
      // instead of stacking two temperature passes.
      clearOwnedEffects()
      // One batched call so the whole selection is a single undo step.
      addEffects(
        items.map((item) => ({
          itemId: item.id,
          effects: look.layers.map(
            (layer) =>
              ({
                type: 'gpu-effect',
                gpuEffectType: layer.gpuEffectType,
                params: { ...getGpuEffectDefaultParams(layer.gpuEffectType), ...layer.params },
              }) as GpuEffect,
          ),
        })),
      )
    },
    [addEffects, clearOwnedEffects, items],
  )

  /** Current value of an adjust slider = the live effect param, else its default. */
  const adjustValue = useCallback(
    (gpuEffectType: string, paramKey: string): number => {
      const match = gpuEntries.find(({ effect }) => effect.gpuEffectType === gpuEffectType)
      const live = match?.effect.params?.[paramKey]
      if (typeof live === 'number') return live
      const param = getGpuEffect(gpuEffectType)?.params[paramKey]
      return typeof param?.default === 'number' ? param.default : 0
    },
    [gpuEntries],
  )

  const handleAdjust = useCallback(
    (gpuEffectType: string, paramKey: string, value: number) => {
      const missing: Array<{ itemId: string; effects: GpuEffect[] }> = []
      for (const item of items) {
        const match = gpuEntriesOf(item).find(({ effect }) => effect.gpuEffectType === gpuEffectType)
        if (match) {
          updateEffect(item.id, match.entry.id, {
            effect: { ...match.effect, params: { ...match.effect.params, [paramKey]: value } },
          })
          continue
        }
        // First touch of this slider — materialise the effect at its defaults
        // with just this param set, exactly as adding it by hand would.
        missing.push({
          itemId: item.id,
          effects: [
            {
              type: 'gpu-effect',
              gpuEffectType,
              params: { ...getGpuEffectDefaultParams(gpuEffectType), [paramKey]: value },
            } as GpuEffect,
          ],
        })
      }
      if (missing.length > 0) addEffects(missing)
    },
    [addEffects, items, updateEffect],
  )

  const hasOwnedEffects = gpuEntries.some(({ effect }) =>
    LOOK_OWNED_EFFECT_TYPES.includes(effect.gpuEffectType),
  )

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {t('effects.colorLooks.title')}
          </h3>
          {hasOwnedEffects && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={clearOwnedEffects}
            >
              <Undo2 className="h-3 w-3" />
              {t('effects.colorLooks.reset')}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-2">
          {COLOR_LOOKS.map((look) => {
            const isActive = activeLookId === look.id
            return (
              <button
                key={look.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleApplyLook(look)}
                onMouseEnter={() => setHoveredLookId(look.id)}
                onMouseLeave={() => setHoveredLookId(null)}
                className={cn(
                  'group flex flex-col items-center gap-1 rounded-md border p-1 text-[10px] transition-colors',
                  isActive
                    ? 'border-primary bg-secondary/40 text-foreground'
                    : 'border-border/60 text-muted-foreground hover:border-border hover:bg-secondary/40 hover:text-foreground',
                )}
              >
                <EffectThumbnail
                  effects={look.layers}
                  active={hoveredLookId === look.id}
                  className="h-auto w-full rounded-[3px]"
                />
                <span className="w-full truncate text-center leading-tight">
                  {t(`effects.colorLooks.items.${look.labelKey}`)}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t('effects.colorLooks.adjustTitle')}
        </h3>
        <div className="flex flex-col gap-1.5">
          {COLOR_ADJUST_CONTROLS.map((control) => {
            const def = getGpuEffect(control.gpuEffectType)
            const param = def?.params[control.paramKey]
            if (!param || param.type !== 'number') return null
            return (
              <SliderInput
                key={control.id}
                label={t(`effects.colorLooks.adjust.${control.labelKey}`)}
                value={adjustValue(control.gpuEffectType, control.paramKey)}
                min={param.min ?? 0}
                max={param.max ?? 1}
                step={param.step ?? 0.01}
                onChange={(v) => handleAdjust(control.gpuEffectType, control.paramKey, v)}
              />
            )
          })}
        </div>
      </section>
    </div>
  )
})
