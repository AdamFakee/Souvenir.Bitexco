import { Container } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { getRoleLabel, useAuthStore } from '@/shared/features/auth'
import { MaterialIcons } from '@expo/vector-icons'
import { Href, Tabs, useRouter, useSegments } from 'expo-router'
import React from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type MenuItem = {
  name: string
  label: string
  icon: React.ComponentProps<typeof MaterialIcons>['name']
}

const MENU_ITEMS: MenuItem[] = [
  { name: 'pos', label: 'Bán hàng', icon: 'point-of-sale' },
  { name: 'orders', label: 'Đơn hàng', icon: 'receipt-long' },
  { name: 'shift', label: 'Ca làm việc', icon: 'access-time' },
  { name: 'dashboard', label: 'Báo cáo', icon: 'dashboard' },
  { name: 'dev_control', label: 'Dev Control', icon: 'developer-mode' },
]

const CustomSidebar = React.memo(() => {
  const insets = useSafeAreaInsets()
  const { currentStaff, logout } = useAuthStore()
  const router = useRouter()
  const segments = useSegments()

  // Determine active route based on segments
  const activeTab = segments[1] || 'pos'

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: () => {
          logout()
          router.replace('/(auth)/staff-login' as Href)
        },
      },
    ])
  }

  return (
    <View
      className="h-full w-[240px] flex-col justify-between border-r border-outline-variant bg-surface-50 px-2"
      style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 12 }}
    >
      <View>
        {/* Logo */}
        <View className="mb-4 flex-row items-center gap-2 border-b border-outline-variant px-2 pb-4">
          <MaterialIcons name="store" size={24} color={COLORS.primary.default} />
          <Text className="text-lg font-extrabold tracking-wider text-primary">Bitexco POS</Text>
        </View>

        {/* Nav Items */}
        <View className="gap-1.5">
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
                    ? 'flex-row items-center gap-3 rounded-xl bg-primary px-3 py-2.5'
                    : 'flex-row items-center gap-3 rounded-xl bg-transparent px-3 py-2.5 active:bg-surface-200'
                }
              >
                <MaterialIcons
                  name={item.icon as any}
                  size={20}
                  color={isFocused ? activeColor : inactiveColor}
                />

                <Text
                  className={
                    isFocused
                      ? 'text-sm font-semibold text-white'
                      : 'text-sm font-semibold text-secondary'
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
      <Container className="flex-row items-center justify-between rounded-xl bg-surface-100 p-2">
        <View className="mr-1 flex-1 flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-primary">
            <MaterialIcons name="person" size={18} color={COLORS.primary.on} />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-bold text-surface-on" numberOfLines={1}>
              {currentStaff?.fullname || 'Không xác định'}
            </Text>
            <Text className="text-surface-onVariant text-[10px] font-medium" numberOfLines={1}>
              {currentStaff?.role
                ? 'Vai trò: ' + getRoleLabel(currentStaff.role)
                : 'Không xác định được vai trò'}
            </Text>
          </View>
        </View>
        <Pressable
          onPress={handleLogout}
          className="h-8 w-8 items-center justify-center rounded-full border border-outline-variant bg-surface-50 active:bg-surface-200"
        >
          <MaterialIcons name="logout" size={16} color={COLORS.error.default} />
        </Pressable>
      </Container>
    </View>
  )
})

CustomSidebar.displayName = 'CustomSidebar'

export default function TabLayout() {
  return (
    <View className="flex-1 flex-row">
      <CustomSidebar />

      <View className="flex-1">
        <Tabs
          tabBar={() => null}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tabs.Screen name="pos" options={{ title: 'Bán hàng' }} />
          <Tabs.Screen name="orders" options={{ title: 'Đơn hàng' }} />
          <Tabs.Screen name="shift" options={{ title: 'Ca làm việc' }} />
          <Tabs.Screen name="dashboard" options={{ title: 'Báo cáo' }} />
          <Tabs.Screen name="dev_control" options={{ title: 'Dev Control' }} />
        </Tabs>
      </View>
    </View>
  )
}
