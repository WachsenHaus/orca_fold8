import { Pin, PinOff } from 'lucide-react-native'
import type { ActionSheetAction } from '../components/ActionSheetModal'
import type { MobileSessionTab } from './mobile-session-route-types'

export function createTabPinSheetActions(
  tab: MobileSessionTab | null | undefined,
  isTabPinned: (tab: MobileSessionTab) => boolean,
  toggleTabPin: (tab: MobileSessionTab) => void,
  dismiss: () => void
): ActionSheetAction[] {
  if (!tab) {
    return []
  }
  const pinned = isTabPinned(tab)
  return [
    {
      label: pinned ? 'Unpin Tab' : 'Pin Tab',
      icon: pinned ? PinOff : Pin,
      onPress: () => {
        dismiss()
        toggleTabPin(tab)
      }
    }
  ]
}
