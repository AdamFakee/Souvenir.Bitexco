import { memo, useCallback, useEffect, useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useUnsyncedOrdersCount } from '@/features/order/hooks'
import type { OrderMode } from '@/app/(tab)/orders'

export const ModeTabs = memo(function ModeTabs({
  mode,
  onChangeMode,
}: {
  mode: OrderMode
  onChangeMode: (v: OrderMode) => void
}) {
  const unsyncedCount = useUnsyncedOrdersCount()

  useEffect(() => {
    if (mode === 'offline' && unsyncedCount === 0) {
      onChangeMode('all')
    }
  }, [mode, unsyncedCount, onChangeMode])

  const tabs = useMemo(() => {
    const base = [
      { label: 'Tất cả', value: 'all' as const },
      { label: 'Khách lẻ', value: 'pos' as const },
      { label: 'Cộng tác viên', value: 'collaborator' as const },
      { label: 'Đối tác', value: 'agent' as const },
    ]
    if (unsyncedCount > 0) {
      return [...base, { label: 'Ngoại tuyến', value: 'offline' as const }]
    }
    return base
  }, [unsyncedCount])

  const handlePress = useCallback(
    (tabValue: OrderMode) => {
      if (tabValue === mode) return
      onChangeMode(tabValue)
    },
    [mode, onChangeMode],
  )

  return (
    <View className="flex-row gap-2 px-4 pt-3">
      {tabs.map((tab) => {
        const active = mode === tab.value
        return (
          <Pressable
            key={tab.value}
            onPress={() => handlePress(tab.value)}
            className={`items-center justify-center rounded-t-2xl px-10 py-5 ${
              active ? 'elevation-8 bg-surface-variant' : 'elevation-0 bg-neutral-50'
            }`}
            style={
              active
                ? {
                    shadowColor: '#DBDBDB',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.24,
                    shadowRadius: 10,
                  }
                : undefined
            }
          >
            <Text
              className={`font-manrope-bold text-[22px] font-black ${
                active ? 'text-primary' : 'text-neutral-900'
              }`}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
})
