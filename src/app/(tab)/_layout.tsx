import { Button, Container } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { getRoleLabel, useAuthStore } from '@/shared/features/auth'
import { CloseShiftModal, CloseShiftModalRef } from '@/shared/features/shift'
import { useSync } from '@/shared/lib/database/sync'
import { MaterialIcons } from '@expo/vector-icons'
import { Href, Tabs, useRouter, useSegments } from 'expo-router'
import { LogOut, RefreshCw } from 'lucide-react-native'
import React, { useRef } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type MenuItem = {
  name: string
  label: string
  icon: React.ComponentProps<typeof MaterialIcons>['name']
}

const MENU_ITEMS: MenuItem[] = [
  { name: 'pos', label: 'Bán hàng', icon: 'point-of-sale' },
  { name: 'orders', label: 'Đơn hàng', icon: 'receipt-long' },
  { name: 'dashboard', label: 'Báo cáo', icon: 'dashboard' },
  { name: 'dev_control', label: 'Dev Control', icon: 'developer-mode' },
]

const CustomSidebar = React.memo(({ onOpenCloseShift }: { onOpenCloseShift: () => void }) => {
  const insets = useSafeAreaInsets()
  const { currentStaff } = useAuthStore()
  const router = useRouter()
  const segments = useSegments()
  const { syncNow, isSyncing } = useSync()

  // Determine active route based on segments
  const activeTab = segments[1] || 'pos'

  return (
    <View
      className="h-full w-[320px] flex-col justify-between border-r border-outline-variant bg-surface-50 px-4"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }}
    >
      <View>
        {/* Logo */}
        <View className="mb-6 flex-row items-center gap-3 border-b border-outline-variant px-2 pb-6">
          <MaterialIcons name="store" size={32} color={COLORS.primary.default} />
          <Text className="text-2xl font-black tracking-tight text-primary">Bitexco POS</Text>
        </View>

        {/* Nav Items */}
        <View className="gap-2.5">
          {MENU_ITEMS.map((item) => {
            const isFocused = activeTab === item.name
            const onPress = () => {
              router.navigate(`/(tab)/${item.name}` as Href)
            }

            const activeColor = COLORS.primary.on
            const inactiveColor = COLORS.secondary.default

            return (
              <Pressable
                key={item.name}
                onPress={onPress}
                className={
                  isFocused
                    ? 'flex-row items-center gap-4 rounded-2xl bg-primary px-5 py-4'
                    : 'flex-row items-center gap-4 rounded-2xl bg-transparent px-5 py-4 active:bg-surface-200'
                }
              >
                <MaterialIcons
                  name={item.icon as any}
                  size={28}
                  color={isFocused ? activeColor : inactiveColor}
                />

                <Text
                  className={
                    isFocused
                      ? 'text-lg font-bold text-white'
                      : 'text-lg font-semibold text-secondary'
                  }
                >
                  {item.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      {/* Sidebar Bottom Info */}
      <View className="gap-4">
        <Button
          label="Đồng bộ dữ liệu"
          variant="outline"
          onPress={syncNow}
          loading={isSyncing}
          leftIcon={RefreshCw}
        />
        <Button
          label="Kết thúc ca làm việc"
          variant="error"
          onPress={onOpenCloseShift}
          leftIcon={LogOut}
        />

        <Container className="flex-row items-center justify-between rounded-2xl bg-surface-100 p-4 shadow-sm">
          <View className="mr-2 flex-1 flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary shadow-sm">
              <MaterialIcons name="person" size={24} color={COLORS.primary.on} />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-black text-surface-on" numberOfLines={1}>
                {currentStaff?.fullname || 'Nhân viên'}
              </Text>
              <Text className="text-surface-onVariant text-xs font-medium" numberOfLines={1}>
                {currentStaff?.role ? getRoleLabel(currentStaff.role) : 'Role: N/A'}
              </Text>
            </View>
          </View>
        </Container>
      </View>
    </View>
  )
})

CustomSidebar.displayName = 'CustomSidebar'

export default function TabLayout() {
  const { session } = useAuthStore()

  const closeShiftModalRef = useRef<CloseShiftModalRef>(null)

  return (
    <View className="flex-1 flex-row">
      <CustomSidebar onOpenCloseShift={() => closeShiftModalRef.current?.open()} />

      <View className="flex-1">
        <Tabs
          tabBar={() => null}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tabs.Screen name="pos" options={{ title: 'Bán hàng' }} />
          <Tabs.Screen name="orders" options={{ title: 'Đơn hàng' }} />
          <Tabs.Screen name="dashboard" options={{ title: 'Báo cáo' }} />
          <Tabs.Screen name="dev_control" options={{ title: 'Dev Control' }} />
        </Tabs>
      </View>

      <CloseShiftModal ref={closeShiftModalRef} shiftId={session?.shiftId} />
    </View>
  )
}
