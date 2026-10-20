import { IMinPrinterDriver, useConnectionStore } from '@/core/hardware'
import { useAppStore, useCashSessionId, useEmployee } from '@/features/app'
import { logout } from '@/features/auth'
import { HandoverNotesModal, HandoverNotesModalRef, useNoteStore } from '@/features/note'
import { useUnsyncedOrdersCount } from '@/features/order/hooks'
import { CloseShiftModal, CloseShiftModalRef } from '@/features/shift'
import {
  Button,
  CartIcon,
  CashDrawerIcon,
  Container,
  DebtIcon,
  IconButton,
  IconButtonWithBadge,
  LogoSkystore,
  SettingIcon,
  SettingsModal,
  SettingsModalRef,
  WorkingIcon,
} from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { useSync } from '@/shared/lib/database/sync'
import { toast, useAlertStore } from '@/shared/store'
import { Href, Tabs, usePathname, useRouter } from 'expo-router'
import { ClipboardList, LogOut, RefreshCw, Terminal } from 'lucide-react-native'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  ...(__DEV__ ? [{ name: 'dev_control', label: 'Dev Control', icon: Terminal }] : []),
]

const SidebarHeaderLogoOrDowntime = React.memo(() => {
  const offlineReason = useConnectionStore((s) => s.offlineReason)
  const downtimeStartTime = useConnectionStore((s) => s.downtimeStartTime)
  const checkServerHealth = useConnectionStore((s) => s.checkServerHealth)

  const [elapsedStr, setElapsedStr] = useState<string>('00:00')

  useEffect(() => {
    if (!downtimeStartTime) {
      setElapsedStr('00:00')
      return
    }

    const updateTimer = () => {
      const diffSecs = Math.max(0, Math.floor((Date.now() - downtimeStartTime) / 1000))
      const hrs = Math.floor(diffSecs / 3600)
      const mins = Math.floor((diffSecs % 3600) / 60)
      const secs = diffSecs % 60
      const pad = (n: number) => String(n).padStart(2, '0')

      if (hrs > 0) {
        setElapsedStr(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`)
      } else {
        setElapsedStr(`${pad(mins)}:${pad(secs)}`)
      }
    }

    updateTimer()
    const timerId = setInterval(updateTimer, 1000)
    return () => clearInterval(timerId)
  }, [downtimeStartTime])

  if (!offlineReason) {
    return (
      <View className="w-full items-center justify-center pb-6 pt-2">
        <LogoSkystore width={180} height={100} color="#ffffff" />
      </View>
    )
  }

  const isNetworkError = offlineReason === 'NETWORK'
  const reasonText = isNetworkError ? 'MẤT MẠNG INTERNET' : 'SẬP SERVER'

  const theme = isNetworkError
    ? {
        bg: 'bg-amber-500/20',
        border: 'border-amber-400/40',
        dot: 'bg-amber-400',
        textTitle: 'text-amber-200',
      }
    : {
        bg: 'bg-rose-500/20',
        border: 'border-rose-400/40',
        dot: 'bg-rose-400',
        textTitle: 'text-rose-200',
      }

  return (
    <View className="h-[126px] w-full items-center justify-center px-3 pb-6 pt-2">
      <Pressable
        onPress={() => checkServerHealth()}
        className={`h-full w-full flex-col items-center justify-center rounded-2xl border ${theme.border} ${theme.bg} p-3 active:opacity-80`}
      >
        <View className="flex-row items-center gap-2 pb-1.5">
          <View className={`h-2.5 w-2.5 rounded-full ${theme.dot}`} />
          <Text className={`font-manrope text-[13px] font-bold tracking-wide ${theme.textTitle}`}>
            {reasonText}
          </Text>
        </View>

        <Text className="font-mono text-[24px] font-extrabold tracking-wider text-white">
          {elapsedStr}
        </Text>
      </Pressable>
    </View>
  )
})
SidebarHeaderLogoOrDowntime.displayName = 'SidebarHeaderLogoOrDowntime'

const NoteSidebarButton = React.memo(() => {
  const handoverNotesModalRef = useRef<HandoverNotesModalRef>(null)
  const { notes, loadNotes } = useNoteStore()
  const pendingNotesCount = useMemo(() => notes.filter((n) => !n.isCompleted).length, [notes])

  useEffect(() => {
    loadNotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <IconButtonWithBadge
        icon={ClipboardList}
        variant="xl"
        color={COLORS.surface[50]}
        onPress={() => handoverNotesModalRef.current?.open()}
        className="h-14 w-full rounded-2xl border border-white/20 bg-white/10"
        badgeCount={pendingNotesCount}
        containerClassName="flex-1"
      />
      <HandoverNotesModal ref={handoverNotesModalRef} />
    </>
  )
})
NoteSidebarButton.displayName = 'NoteSidebarButton'

const SyncSidebarButton = React.memo(() => {
  const { syncNow, isSyncing } = useSync()
  const unsyncedOrdersCount = useUnsyncedOrdersCount()

  return (
    <IconButtonWithBadge
      icon={isSyncing ? undefined : RefreshCw}
      variant="xl"
      color={COLORS.surface[50]}
      onPress={syncNow}
      className="h-14 w-full rounded-2xl border border-white/20 bg-white/10"
      disabled={isSyncing}
      badgeCount={unsyncedOrdersCount}
      containerClassName="flex-1"
    >
      {isSyncing && <ActivityIndicator size="small" color={COLORS.surface[50]} />}
    </IconButtonWithBadge>
  )
})
SyncSidebarButton.displayName = 'SyncSidebarButton'

// ── Wrapper nhỏ: chỉ subscribe pathname, re-render rẻ ──
function SidebarWithRoute(props: { onOpenCloseShift: () => void; onOpenSettings: () => void }) {
  const pathname = usePathname()
  // pathname dạng "/(tab)/pos" → lấy segment cuối
  const routeTab = pathname.split('/').pop() || 'pos'
  return <CustomSidebarInner routeTab={routeTab} {...props} />
}

const CustomSidebarInner = React.memo(
  ({
    routeTab,
    onOpenCloseShift,
    onOpenSettings,
  }: {
    routeTab: string
    onOpenCloseShift: () => void
    onOpenSettings: () => void
  }) => {
    const insets = useSafeAreaInsets()
    const employee = useEmployee()
    const router = useRouter()
    const confirm = useAlertStore((s) => s.confirm)

    // Highlight ngay khi bấm; segments chỉ clear pending khi route đã khớp
    const [pendingTab, setPendingTab] = useState<string | null>(null)
    const activeTab = pendingTab ?? routeTab

    useEffect(() => {
      if (pendingTab && routeTab === pendingTab) setPendingTab(null)
    }, [routeTab, pendingTab])

    const handleLogout = useCallback(() => {
      confirm({
        title: 'Đăng xuất tài khoản',
        message: 'Bạn có chắc chắn muốn đăng xuất và đổi nhân viên khác không?',
        onConfirm: () => {
          setTimeout(() => {
            const store = useAppStore.getState()
            const appService = store.appService
            if (appService) {
              const refreshToken = store.getRefreshToken()
              if (refreshToken) {
                logout(refreshToken).catch(() => {})
              }
              appService.send({ type: 'LOGGED_OUT' })
              toast.success('Đã đăng xuất nhân viên')
            } else {
              toast.error('App Service chưa sẵn sàng')
            }
          }, 150)
        },
      })
    }, [confirm])

    const handleTabPress = useCallback(
      (name: string) => {
        if (name === activeTab && !pendingTab) return
        setPendingTab(name)
        // Paint highlight trước; navigate frame sau để tránh block cùng commit mount màn nặng
        requestAnimationFrame(() => {
          router.navigate(`/(tab)/${name}` as Href)
        })
      },
      [activeTab, pendingTab, router],
    )

    const handleOpenCashbox = useCallback(async () => {
      try {
        await IMinPrinterDriver.openCashBox()
      } catch (err: any) {
        toast.error('Lỗi mở két: ' + (err?.message ?? 'Không xác định'))
      }
    }, [])

    return (
      <View
        className="h-full w-[280px] flex-col justify-between bg-primary px-0"
        style={{ paddingTop: insets.top + 24, paddingBottom: 16 }}
      >
        <View>
          {/* Logo / Downtime Counter */}
          <SidebarHeaderLogoOrDowntime />

          {/* Nav Items */}
          <View className="gap-3">
            {MENU_ITEMS.map((item) => {
              const isFocused = activeTab === item.name
              const activeColor = COLORS.primary.on
              const inactiveColor = COLORS.primary.on

              return (
                <Pressable
                  key={item.name}
                  focusable={false}
                  onPress={() => handleTabPress(item.name)}
                  className={
                    isFocused
                      ? 'h-[120px] w-full flex-col items-center justify-center gap-2 bg-primary-deep px-6 py-3'
                      : 'h-[120px] w-full flex-col items-center justify-center gap-2 bg-transparent px-6 py-3 active:bg-primary-deep/50'
                  }
                >
                  <item.icon size={40} color={isFocused ? activeColor : inactiveColor} />

                  <Text
                    className={
                      'text-center font-manrope text-[20px] font-bold leading-[28px] text-white'
                    }
                  >
                    {item.label}
                  </Text>
                </Pressable>
              )
            })}

            {/* Mở két (Cashbox) Button */}
            <Pressable
              focusable={false}
              onPress={handleOpenCashbox}
              className="h-[120px] w-full flex-col items-center justify-center gap-2 bg-transparent px-6 py-3 active:bg-primary-deep/50"
            >
              <CashDrawerIcon size={46} color={COLORS.primary.on} />
              <Text className="text-center font-manrope text-[20px] font-bold leading-[28px] text-white">
                Mở két
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Sidebar Bottom Info */}
        <View className="gap-4 px-4 pb-2">
          {/* Actions Row */}
          <View className="flex-row items-center justify-between gap-3">
            {/* Note Button */}
            <NoteSidebarButton />

            {/* Settings Button */}
            <View className="flex-1">
              <IconButton
                variant="xl"
                onPress={onOpenSettings}
                className="h-14 w-full rounded-2xl border border-white/20 bg-white/10"
              >
                <SettingIcon size={32} color={COLORS.surface[50]} />
              </IconButton>
            </View>

            {/* Sync Button */}
            <SyncSidebarButton />

            {/* Logout Button */}
            <View className="flex-1">
              <IconButton
                icon={LogOut}
                variant="xl"
                color={COLORS.surface[50]}
                onPress={handleLogout}
                className="h-14 w-full rounded-2xl border border-white/20 bg-white/10"
              />
            </View>
          </View>

          <Button
            label="KẾT CA"
            variant="outline"
            className="h-14 w-full rounded-2xl border border-white/20 bg-white/10"
            textClassName="text-white font-manrope text-[18px] font-bold leading-[26px]"
            onPress={onOpenCloseShift}
          />

          <Container className="flex-row items-center justify-between rounded-2xl border border-white/10 bg-white/10 p-4 shadow-sm">
            <View className="mr-2 flex-1 flex-row items-center gap-3">
              <View className="flex-1">
                <Text
                  className="text-center font-manrope text-lg font-bold text-white"
                  numberOfLines={1}
                >
                  {employee?.displayName || 'Nhân viên'}
                </Text>
              </View>
            </View>
          </Container>
        </View>
      </View>
    )
  },
)

CustomSidebarInner.displayName = 'CustomSidebarInner'

SidebarWithRoute.displayName = 'SidebarWithRoute'

export default function TabLayout() {
  const cashSessionId = useCashSessionId()

  const closeShiftModalRef = useRef<CloseShiftModalRef>(null)
  const settingsModalRef = useRef<SettingsModalRef>(null)

  const handleOpenCloseShift = useCallback(() => {
    closeShiftModalRef.current?.open()
  }, [])

  const handleOpenSettings = useCallback(() => {
    settingsModalRef.current?.open()
  }, [])

  return (
    <View className="flex-1 flex-row">
      <SidebarWithRoute
        onOpenCloseShift={handleOpenCloseShift}
        onOpenSettings={handleOpenSettings}
      />

      <View className="flex-1">
        <Tabs
          tabBar={() => null}
          screenOptions={{
            headerShown: false,
            // Lần 1: mount khi vào. Lần sau: native show + freeze inactive → không re-render tab ẩn
            lazy: true,
            freezeOnBlur: false,
            sceneStyle: { backgroundColor: COLORS.surface[50] },
          }}
        >
          <Tabs.Screen name="pos" options={{ title: 'Bán hàng' }} />
          <Tabs.Screen name="orders" options={{ title: 'Đơn hàng' }} />
          <Tabs.Screen name="dashboard" options={{ title: 'Báo cáo' }} />
          <Tabs.Screen
            name="dev_control"
            options={{
              title: 'Dev Control',
              href: __DEV__ ? undefined : null,
            }}
          />
        </Tabs>
      </View>

      <CloseShiftModal ref={closeShiftModalRef} shiftId={cashSessionId ?? undefined} />
      <SettingsModal ref={settingsModalRef} />
    </View>
  )
}
