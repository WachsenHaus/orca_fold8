import AsyncStorage from '@react-native-async-storage/async-storage'

const SESSION_TAB_PINS_PREFIX = 'orca:sessionTabPins:'

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
  try {
    return parseOverrides(await AsyncStorage.getItem(sessionTabPinsKey(hostId, worktreeId)))
  } catch {
    return {}
  }
}

export async function saveSessionTabPins(
  hostId: string,
  worktreeId: string,
  overrides: SessionTabPinOverrides
): Promise<void> {
  const key = sessionTabPinsKey(hostId, worktreeId)
  if (Object.keys(overrides).length === 0) {
    await AsyncStorage.removeItem(key)
    return
  }
  await AsyncStorage.setItem(key, JSON.stringify(overrides))
}
