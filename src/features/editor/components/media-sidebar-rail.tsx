import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, LineChart } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/shared/ui/cn'
import { EDITOR_LAYOUT_CSS_VALUES } from '@/config/editor-layout'
import type { EditorSidebarTab } from '@/config/editor-workspaces'

interface MediaSidebarRailCategory {
  id: EditorSidebarTab
  icon: LucideIcon
  label: string
}

interface MediaSidebarRailProps {
  categories: readonly MediaSidebarRailCategory[]
  activeTab: EditorSidebarTab
  leftSidebarOpen: boolean
  keyframeEditorOpen: boolean
  /**
   * Easy mode labels every rail entry and widens the rail to fit (ADR 001).
   * Presentation only — both modes render the same entries.
   */
  isEasyMode: boolean
  onSelectCategory: (id: EditorSidebarTab) => void
  onToggleLeftSidebar: () => void
  onToggleKeyframeEditor: () => void
}

const RAIL_ITEM_BASE =
  'rounded-lg flex items-center transition-[transform,background-color,color] duration-150 active:scale-95'
const RAIL_ITEM_ACTIVE = 'bg-primary text-primary-foreground hover:bg-primary/90'
const RAIL_ITEM_IDLE = 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'

function railItemClass(isActive: boolean, isEasyMode: boolean): string {
  return cn(
    RAIL_ITEM_BASE,
    isEasyMode ? 'w-full flex-col justify-center gap-1 py-1.5' : 'w-9 h-9 justify-center',
    isActive ? RAIL_ITEM_ACTIVE : RAIL_ITEM_IDLE,
  )
}

/**
 * The vertical category rail: panel switcher plus the keyframe-editor toggle.
 *
 * Split out of `MediaSidebar` so that host component stays under the
 * changed-code complexity gate — the rail is a self-contained switcher whose
 * only job is choosing which panel the column shows.
 */
export const MediaSidebarRail = memo(function MediaSidebarRail({
  categories,
  activeTab,
  leftSidebarOpen,
  keyframeEditorOpen,
  isEasyMode,
  onSelectCategory,
  onToggleLeftSidebar,
  onToggleKeyframeEditor,
}: MediaSidebarRailProps) {
  const { t } = useTranslation()

  const collapseLabel = leftSidebarOpen
    ? t('editor.mediaSidebar.collapsePanel')
    : t('editor.mediaSidebar.expandPanel')

  return (
    <div
      className="panel-header border-r border-border flex flex-col items-center flex-shrink-0"
      style={{
        width: isEasyMode
          ? EDITOR_LAYOUT_CSS_VALUES.sidebarRailLabeledWidth
          : EDITOR_LAYOUT_CSS_VALUES.sidebarRailWidth,
      }}
    >
      {/* Header row - aligned with content panel header */}
      <div
        className="flex items-center justify-center border-b border-border w-full"
        style={{ height: EDITOR_LAYOUT_CSS_VALUES.sidebarHeaderHeight }}
      >
        <button
          onClick={onToggleLeftSidebar}
          className="rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          style={{
            width: EDITOR_LAYOUT_CSS_VALUES.sidebarHeaderButtonSize,
            height: EDITOR_LAYOUT_CSS_VALUES.sidebarHeaderButtonSize,
          }}
          data-tooltip={collapseLabel}
          data-tooltip-side="right"
          aria-label={collapseLabel}
        >
          {leftSidebarOpen ? (
            <ChevronLeft className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Easy mode labels each entry (ADR 001): the tooltip is a hover-only
          affordance, which is exactly what a newcomer scanning the rail cannot
          use. Pro keeps the narrow icon-only rail and its tooltips. */}
      <div className={cn('flex flex-col py-1.5', isEasyMode ? 'gap-0.5 w-full px-1' : 'gap-1')}>
        {categories.map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id && leftSidebarOpen && !keyframeEditorOpen
          return (
            <button
              key={id}
              onClick={() => onSelectCategory(id)}
              className={railItemClass(isActive, isEasyMode)}
              data-tooltip={isEasyMode ? undefined : label}
              data-tooltip-side="right"
              aria-label={label}
              aria-pressed={isActive}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {isEasyMode && <span className="text-[10px] leading-tight font-medium">{label}</span>}
            </button>
          )
        })}

        <div className="w-6 border-t border-border mx-auto my-0.5" />

        <button
          onClick={onToggleKeyframeEditor}
          className={railItemClass(keyframeEditorOpen, isEasyMode)}
          data-tooltip={
            isEasyMode
              ? undefined
              : keyframeEditorOpen
                ? t('editor.mediaSidebar.hideKeyframeEditor')
                : t('editor.mediaSidebar.keyframeEditor')
          }
          data-tooltip-side="right"
          aria-label={
            keyframeEditorOpen
              ? t('editor.mediaSidebar.hideKeyframeEditor')
              : t('editor.mediaSidebar.showKeyframeEditor')
          }
        >
          <LineChart className="w-4 h-4 shrink-0" />
          {isEasyMode && (
            <span className="text-[10px] leading-tight font-medium">
              {t('editor.mediaSidebar.keyframeEditorRailLabel')}
            </span>
          )}
        </button>
      </div>
    </div>
  )
})
