import { File, FileText, Globe } from 'lucide-react-native'
import { MobileAgentIcon } from '../components/MobileAgentIcon'
import { colors } from '../theme/mobile-theme'
import { resolveMobileTerminalTabAgentId } from './mobile-terminal-tab-agent'
import type { MobileSessionTab } from './mobile-session-route-types'

export function MobileSessionTabIcon({ tab, size = 13 }: { tab: MobileSessionTab; size?: number }) {
  if (tab.type === 'browser') {
    return <Globe size={size} color={colors.textSecondary} strokeWidth={2.1} />
  }
  if (tab.type === 'markdown') {
    return <FileText size={size} color={colors.textSecondary} strokeWidth={2.1} />
  }
  if (tab.type === 'file') {
    return <File size={size} color={colors.textSecondary} strokeWidth={2.1} />
  }
  if (tab.type === 'agent-session') {
    return <MobileAgentIcon agentId={tab.agent} size={size} />
  }
  const agentId = resolveMobileTerminalTabAgentId(tab)
  return agentId ? <MobileAgentIcon agentId={agentId} size={size} /> : null
}
