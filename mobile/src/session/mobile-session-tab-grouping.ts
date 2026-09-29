import type { SessionTabPinOverrides } from '../storage/session-tab-pins'
import type { MobileSessionTab } from './mobile-session-route-types'

export const ORCA_AGENTS_GROUP_LABEL = 'Orca Agents'

export function isMobileSessionTabPinned(
  tab: MobileSessionTab,
  overrides: SessionTabPinOverrides
): boolean {
  const override = overrides[tab.id]
  if (override !== undefined) {
    return override
  }
  return 'isPinned' in tab && tab.isPinned === true
}

/** A terminal an orchestrating agent spawned through the Orca CLI (`orca orchestration worker-start`). */
export function isOrcaAgentSessionTab(tab: MobileSessionTab): boolean {
  return tab.type === 'terminal' && tab.agentStatus?.orchestration != null
}

export type MobileSessionTabGroups = {
  /** Tabs shown directly in the strip: pinned first, then the rest in host order. */
  stripTabs: MobileSessionTab[]
  /** Unpinned Orca CLI agent tabs, folded behind one "Orca Agents" chip. */
  orcaAgentTabs: MobileSessionTab[]
}

export function groupMobileSessionTabs(
  tabs: readonly MobileSessionTab[],
  pinOverrides: SessionTabPinOverrides,
  orcaAgentTabIds: ReadonlySet<string>
): MobileSessionTabGroups {
  const pinned: MobileSessionTab[] = []
  const unpinned: MobileSessionTab[] = []
  const orcaAgentTabs: MobileSessionTab[] = []
  for (const tab of tabs) {
    if (isMobileSessionTabPinned(tab, pinOverrides)) {
      pinned.push(tab)
    } else if (orcaAgentTabIds.has(tab.id)) {
      orcaAgentTabs.push(tab)
    } else {
      unpinned.push(tab)
    }
  }
  return { stripTabs: [...pinned, ...unpinned], orcaAgentTabs }
}
