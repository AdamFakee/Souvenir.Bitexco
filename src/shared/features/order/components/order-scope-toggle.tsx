import { COLORS } from '@/shared/constants'
import React, { memo, useCallback } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useOrderFilterStore } from '../store'

export const OrderScopeToggle = memo(function OrderScopeToggle() {
  const scope = useOrderFilterStore((s) => s.scope)
  const setScope = useOrderFilterStore((s) => s.setScope)

  const handleScopeShift = useCallback(() => setScope('SHIFT'), [setScope])
  const handleScopeAll = useCallback(() => setScope('ALL'), [setScope])

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handleScopeShift}
        style={[styles.tab, scope === 'SHIFT' && styles.tabActive]}
      >
        <Text style={[styles.tabText, scope === 'SHIFT' && styles.tabTextActive]}>
          Theo ca hiện tại
        </Text>
      </Pressable>

      <Pressable onPress={handleScopeAll} style={[styles.tab, scope === 'ALL' && styles.tabActive]}>
        <Text style={[styles.tabText, scope === 'ALL' && styles.tabTextActive]}>Tất cả các ca</Text>
      </Pressable>
    </View>
  )
})

const styles = StyleSheet.create({
  container: {
    width: 320,
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.outline.variant,
    backgroundColor: '#f1f5f9',
    padding: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: COLORS.primary.default,
  },
  tabText: {
    fontSize: 18,
    fontFamily: 'Manrope-Bold',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ffffff',
  },
})
