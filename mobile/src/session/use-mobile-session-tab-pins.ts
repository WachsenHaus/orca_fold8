import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  loadSessionTabPins,
  updateSessionTabPin,
  type SessionTabPinOverrides
} from '../storage/session-tab-pins'
import {
  orderMobileSessionTabsByPin,
  isMobileSessionTabPinned,
  type MobileSessionTabPins
} from './mobile-session-tab-pins'
import type { MobileSessionTab } from './mobile-session-route-types'
import type { ActionSheetAction } from '../components/ActionSheetModal'
import { createTabPinSheetActions } from './mobile-tab-pin-sheet-actions'

const EMPTY_OVERRIDES: SessionTabPinOverrides = {}

export type MobileSessionTabPinsModel = MobileSessionTabPins & {
  isTabPinned: (tab: MobileSessionTab) => boolean
  toggleTabPin: (tab: MobileSessionTab) => void
  pinSheetActions: (
    tab: MobileSessionTab | null | undefined,
    dismiss: () => void
  ) => ActionSheetAction[]
}

export function useMobileSessionTabPins({
  hostId,
  worktreeId,
  sessionTabs
}: {
  hostId: string
  worktreeId: string
  sessionTabs: readonly MobileSessionTab[]
}): MobileSessionTabPinsModel {
  const scopeKey = `${hostId}\u0000${worktreeId}`
  const [pins, setPins] = useState<{
    scopeKey: string
    overrides: SessionTabPinOverrides
  }>({
    scopeKey,
    overrides: EMPTY_OVERRIDES
  })
  const pinsRef = useRef(pins)
  pinsRef.current = pins
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

  const orderedTabs = useMemo(
    () => orderMobileSessionTabsByPin(sessionTabs, overrides),
    [sessionTabs, overrides]
  )

  const isTabPinned = useCallback(
    (tab: MobileSessionTab) => isMobileSessionTabPinned(tab, overrides),
    [overrides]
  )

  const toggleTabPin = useCallback(
    (tab: MobileSessionTab) => {
      const current = pinsRef.current
      const base = current.scopeKey === scopeKey ? current.overrides : EMPTY_OVERRIDES
      const pinned = !isMobileSessionTabPinned(tab, base)
      const next = { scopeKey, overrides: { ...base, [tab.id]: pinned } }
      pinsRef.current = next
      setPins(next)
      void updateSessionTabPin(hostId, worktreeId, tab.id, pinned).catch(() => {})
    },
    [hostId, worktreeId, scopeKey]
  )

  const pinSheetActions = useCallback(
    (tab: MobileSessionTab | null | undefined, dismiss: () => void) =>
      createTabPinSheetActions(tab, isTabPinned, toggleTabPin, dismiss),
    [isTabPinned, toggleTabPin]
  )

  return { orderedTabs, isTabPinned, toggleTabPin, pinSheetActions }
}
