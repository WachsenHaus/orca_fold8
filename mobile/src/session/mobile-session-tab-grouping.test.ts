import { describe, expect, it, vi } from 'vitest'
import type { AgentStatusEntry } from '../../../src/shared/agent-status-types'
import {
  groupMobileSessionTabs,
  isMobileSessionTabPinned,
  isOrcaAgentSessionTab
} from './mobile-session-tab-grouping'
import { createTabPinSheetActions } from './mobile-tab-pin-sheet-actions'
import type { MobileSessionTab } from './mobile-session-route-types'

vi.mock('lucide-react-native', () => ({ Pin: vi.fn(), PinOff: vi.fn() }))

function terminal(
  id: string,
  extra: Partial<Extract<MobileSessionTab, { type: 'terminal' }>> = {}
) {
  return {
    type: 'terminal',
    id,
    title: id,
    terminal: `handle-${id}`,
    isActive: false,
    ...extra
  } satisfies MobileSessionTab
}

function orchestrated(id: string): MobileSessionTab {
  const agentStatus: AgentStatusEntry = {
    state: 'working',
    prompt: '',
    updatedAt: 1,
    stateStartedAt: 1,
    paneKey: `${id}:leaf`,
    stateHistory: [],
    orchestration: { taskId: 'task', dispatchId: `dispatch-${id}` }
  }
  return terminal(id, { agentStatus })
}

describe('isOrcaAgentSessionTab', () => {
  it('groups automatic tabs without requiring a live orchestration status', () => {
    expect(isOrcaAgentSessionTab(terminal('cli', { creationSource: 'automation' }))).toBe(true)
    expect(
      isOrcaAgentSessionTab({
        type: 'agent-session',
        id: 'chat',
        title: 'Codex',
        sessionId: 'session',
        agent: 'codex',
        isActive: false,
        creationSource: 'automation'
      })
    ).toBe(true)
  })

  it('keeps a manually created tab outside the group even after agent activity', () => {
    const tab = { ...orchestrated('manual'), creationSource: 'manual' as const }
    expect(isOrcaAgentSessionTab(tab)).toBe(false)
    expect(groupMobileSessionTabs([tab], {}, new Set(['manual'])).stripTabs).toEqual([tab])
  })

  it('matches only terminals with an orchestration dispatch', () => {
    expect(isOrcaAgentSessionTab(orchestrated('w1'))).toBe(true)
    expect(isOrcaAgentSessionTab(terminal('t1'))).toBe(false)
  })
})

describe('isMobileSessionTabPinned', () => {
  it('uses the host pin unless the device overrides it', () => {
    const hostPinned = terminal('t1', { isPinned: true })
    expect(isMobileSessionTabPinned(hostPinned, {})).toBe(true)
    expect(isMobileSessionTabPinned(hostPinned, { t1: false })).toBe(false)
    expect(isMobileSessionTabPinned(terminal('t2'), { t2: true })).toBe(true)
  })
})

describe('groupMobileSessionTabs', () => {
  it('puts pinned tabs first and folds unpinned Orca agents into the group', () => {
    const tabs = [terminal('a'), orchestrated('w1'), terminal('b'), orchestrated('w2')]
    const groups = groupMobileSessionTabs(tabs, { b: true, w2: true }, new Set(['w1', 'w2']))
    expect(groups.stripTabs.map((t) => t.id)).toEqual(['b', 'w2', 'a'])
    expect(groups.orcaAgentTabs.map((t) => t.id)).toEqual(['w1'])
  })

  it('keeps host order when nothing is pinned or grouped', () => {
    const tabs = [terminal('a'), terminal('b')]
    const groups = groupMobileSessionTabs(tabs, {}, new Set())
    expect(groups.stripTabs.map((t) => t.id)).toEqual(['a', 'b'])
    expect(groups.orcaAgentTabs).toEqual([])
  })
})

describe('createTabPinSheetActions', () => {
  it('offers Pin for an unpinned tab and toggles it after dismissing', () => {
    const tab = terminal('a')
    const dismiss = vi.fn()
    const toggle = vi.fn()
    const [action] = createTabPinSheetActions(tab, () => false, toggle, dismiss)
    expect(action?.label).toBe('Pin Tab')
    action?.onPress()
    expect(dismiss).toHaveBeenCalled()
    expect(toggle).toHaveBeenCalledWith(tab)
  })

  it('offers Unpin for a pinned tab and nothing without a target', () => {
    expect(createTabPinSheetActions(terminal('a'), () => true, vi.fn(), vi.fn())[0]?.label).toBe(
      'Unpin Tab'
    )
    expect(createTabPinSheetActions(null, () => true, vi.fn(), vi.fn())).toEqual([])
  })
})
