import { useRef } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Pin } from 'lucide-react-native'
import { BottomDrawer } from '../components/BottomDrawer'
import { triggerMediumImpact } from '../platform/haptics'
import { colors, spacing, typography } from '../theme/mobile-theme'
import { MobileSessionTabIcon } from './MobileSessionTabIcon'
import { ORCA_AGENTS_GROUP_LABEL } from './mobile-session-tab-grouping'
import { getMobileSessionTabTitle } from './mobile-terminal-tab-agent'
import type { MobileSessionTab } from './mobile-session-route-types'

type Props = {
  visible: boolean
  tabs: readonly MobileSessionTab[]
  activeTabId: string | null
  onClose: () => void
  onSelect: (tab: MobileSessionTab) => void
  onPin: (tab: MobileSessionTab) => void
  onOpenActions: (tab: MobileSessionTab) => void
}

export function OrcaAgentsTabSheet({
  visible,
  tabs,
  activeTabId,
  onClose,
  onSelect,
  onPin,
  onOpenActions
}: Props) {
  // Why: iOS cannot present the tab's action sheet until this drawer's native modal unmounts.
  const pendingActionRef = useRef<(() => void) | null>(null)
  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      onAfterClose={() => {
        const pending = pendingActionRef.current
        pendingActionRef.current = null
        pending?.()
      }}
      dragContentToDismiss
    >
      <View style={styles.header}>
        <Text style={styles.title}>{ORCA_AGENTS_GROUP_LABEL}</Text>
        <Text style={styles.message}>Tabs started through the Orca CLI</Text>
      </View>
      <View style={styles.group}>
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId
          const title = getMobileSessionTabTitle(tab)
          return (
            <View key={tab.id}>
              {index > 0 && <View style={styles.separator} />}
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => {
                  onSelect(tab)
                  onClose()
                }}
                onLongPress={() => {
                  triggerMediumImpact()
                  pendingActionRef.current = () => onOpenActions(tab)
                  onClose()
                }}
                delayLongPress={400}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={title}
              >
                <MobileSessionTabIcon tab={tab} size={16} />
                <Text style={[styles.rowText, isActive && styles.rowTextActive]} numberOfLines={1}>
                  {title}
                </Text>
                {isActive ? <View style={styles.activeDot} /> : null}
                <Pressable
                  style={({ pressed }) => [styles.pinButton, pressed && styles.rowPressed]}
                  onPress={() => {
                    onPin(tab)
                    onClose()
                  }}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Pin ${title}`}
                >
                  <Pin size={15} color={colors.textSecondary} strokeWidth={2.1} />
                </Pressable>
              </Pressable>
            </View>
          )
        })}
      </View>
    </BottomDrawer>
  )
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.sm
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted
  },
  message: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2
  },
  group: {
    backgroundColor: colors.bgPanel,
    borderRadius: 12,
    overflow: 'hidden'
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderSubtle,
    marginHorizontal: spacing.md
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md + 2,
    paddingRight: spacing.sm,
    minHeight: 48
  },
  rowPressed: {
    backgroundColor: colors.bgRaised
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    fontSize: typography.bodySize,
    fontWeight: '500',
    color: colors.textSecondary
  },
  rowTextActive: {
    color: colors.textPrimary
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textSecondary
  },
  pinButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  }
})
