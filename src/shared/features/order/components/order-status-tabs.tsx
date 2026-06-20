import { COLORS } from '@/shared/constants'
import { OrderStatus } from '@/shared/lib/database/models/order'
import React, { memo, useCallback } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ORDER_STATUS_CONFIG } from '../constants'
import { useOrderFilterStore } from '../store'

// ─── Tab definitions — static, never recreated ────────────────────────────────

const TAB_KEYS = [OrderStatus.COMPLETED, OrderStatus.REFUNDED, 'ALL'] as const
type TabKey = (typeof TAB_KEYS)[number]

// ─── Individual tab — fully self-contained, subscribes to its own slice ───────
// onPress is stable via internal useCallback so memo actually works

interface StatusTabProps {
  tabKey: TabKey
}

const StatusTab = memo(function StatusTab({ tabKey }: StatusTabProps) {
  const status = useOrderFilterStore((s) => s.status)
  const setStatus = useOrderFilterStore((s) => s.setStatus)

  const isActive = tabKey === 'ALL' ? status === null : status === tabKey
  const config = ORDER_STATUS_CONFIG[tabKey]

  const handlePress = useCallback(() => {
    setStatus(tabKey === 'ALL' ? null : tabKey)
  }, [setStatus, tabKey])

  return (
    <Pressable onPress={handlePress} style={[styles.tab, isActive && styles.tabActive]}>
      <Text style={[styles.tabText, isActive ? styles.tabTextActive : styles.tabTextInactive]}>
        {config.label}
      </Text>
    </Pressable>
  )
})

// ─── Container — no store subscriptions, just renders static tab list ─────────

export const OrderStatusTabs = memo(function OrderStatusTabs() {
  return (
    <View style={styles.container}>
      {TAB_KEYS.map((tabKey) => (
        <StatusTab key={tabKey} tabKey={tabKey} />
      ))}
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  tab: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderBottomWidth: 4,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary.default,
  },
  tabText: {
    fontSize: 20,
    fontFamily: 'Manrope-Bold',
  },
  tabTextActive: {
    color: COLORS.primary.default,
  },
  tabTextInactive: {
    color: COLORS.muted,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 14,
    fontFamily: 'Manrope-Bold',
  },
})
