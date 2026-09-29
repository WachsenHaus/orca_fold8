import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  loadSessionTabPins,
  saveSessionTabPins,
  type SessionTabPinOverrides
} from '../storage/session-tab-pins'
import {
  groupMobileSessionTabs,
  isMobileSessionTabPinned,
  isOrcaAgentSessionTab,
  type MobileSessionTabGroups
} from './mobile-session-tab-grouping'
import type { MobileSessionTab } from './mobile-session-route-types'
import type { ActionSheetAction } from '../components/ActionSheetModal'
import { createTabPinSheetActions } from './mobile-tab-pin-sheet-actions'

const EMPTY_OVERRIDES: SessionTabPinOverrides = {}

export type MobileSessionTabGroupingModel = MobileSessionTabGroups & {
  isTabPinned: (tab: MobileSessionTab) => boolean
  toggleTabPin: (tab: MobileSessionTab) => void
  pinSheetActions: (
    tab: MobileSessionTab | null | undefined,
    dismiss: () => void
  ) => ActionSheetAction[]
}

export function useMobileSessionTabGrouping({
  hostId,
  worktreeId,
  sessionTabs
}: {
  hostId: string
  worktreeId: string
  sessionTabs: readonly MobileSessionTab[]
}): MobileSessionTabGroupingModel {
  const scopeKey = `${hostId}\u0000${worktreeId}`
  const [pins, setPins] = useState<{
    scopeKey: string
    overrides: SessionTabPinOverrides
  }>({
    scopeKey,
    overrides: EMPTY_OVERRIDES
  })
  const overrides = pins.scopeKey === scopeKey ? pins.overrides : EMPTY_OVERRIDES

  useEffect(() => {
    let cancelled = false
    void loadSessionTabPins(hostId, worktreeId).then((loaded) => {
      if (!cancelled) {
        // Why: a pin tapped before the read landed must not be clobbered by it.
        setPins((current) =>
          current.scopeKey === scopeKey
            ? { scopeKey, overrides: { ...loaded, ...current.overrides } }
            : { scopeKey, overrides: loaded }
        )
      }
    })
    return () => {
      cancelled = true
    }
  }, [hostId, worktreeId, scopeKey])

  // Why: the host drops `orchestration` when a worker's title goes idle; keep it grouped for the visit.
  const orcaAgentTabIdsRef = useRef<{ scopeKey: string; ids: Set<string> }>({
    scopeKey,
    ids: new Set()
  })
  const orcaAgentTabIds = useMemo(() => {
    const previous =
      orcaAgentTabIdsRef.current.scopeKey === scopeKey
        ? orcaAgentTabIdsRef.current.ids
        : new Set<string>()
    const next = new Set<string>()
    for (const tab of sessionTabs) {
      if (previous.has(tab.id) || isOrcaAgentSessionTab(tab)) {
        next.add(tab.id)
      }
    }
    orcaAgentTabIdsRef.current = { scopeKey, ids: next }
    return next
  }, [sessionTabs, scopeKey])

  const groups = useMemo(
    () => groupMobileSessionTabs(sessionTabs, overrides, orcaAgentTabIds),
    [sessionTabs, overrides, orcaAgentTabIds]
  )

  const isTabPinned = useCallback(
    (tab: MobileSessionTab) => isMobileSessionTabPinned(tab, overrides),
    [overrides]
  )

  const toggleTabPin = useCallback(
    (tab: MobileSessionTab) => {
      setPins((current) => {
        const base = current.scopeKey === scopeKey ? current.overrides : EMPTY_OVERRIDES
        const next = {
          ...base,
          [tab.id]: !isMobileSessionTabPinned(tab, base)
        }
        void saveSessionTabPins(hostId, worktreeId, next).catch(() => {})
        return { scopeKey, overrides: next }
      })
    },
    [hostId, worktreeId, scopeKey]
  )

  const pinSheetActions = useCallback(
    (tab: MobileSessionTab | null | undefined, dismiss: () => void) =>
      createTabPinSheetActions(tab, isTabPinned, toggleTabPin, dismiss),
    [isTabPinned, toggleTabPin]
  )

  return { ...groups, isTabPinned, toggleTabPin, pinSheetActions }
}
