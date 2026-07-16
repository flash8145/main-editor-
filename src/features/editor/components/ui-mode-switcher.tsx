import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '@/features/editor/deps/settings'
import { cn } from '@/shared/ui/cn'
import { UI_MODES, type UiMode } from '@/config/ui-mode'

const UI_MODE_TOOLTIP_KEYS: Record<UiMode, string> = {
  easy: 'toolbar.uiMode.easyTooltip',
  pro: 'toolbar.uiMode.proTooltip',
}

/**
 * Easy/Pro segmented control (ADR 001).
 *
 * Selects how much is spelled out, not what is available — both modes expose
 * the same features over the same engine, so switching never touches project
 * data, selection, playhead, or render output. Orthogonal to the
 * `WorkspaceSwitcher` beside it (workspace = what you are doing).
 *
 * Radiogroup rather than tablist semantics: this picks one of two states, it
 * does not reveal a tabpanel.
 */
export const UiModeSwitcher = memo(function UiModeSwitcher() {
  const { t } = useTranslation()
  const uiMode = useSettingsStore((s) => s.uiMode)
  const setSetting = useSettingsStore((s) => s.setSetting)

  return (
    <div
      role="radiogroup"
      aria-label={t('toolbar.uiMode.label')}
      className="flex items-center gap-0.5 rounded-md bg-muted p-0.5"
    >
      {UI_MODES.map((mode) => {
        const isActive = uiMode === mode
        const label = t(`toolbar.uiMode.${mode}`)
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={isActive}
            title={t(UI_MODE_TOOLTIP_KEYS[mode])}
            onClick={() => setSetting('uiMode', mode)}
            className={cn(
              'flex h-7 items-center rounded-[5px] px-3 text-xs font-medium transition-colors',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
})
