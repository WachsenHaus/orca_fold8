import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  loadSessionTabPins,
  saveSessionTabPins,
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
    loaded: boolean
    dirty: boolean
  }>({
    scopeKey,
    overrides: EMPTY_OVERRIDES,
    loaded: false,
    dirty: false
  })
  const overrides = pins.scopeKey === scopeKey ? pins.overrides : EMPTY_OVERRIDES

  useEffect(() => {
    let cancelled = false
    void loadSessionTabPins(hostId, worktreeId).then((loaded) => {
      if (!cancelled) {
        // Why: a pin tapped before the read landed must not be clobbered by it.
        setPins((current) =>
          current.scopeKey === scopeKey
            ? { ...current, overrides: { ...loaded, ...current.overrides }, loaded: true }
            : { scopeKey, overrides: loaded, loaded: true, dirty: false }
        )
      }
    })
    return () => {
      cancelled = true
    }
  }, [hostId, worktreeId, scopeKey])

  const pendingSaveRef = useRef(Promise.resolve())
  useEffect(() => {
    if (pins.scopeKey !== scopeKey || !pins.loaded || !pins.dirty) {
      return
    }
    // Merge the initial read before saving, and keep rapid writes in tap order.
    pendingSaveRef.current = pendingSaveRef.current
      .then(() => saveSessionTabPins(hostId, worktreeId, pins.overrides))
      .catch(() => {})
  }, [hostId, worktreeId, scopeKey, pins])

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
      setPins((current) => {
        const base = current.scopeKey === scopeKey ? current.overrides : EMPTY_OVERRIDES
        const next = {
          ...base,
          [tab.id]: !isMobileSessionTabPinned(tab, base)
        }
        return {
          scopeKey,
          overrides: next,
          loaded: current.scopeKey === scopeKey && current.loaded,
          dirty: true
        }
      })
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
