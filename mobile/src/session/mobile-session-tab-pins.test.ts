import { describe, expect, it, vi } from 'vitest'
import { isMobileSessionTabPinned, orderMobileSessionTabsByPin } from './mobile-session-tab-pins'
import { createTabPinSheetActions } from './mobile-tab-pin-sheet-actions'
import type { MobileSessionTab } from './mobile-session-route-types'
import { selectBulkCloseTabs } from './mobile-tab-close-selection'

vi.mock('lucide-react-native', () => ({ Pin: vi.fn(), PinOff: vi.fn() }))

function tab(id: string, isPinned = false): MobileSessionTab {
  return { type: 'terminal', id, title: id, terminal: id, isPinned, isActive: false }
}

describe('mobile session tab pins', () => {
  it('lets a device choice override the host pin in either direction', () => {
    expect(isMobileSessionTabPinned(tab('a', true), {})).toBe(true)
    expect(isMobileSessionTabPinned(tab('a', true), { a: false })).toBe(false)
    expect(isMobileSessionTabPinned(tab('a'), { a: true })).toBe(true)
  })

  it('keeps every tab visible and preserves host order within each pin section', () => {
    const tabs = [tab('a'), tab('b'), tab('c'), tab('d')]
    expect(orderMobileSessionTabsByPin(tabs, { b: true, d: true }).map((item) => item.id)).toEqual([
      'b',
      'd',
      'a',
      'c'
    ])
    expect(orderMobileSessionTabsByPin(tabs, {})).toEqual(tabs)
    expect(tabs.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('bulk close respects device pins and the displayed order', () => {
    const ordered = orderMobileSessionTabsByPin([tab('a'), tab('b', true), tab('c'), tab('d')], {
      b: false,
      d: true
    })
    expect(ordered.map((item) => item.id)).toEqual(['d', 'a', 'b', 'c'])
    expect(selectBulkCloseTabs(ordered, 'c', 'left').map((item) => item.id)).toEqual(['a', 'b'])
    expect(selectBulkCloseTabs(ordered, 'a', 'others').map((item) => item.id)).toEqual(['b', 'c'])
  })

  it('dismisses the menu before toggling and offers the inverse action', () => {
    const calls: string[] = []
    const target = tab('a')
    const [action] = createTabPinSheetActions(
      target,
      () => false,
      () => calls.push('pin'),
      () => calls.push('dismiss')
    )
    expect(action?.label).toBe('Pin Tab')
    action?.onPress()
    expect(calls).toEqual(['dismiss', 'pin'])
    expect(createTabPinSheetActions(target, () => true, vi.fn(), vi.fn())[0]?.label).toBe(
      'Unpin Tab'
    )
    expect(createTabPinSheetActions(null, () => false, vi.fn(), vi.fn())).toEqual([])
  })
})
