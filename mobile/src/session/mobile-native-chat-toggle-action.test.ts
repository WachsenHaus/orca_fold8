import { describe, expect, it, vi } from 'vitest'
import { resolveMobileNativeChatViewToggle } from './mobile-native-chat-toggle-action'

vi.mock('lucide-react-native', () => ({
  MessageSquare: vi.fn(),
  SquareTerminal: vi.fn()
}))

describe('resolveMobileNativeChatViewToggle', () => {
  it('toggles both ways for Codex detected in a manually opened shell', () => {
    const tab = { type: 'terminal', id: 'shell', foregroundAgent: 'codex' }
    for (const isChat of [false, true]) {
      expect(
        resolveMobileNativeChatViewToggle({
          tab,
          isTabChatView: () => isChat,
          nativeChatTranscriptIsLocalReadable: false
        })
      ).toEqual({ tabId: 'shell', isChat })
    }
  })

  const claudeTab = { type: 'terminal', id: 'tab-1', terminal: 'pty-1', launchAgent: 'claude' }

  it('reports the current view of a chat-capable terminal tab', () => {
    expect(
      resolveMobileNativeChatViewToggle({
        tab: claudeTab,
        isTabChatView: () => false,
        nativeChatTranscriptIsLocalReadable: true
      })
    ).toEqual({ tabId: 'tab-1', isChat: false })
    expect(
      resolveMobileNativeChatViewToggle({
        tab: claudeTab,
        isTabChatView: (id) => id === 'tab-1',
        nativeChatTranscriptIsLocalReadable: true
      })
    ).toEqual({ tabId: 'tab-1', isChat: true })
  })

  it('hides the toggle for plain shells, agent-session tabs, and missing tabs', () => {
    const args = { isTabChatView: () => true, nativeChatTranscriptIsLocalReadable: true }
    expect(
      resolveMobileNativeChatViewToggle({ ...args, tab: { type: 'terminal', id: 'shell' } })
    ).toBeNull()
    expect(
      resolveMobileNativeChatViewToggle({
        ...args,
        tab: { type: 'agent-session', id: 's', agent: 'claude', sessionId: 'x' }
      })
    ).toBeNull()
    expect(resolveMobileNativeChatViewToggle({ ...args, tab: null })).toBeNull()
  })
})
