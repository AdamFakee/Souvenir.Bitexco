import {
  CartIcon,
  Container,
  DebtIcon,
  IconButton,
  LogoSkydeck,
  SettingIcon,
  WorkingIcon,
} from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { useAppContext } from '@/shared/features/app'
import { HandoverNotesModal, HandoverNotesModalRef, useNoteStore } from '@/shared/features/note'
import { CloseShiftModal, CloseShiftModalRef } from '@/shared/features/shift'
import { useSync } from '@/shared/lib/database/sync'
import { MaterialIcons } from '@expo/vector-icons'
import { Href, Tabs, useRouter, useSegments } from 'expo-router'
import { ClipboardList, LogOut, RefreshCw } from 'lucide-react-native'
import React, { useEffect, useMemo, useRef } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type MenuItem = {
  name: string
  label: string
  icon: React.ComponentType<{ size?: number; color?: string }>
}

const MENU_ITEMS: MenuItem[] = [
  { name: 'pos', label: 'Bán hàng', icon: CartIcon },
  { name: 'orders', label: 'Đơn hàng', icon: DebtIcon },
  { name: 'dashboard', label: 'Báo cáo', icon: WorkingIcon },
  { name: 'dev_control', label: 'Dev Control', icon: SettingIcon },
]

const CustomSidebar = React.memo(({ onOpenCloseShift }: { onOpenCloseShift: () => void }) => {
  const insets = useSafeAreaInsets()
  const { employee } = useAppContext()
  const router = useRouter()
  const segments = useSegments()
  const { syncNow, isSyncing } = useSync()

  // Determine active route based on segments
  const activeTab = segments[1] || 'pos'

  // Handover Notes store integration and ref
  const handoverNotesModalRef = useRef<HandoverNotesModalRef>(null)
  const { notes, loadNotes } = useNoteStore()
  const pendingNotesCount = useMemo(() => notes.filter((n) => !n.isCompleted).length, [notes])

  useEffect(() => {
    loadNotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <View
      className="h-full w-[260px] flex-col justify-between bg-primary px-0"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }}
    >
      <View>
        {/* Logo */}
        <View className="w-full items-center justify-center pb-6 pt-2">
          <LogoSkydeck width={180} height={100} color="#ffffff" />
        </View>

        {/* Nav Items */}
        <View className="gap-3">
          {MENU_ITEMS.map((item) => {
            const isFocused = activeTab === item.name
            const onPress = () => {
              router.navigate(`/(tab)/${item.name}` as Href)
            }

            const activeColor = COLORS.primary.on
            const inactiveColor = COLORS.primary.on

            return (
              <Pressable
                key={item.name}
                onPress={onPress}
                className={
                  isFocused
                    ? 'h-[126px] w-full flex-col items-center justify-center gap-3 bg-primary-deep px-6 py-4'
                    : 'h-[126px] w-full flex-col items-center justify-center gap-3 bg-transparent px-6 py-4 active:bg-primary-deep/50'
                }
              >
                <item.icon size={48} color={isFocused ? activeColor : inactiveColor} />

                <Text
                  className={
                    'text-center font-manrope text-[24px] font-bold leading-[34px] text-white'
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
      <View className="gap-4 px-4 pb-2">
        {/* Actions Row */}
        <View className="flex-row items-center justify-between gap-3">
          {/* Note Button */}
          <View className="relative flex-1">
            <IconButton
              icon={ClipboardList}
              variant="xl"
              color={COLORS.surface[50]}
              onPress={() => handoverNotesModalRef.current?.open()}
              className="h-16 w-full rounded-2xl border border-white/20 bg-white/10"
            />
            {pendingNotesCount > 0 && (
              <View className="pointer-events-none absolute -right-1 -top-1 h-6 min-w-[24px] items-center justify-center rounded-full bg-error px-1.5 shadow-sm">
                <Text className="text-xs font-black text-white">{pendingNotesCount}</Text>
              </View>
            )}
          </View>

          {/* Sync Button */}
          <View className="flex-1">
            <IconButton
              icon={isSyncing ? undefined : RefreshCw}
              variant="xl"
              color={COLORS.surface[50]}
              onPress={syncNow}
              className="h-16 w-full rounded-2xl border border-white/20 bg-white/10"
              disabled={isSyncing}
            >
              {isSyncing && <ActivityIndicator size="small" color={COLORS.surface[50]} />}
            </IconButton>
          </View>

          {/* Close Shift Button */}
          <View className="flex-1">
            <IconButton
              icon={LogOut}
              variant="xl"
              color={COLORS.surface[50]}
              onPress={onOpenCloseShift}
              className="h-16 w-full rounded-2xl border border-white/20 bg-white/10"
            />
          </View>
        </View>

        <HandoverNotesModal ref={handoverNotesModalRef} />

        <Container className="flex-row items-center justify-between rounded-2xl border border-white/10 bg-white/10 p-4 shadow-sm">
          <View className="mr-2 flex-1 flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/10 shadow-sm">
              <MaterialIcons name="person" size={24} color={COLORS.primary.on} />
            </View>
            <View className="flex-1">
              <Text className="font-manrope text-lg font-bold text-white" numberOfLines={1}>
                {employee?.displayName || 'Nhân viên'}
              </Text>
              <Text className="font-manrope text-lg font-medium text-white/60" numberOfLines={1}>
                {employee?.roles?.length ? `Role: ${employee.roles.join(', ')}` : 'Role: N/A'}
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
  const { cashSessionId } = useAppContext()

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

      <CloseShiftModal ref={closeShiftModalRef} shiftId={cashSessionId ?? undefined} />
    </View>
  )
}
