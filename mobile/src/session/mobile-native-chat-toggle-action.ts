import { MessageSquare, SquareTerminal } from 'lucide-react-native'
import type { ActionSheetAction } from '../components/ActionSheetModal'
import { resolveMobileNativeChat, type MobileNativeChatTab } from './mobile-native-chat-eligibility'

type ToggleTab = MobileNativeChatTab & {
  id: string
  terminal?: string | null
}

export type MobileNativeChatViewToggle = {
  tabId: string
  isChat: boolean
}

/** Resolves whether a terminal tab can flip between terminal and chat view, and
 *  which view it shows now. Structured agent-session tabs are chat-only. */
export function resolveMobileNativeChatViewToggle(args: {
  tab: ToggleTab | null | undefined
  isTabChatView: (tabId: string) => boolean
  nativeChatTranscriptIsLocalReadable: boolean
}): MobileNativeChatViewToggle | null {
  const { tab } = args
  if (
    !tab ||
    tab.type !== 'terminal' ||
    !resolveMobileNativeChat(tab, args.nativeChatTranscriptIsLocalReadable)
  ) {
    return null
  }
  return { tabId: tab.id, isChat: args.isTabChatView(tab.id) }
}

/** Builds the optional terminal/chat switch shown in a terminal's long-press menu. */
export function getMobileNativeChatToggleActions(args: {
  terminalHandle: string | null
  tabs: readonly ToggleTab[]
  isTabChatView: (tabId: string) => boolean
  nativeChatTranscriptIsLocalReadable: boolean
  onClose: () => void
  onToggle: (tabId: string) => void
}): ActionSheetAction[] {
  const { terminalHandle, tabs, onClose, onToggle } = args
  const toggle = resolveMobileNativeChatViewToggle({
    tab: terminalHandle ? tabs.find((candidate) => candidate.terminal === terminalHandle) : null,
    isTabChatView: args.isTabChatView,
    nativeChatTranscriptIsLocalReadable: args.nativeChatTranscriptIsLocalReadable
  })
  if (!toggle) {
    return []
  }
  return [
    {
      label: toggle.isChat ? 'Switch to terminal view' : 'Switch to chat view',
      icon: toggle.isChat ? SquareTerminal : MessageSquare,
      onPress: () => {
        onClose()
        onToggle(toggle.tabId)
      }
    }
  ]
}
