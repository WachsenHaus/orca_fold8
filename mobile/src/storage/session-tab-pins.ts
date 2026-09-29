import AsyncStorage from '@react-native-async-storage/async-storage'
import { persistMirrored } from './mirrored-storage-keys'

const SESSION_TAB_PINS_PREFIX = 'orca:sessionTabPins:'
const pinUpdateBarriers = new Map<string, Promise<void>>()

/** Per-device pin choices keyed by session tab id; a stored value overrides the host's `isPinned`. */
export type SessionTabPinOverrides = Readonly<Record<string, boolean>>

function sessionTabPinsKey(hostId: string, worktreeId: string): string {
  return `${SESSION_TAB_PINS_PREFIX}${encodeURIComponent(hostId)}:${encodeURIComponent(worktreeId)}`
}

function parseOverrides(raw: string | null): SessionTabPinOverrides {
  if (!raw) {
    return {}
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }
    const overrides: Record<string, boolean> = {}
    for (const [tabId, pinned] of Object.entries(parsed)) {
      if (typeof pinned === 'boolean') {
        overrides[tabId] = pinned
      }
    }
    return overrides
  } catch {
    return {}
  }
}

export async function loadSessionTabPins(
  hostId: string,
  worktreeId: string
): Promise<SessionTabPinOverrides> {
  const key = sessionTabPinsKey(hostId, worktreeId)
  await pinUpdateBarriers.get(key)
  try {
    return parseOverrides(await AsyncStorage.getItem(key))
  } catch {
    return {}
  }
}

export async function updateSessionTabPin(
  hostId: string,
  worktreeId: string,
  tabId: string,
  pinned: boolean
): Promise<void> {
  const key = sessionTabPinsKey(hostId, worktreeId)
  // Like session-view preferences, writes outlive the route and merge per tab.
  const previous = pinUpdateBarriers.get(key) ?? Promise.resolve()
  const update = previous.then(async () => {
    const current = parseOverrides(await AsyncStorage.getItem(key))
    await persistMirrored(key, JSON.stringify({ ...current, [tabId]: pinned }))
  })
  const barrier = update.catch(() => undefined)
  pinUpdateBarriers.set(key, barrier)
  try {
    await update
  } finally {
    if (pinUpdateBarriers.get(key) === barrier) {
      pinUpdateBarriers.delete(key)
    }
  }
}
