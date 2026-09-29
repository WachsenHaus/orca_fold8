import { createElement } from 'react'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  useMobileSessionTabPins,
  type MobileSessionTabPinsModel
} from './use-mobile-session-tab-pins'
import type { MobileSessionTab } from './mobile-session-route-types'

vi.mock('lucide-react-native', () => ({ Pin: vi.fn(), PinOff: vi.fn() }))
vi.mock('@react-native-async-storage/async-storage', () => {
  const values = new Map<string, string>()
  return {
    default: {
      getItem: vi.fn(async (key: string) => values.get(key) ?? null),
      setItem: vi.fn(async (key: string, value: string) => {
        values.set(key, value)
      }),
      removeItem: vi.fn(async (key: string) => {
        values.delete(key)
      }),
      clear: vi.fn(async () => {
        values.clear()
      })
    }
  }
})

const tabs: MobileSessionTab[] = ['a', 'b'].map((id) => ({
  type: 'terminal',
  id,
  title: id,
  terminal: id,
  isActive: id === 'a'
}))

describe('useMobileSessionTabPins', () => {
  let renderer: ReactTestRenderer | null = null
  let model: MobileSessionTabPinsModel
  function Harness({
    hostId = 'host',
    worktreeId = 'folder'
  }: {
    hostId?: string
    worktreeId?: string
  }) {
    model = useMobileSessionTabPins({ hostId, worktreeId, sessionTabs: tabs })
    return null
  }
  beforeEach(async () => {
    await AsyncStorage.clear()
    vi.clearAllMocks()
  })
  afterEach(() => {
    act(() => renderer?.unmount())
    renderer = null
  })

  it('persists pin and explicit unpin across remounts without changing active tab', async () => {
    await act(async () => {
      renderer = create(createElement(Harness))
    })
    await act(async () => {
      model.toggleTabPin(tabs[1]!)
    })
    expect(model!.orderedTabs.map((tab) => tab.id)).toEqual(['b', 'a'])
    expect(model!.orderedTabs.find((tab) => tab.isActive)?.id).toBe('a')
    act(() => renderer?.unmount())
    await act(async () => {
      renderer = create(createElement(Harness))
    })
    expect(model!.isTabPinned(tabs[1]!)).toBe(true)
    await act(async () => {
      model.toggleTabPin(tabs[1]!)
    })
    act(() => renderer?.unmount())
    await act(async () => {
      renderer = create(createElement(Harness))
    })
    expect(model!.isTabPinned(tabs[1]!)).toBe(false)
  })

  it('isolates host and workspace pin choices', async () => {
    await act(async () => {
      renderer = create(createElement(Harness))
    })
    await act(async () => {
      model.toggleTabPin(tabs[1]!)
    })
    await act(async () => {
      renderer?.update(createElement(Harness, { hostId: 'other' }))
    })
    expect(model!.isTabPinned(tabs[1]!)).toBe(false)
    await act(async () => {
      renderer?.update(createElement(Harness, { worktreeId: 'other' }))
    })
    expect(model!.isTabPinned(tabs[1]!)).toBe(false)
    await act(async () => {
      renderer?.update(createElement(Harness))
    })
    expect(model!.isTabPinned(tabs[1]!)).toBe(true)
  })

  it.each(['unmount', 'workspace'] as const)(
    'persists an early tap across %s before the initial read finishes',
    async (navigation) => {
      await AsyncStorage.setItem('orca:sessionTabPins:host:folder', '{"a":true}')
      let finishRead: (value: string | null) => void = () => {}
      vi.mocked(AsyncStorage.getItem).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishRead = resolve
          })
      )
      await act(async () => {
        renderer = create(createElement(Harness))
      })
      await act(async () => {
        model.toggleTabPin(tabs[1]!)
        if (navigation === 'unmount') {
          renderer?.unmount()
          renderer = null
        } else {
          renderer?.update(createElement(Harness, { worktreeId: 'other' }))
        }
      })
      await act(async () => {
        finishRead('{"a":true}')
      })
      await act(async () => {
        if (renderer) {
          renderer.update(createElement(Harness))
        } else {
          renderer = create(createElement(Harness))
        }
      })
      expect(model!.isTabPinned(tabs[0]!)).toBe(true)
      expect(model!.isTabPinned(tabs[1]!)).toBe(true)
      expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(
        'orca:sessionTabPins:host:folder',
        '{"a":true,"b":true}'
      )
    }
  )

  it('keeps rapid pin/unpin writes ordered across remounts', async () => {
    await act(async () => {
      renderer = create(createElement(Harness))
    })
    await act(async () => {
      model.toggleTabPin(tabs[1]!)
      model.toggleTabPin(tabs[1]!)
      model.toggleTabPin(tabs[0]!)
      renderer?.unmount()
      renderer = null
    })
    await act(async () => {
      renderer = create(createElement(Harness))
    })
    expect(model!.isTabPinned(tabs[0]!)).toBe(true)
    expect(model!.isTabPinned(tabs[1]!)).toBe(false)
  })
})
