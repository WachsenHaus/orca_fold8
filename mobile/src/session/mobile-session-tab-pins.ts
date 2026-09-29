import type { SessionTabPinOverrides } from '../storage/session-tab-pins'
import type { MobileSessionTab } from './mobile-session-route-types'

export type MobileSessionTabPins = { orderedTabs: MobileSessionTab[] }

export function isMobileSessionTabPinned(
  tab: MobileSessionTab,
  overrides: SessionTabPinOverrides
): boolean {
  const override = overrides[tab.id]
  if (override !== undefined) {
    return override
  }
  return tab.isPinned === true
}

export function orderMobileSessionTabsByPin(
  tabs: readonly MobileSessionTab[],
  overrides: SessionTabPinOverrides
): MobileSessionTab[] {
  const pinned: MobileSessionTab[] = []
  const unpinned: MobileSessionTab[] = []
  for (const tab of tabs) {
    const isPinned = isMobileSessionTabPinned(tab, overrides)
    ;(isPinned ? pinned : unpinned).push({ ...tab, isPinned })
  }
  return [...pinned, ...unpinned]
}
