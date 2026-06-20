import { COLORS } from '@/shared/constants'
import React, { memo, useCallback } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useOrderFilterStore } from '../store'

// Định nghĩa mảng TABS tĩnh dùng các status của WMS
const TABS: { key: string; label: string; statuses: string[] | null }[] = [
  { key: 'COMPLETED', label: 'Hoàn thành', statuses: ['FULFILLED', 'COMPLETED'] },
  {
    key: 'RETURNED',
    label: 'Trả hàng / Hoàn tiền',
    statuses: ['RETURN_REQUESTED', 'PARTIALLY_RETURNED', 'RETURNED', 'REFUNDED'],
  },
  { key: 'ALL', label: 'Tất cả', statuses: null },
]

interface StatusTabProps {
  tabIndex: number
}

const StatusTab = memo(function StatusTab({ tabIndex }: StatusTabProps) {
  const status = useOrderFilterStore((s) => s.status)
  const setStatus = useOrderFilterStore((s) => s.setStatus)
  const tab = TABS[tabIndex]

  const isActive = (() => {
    if (tab.statuses === null) return status === null
    if (!status || !Array.isArray(status)) return false
    return status.length === tab.statuses.length && status.every((s) => tab.statuses!.includes(s))
  })()

  const handlePress = useCallback(() => {
    setStatus(tab.statuses ? [...tab.statuses] : null)
  }, [setStatus, tab.statuses])

  return (
    <Pressable onPress={handlePress} style={[styles.tab, isActive && styles.tabActive]}>
      <Text style={[styles.tabText, isActive ? styles.tabTextActive : styles.tabTextInactive]}>
        {tab.label}
      </Text>
    </Pressable>
  )
})

export const OrderStatusTabs = memo(function OrderStatusTabs() {
  return (
    <View style={styles.container}>
      {TABS.map((_, index) => (
        <StatusTab key={index} tabIndex={index} />
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
})
