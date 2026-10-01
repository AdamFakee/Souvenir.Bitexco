import { useAffiliates } from '@/features/pos'
import {
  ReconciliationModal,
  type ReconciliationModalRef,
} from '@/features/order/components/reconciliation-modal'
import { LazyTabShell } from '@/shared/components/ui/lazy-tab-shell'
import type { Affiliate , IOrder } from '@/shared/types'
import { Select } from '@/shared/components/ui/select'
import { ModeTabs } from '@/features/order/components/mode-tabs'
import {
  OrderDetailModal,
  type OrderDetailModalRef,
} from '@/features/order/components/order-detail-modal'
import { OrderFilterBar } from '@/features/order/components/order-filter-bar'
import { OrderList } from '@/features/order/components/order-list'
import { OrderStatsFooter } from '@/features/order/components/order-stats-footer'
import { OrdersSkeleton } from '@/features/order/components/orders-skeleton'
import {
  RefundConfirmModal,
  type RefundConfirmModalRef,
} from '@/features/order/components/refund-confirm-modal'
import { useOfflineOrders, useOrders } from '@/features/order/hooks'
import { useOrderFilterStore } from '@/features/order/store/use-order-filter-store'
import { toast, useAlertStore } from '@/shared/store'
import { useIsFocused } from '@react-navigation/native'
import { useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { InteractionManager, Pressable, Text, View } from 'react-native'

export type OrderMode = 'all' | 'pos' | 'collaborator' | 'agent' | 'offline'

// ── Guide owner select (CTV / Đối tác) with isolated queries ──
const GuideOwnerBar = memo(function GuideOwnerBar({
  mode,
  activeId,
  onChangeId,
  onPreviewReconciliation,
}: {
  mode: 'collaborator' | 'agent'
  activeId: string | null
  onChangeId: (id: string | null) => void
  onPreviewReconciliation: (ownerName: string, ownerCode: string) => void
}) {
  const { data: owners = [] } = useAffiliates({
    agentType: mode,
    hasTransaction: true,
    isActive: true,
  })

  const options = useMemo(() => {
    if (mode === 'collaborator') {
      return [
        { label: 'Tất cả Cộng tác viên', value: '' },
        ...owners.map((a: Affiliate) => ({ label: `${a.name} (${a.code})`, value: a.id })),
      ]
    }
    return [
      { label: 'Tất cả Đối tác', value: '' },
      ...owners.map((p: Affiliate) => ({ label: `${p.name} (${p.code})`, value: p.id })),
    ]
  }, [mode, owners])

  const handleReconcilePress = useCallback(() => {
    if (!activeId) {
      toast.info(
        `Vui lòng chọn cụ thể một ${mode === 'collaborator' ? 'Cộng tác viên' : 'Đối tác'} để đối soát.`,
        `Yêu cầu chọn ${mode === 'collaborator' ? 'CTV' : 'Đối tác'}`,
      )
      return
    }
    const activeOwner = owners.find((o: Affiliate) => o.id === activeId)
    if (activeOwner) {
      onPreviewReconciliation(activeOwner.name, activeOwner.code)
    }
  }, [mode, activeId, owners, onPreviewReconciliation])

  return (
    <View className="mb-4 flex-row items-center gap-3">
      <Select
        options={options}
        value={activeId}
        onChange={onChangeId}
        placeholder={`Tất cả ${mode === 'collaborator' ? 'Cộng tác viên' : 'Đối tác'}`}
        className="flex-1"
        triggerClassName="h-[64px] rounded-xl"
        triggerTextClassName="text-[20px] font-bold text-surface-on"
      />
      {mode === 'collaborator' && (
        <Pressable
          onPress={handleReconcilePress}
          disabled={!activeId}
          className={`h-[64px] items-center justify-center rounded-xl px-8 ${
            activeId ? 'bg-primary' : 'bg-outline'
          }`}
        >
          <Text className="font-manrope-bold text-[20px] font-black text-white">Xem biên nhận</Text>
        </Pressable>
      )}
    </View>
  )
})

// ── Online Orders Results ──────────────────────────────────
const OnlineOrdersResults = memo(function OnlineOrdersResults({
  mode,
  affiliateId,
  partnerId,
  activeId,
  onChangeId,
  onPreviewReconciliation,
  onOpenDetails,
  onExchange,
  onRefund,
  visible,
}: {
  mode: OrderMode
  affiliateId: string | null
  partnerId: string | null
  activeId: string | null
  onChangeId: (id: string | null) => void
  onPreviewReconciliation: (ownerName: string, ownerCode: string) => void
  onOpenDetails: (order: IOrder) => void
  onExchange: (order: IOrder) => void
  onRefund: (order: IOrder) => void
  visible: boolean
}) {
  const isFocused = useIsFocused()
  const isReallyVisible = visible && isFocused

  // Tránh việc 4 tab cùng gọi API 1 lúc khi user đổi ngày tháng (DateFilter).
  // Cho phép tab ẩn được fetch 1 lần duy nhất lúc vừa mount (để lấy cache), sau 2s thì khoá lại, chỉ fetch khi visible.
  const hasInitialized = useRef(false)
  useEffect(() => {
    const t = setTimeout(() => {
      hasInitialized.current = true
    }, 2000)
    return () => clearTimeout(t)
  }, [])

  const status = useOrderFilterStore((s) => s.status)
  const dateFrom = useOrderFilterStore((s) => s.dateFrom)
  const dateTo = useOrderFilterStore((s) => s.dateTo)
  const staffId = useOrderFilterStore((s) => s.staffId)
  const paymentMethod = useOrderFilterStore((s) => s.paymentMethod)

  const guideType =
    mode === 'all'
      ? null
      : mode === 'pos'
        ? ('retail' as const)
        : mode === 'collaborator'
          ? ('collaborator' as const)
          : ('agent' as const)

  const {
    orders,
    stats,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isFetching,
  } = useOrders({
    status,
    dateFrom,
    dateTo,
    staffId,
    affiliateId: mode === 'collaborator' ? affiliateId : null,
    partnerId: mode === 'agent' ? partnerId : null,
    guideType,
    paymentMethod,
    enabled: visible || !hasInitialized.current,
  })

  const [refreshing, setRefreshing] = useState(false)

  // Debounced EasyLoading: chỉ show nếu fetch kéo dài > 150ms (tránh flicker khi cache hit nhanh)
  useEffect(() => {
    if (!isReallyVisible) return
    if (!isFetching || isLoading || refreshing) {
      useAlertStore.getState().hideLoading()
      return
    }
    const timer = setTimeout(() => {
      useAlertStore.getState().showLoading()
    }, 150)
    return () => {
      clearTimeout(timer)
      useAlertStore.getState().hideLoading()
    }
  }, [isFetching, isLoading, isReallyVisible, refreshing])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }, [refetch])

  return (
    <View className="flex-1">
      {mode === 'collaborator' && (
        <GuideOwnerBar
          mode="collaborator"
          activeId={activeId}
          onChangeId={onChangeId}
          onPreviewReconciliation={onPreviewReconciliation}
        />
      )}
      {mode === 'agent' && (
        <GuideOwnerBar
          mode="agent"
          activeId={activeId}
          onChangeId={onChangeId}
          onPreviewReconciliation={onPreviewReconciliation}
        />
      )}
      <View className="flex-1 rounded-lg border border-outline">
        <OrderList
          mode={mode}
          onOpenDetails={onOpenDetails}
          onExchange={onExchange}
          onRefund={onRefund}
          orders={orders}
          isLoading={isLoading}
          fetchNextPage={fetchNextPage}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onRefresh={handleRefresh}
          refreshing={refreshing}
        />
        <OrderStatsFooter stats={stats} />
      </View>
    </View>
  )
})

// ── Offline Orders Results ─────────────────────────────────
const OfflineOrdersResults = memo(function OfflineOrdersResults({
  onOpenDetails,
  onExchange,
  onRefund,
  visible,
}: {
  onOpenDetails: (order: IOrder) => void
  onExchange: (order: IOrder) => void
  onRefund: (order: IOrder) => void
  visible: boolean
}) {
  const { orders, stats, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useOfflineOrders()

  const [refreshing, setRefreshing] = useState(false)
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await refetch()
    } finally {
      setRefreshing(false)
    }
  }, [refetch])

  return (
    <View className="flex-1 rounded-lg border border-outline">
      <OrderList
        mode="offline"
        onOpenDetails={onOpenDetails}
        onExchange={onExchange}
        onRefund={onRefund}
        orders={orders}
        isLoading={isLoading}
        fetchNextPage={fetchNextPage}
        hasNextPage={!!hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />
      <OrderStatsFooter stats={stats} />
    </View>
  )
})

// ── Screen shell: mode + chrome only ───────────────────────
function OrdersContent() {
  const queryClient = useQueryClient()
  const modalRef = useRef<OrderDetailModalRef>(null)
  const reconciliationModalRef = useRef<ReconciliationModalRef>(null)
  const refundModalRef = useRef<RefundConfirmModalRef>(null)

  // mode: Dành cho UI của thanh Tab (cập nhật ngay lập tức)
  const [mode, setMode] = useState<OrderMode>('all')

  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string | null>(null)
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null)

  // Khởi tạo chỉ với tab 'all' để lazy load các tab còn lại, tránh lag và render shimmer quá nhiều
  const [mountedModes, setMountedModes] = useState<Set<OrderMode>>(new Set(['all']))

  // TỐI ƯU: Lén lút mount các Tab còn lại ở background một cách "nhỏ giọt" (staggered).
  // Đợi UI nghỉ ngơi xong mới nạp từng tab (cách nhau 800ms) để không gây lag/đơ máy.
  useEffect(() => {
    const queue = ['pos', 'collaborator', 'agent'] as OrderMode[]

    const mountNext = () => {
      const nextMode = queue.shift()
      if (!nextMode) return

      InteractionManager.runAfterInteractions(() => {
        setMountedModes((prev) => {
          if (prev.has(nextMode)) return prev
          const next = new Set(prev)
          next.add(nextMode)
          return next
        })

        // Nghỉ 800ms cho JS thread thở trước khi nạp tab tiếp theo
        setTimeout(mountNext, 800)
      })
    }

    const t = setTimeout(mountNext, 1500)
    return () => {
      clearTimeout(t)
      queue.length = 0 // Huỷ queue nếu unmount
    }
  }, []) // Lazy mount modals on first user interaction (tối ưu: tách riêng rẽ từng modal)
  const [mountDetail, setMountDetail] = useState(false)
  const [mountRefund, setMountRefund] = useState(false)
  const [mountRecon, setMountRecon] = useState(false)

  const mountDetailRef = useRef(false)
  const mountRefundRef = useRef(false)
  const mountReconRef = useRef(false)

  const pendingDetail = useRef<IOrder | null>(null)
  const pendingRefund = useRef<IOrder | null>(null)
  const pendingRecon = useRef<Parameters<ReconciliationModalRef['open']>[0] | null>(null)

  useEffect(() => {
    if (mountDetail && pendingDetail.current) {
      modalRef.current?.open(pendingDetail.current)
      pendingDetail.current = null
    }
  }, [mountDetail])

  useEffect(() => {
    if (mountRefund && pendingRefund.current) {
      refundModalRef.current?.open(pendingRefund.current)
      pendingRefund.current = null
    }
  }, [mountRefund])

  useEffect(() => {
    if (mountRecon && pendingRecon.current) {
      reconciliationModalRef.current?.open(pendingRecon.current)
      pendingRecon.current = null
    }
  }, [mountRecon])

  const activeId =
    mode === 'collaborator' ? selectedAffiliateId : mode === 'agent' ? selectedPartnerId : null

  const setActiveId = useCallback(
    (id: string | null) => {
      if (mode === 'collaborator') {
        setSelectedAffiliateId(id)
        setSelectedPartnerId(null)
      } else {
        setSelectedPartnerId(id)
        setSelectedAffiliateId(null)
      }
    },
    [mode],
  )

  const handleOpenDetails = useCallback((order: IOrder) => {
    if (!mountDetailRef.current) {
      pendingDetail.current = order
      mountDetailRef.current = true
      setMountDetail(true)
      return
    }
    modalRef.current?.open(order)
  }, [])

  const handleExchange = useCallback(
    (order: IOrder) => {
      queryClient.setQueryData(['exchange-order', order.id], order)
      router.push({ pathname: '/exchange', params: { orderId: order.id } })
    },
    [queryClient],
  )

  const handleRefund = useCallback((order: IOrder) => {
    if (!mountRefundRef.current) {
      pendingRefund.current = order
      mountRefundRef.current = true
      setMountRefund(true)
      return
    }
    refundModalRef.current?.open(order)
  }, [])

  const handleRefundSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['orders'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
  }, [queryClient])

  const handlePreviewReconciliation = useCallback(
    (ownerName: string, ownerCode: string) => {
      if (mode === 'pos' || mode === 'all' || mode === 'offline') return

      const { dateFrom, dateTo } = useOrderFilterStore.getState()
      if (!dateFrom || !dateTo) {
        toast.info('Vui lòng chọn khoảng thời gian để đối soát.', 'Thiếu khoảng ngày')
        return
      }

      const payload = {
        ownerName,
        ownerCode,
        ownerType: mode as 'collaborator' | 'agent',
        partnerId: mode === 'agent' ? selectedPartnerId : null,
        affiliateId: mode === 'collaborator' ? selectedAffiliateId : null,
        dateFrom,
        dateTo,
      }
      if (!mountReconRef.current) {
        pendingRecon.current = payload
        mountReconRef.current = true
        setMountRecon(true)
        return
      }
      reconciliationModalRef.current?.open(payload)
    },
    [mode, selectedAffiliateId, selectedPartnerId],
  )

  const handleTabChange = useCallback(
    (newMode: OrderMode) => {
      if (mode === newMode) return

      // Đổi màu tab ngay lập tức
      setMode(newMode)
      setSelectedAffiliateId(null)
      setSelectedPartnerId(null)

      // Trì hoãn việc mount List để nhường luồng cho UI chạy animation mượt mà
      requestAnimationFrame(() => {
        setMountedModes((prev) => (prev.has(newMode) ? prev : new Set([...prev, newMode])))
      })
    },
    [mode],
  )

  return (
    <View className="flex-1 py-2">
      <View className="flex-1 bg-white">
        <ModeTabs mode={mode} onChangeMode={handleTabChange} />

        <View
          className="flex-1 rounded-b-xl rounded-tr-xl px-5 pb-5 pt-4"
          style={{
            backgroundColor: '#fff',
            shadowColor: '#A8A8A8',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 32,
            elevation: 4,
          }}
        >
          {/* Đã tối ưu gộp chung 1 component để tránh phình to cây DOM */}
          <View className="flex-none">
            <OrderFilterBar showStaffFilter={mode !== 'offline'} hideFilters={mode === 'offline'} />
          </View>

          <View className="relative flex-1">
            {['all', 'pos', 'collaborator', 'agent'].map((m) =>
              mountedModes.has(m as OrderMode) ? (
                <View
                  key={m}
                  className="absolute inset-0"
                  style={mode === m ? { opacity: 1, zIndex: 1 } : { opacity: 0, zIndex: -1 }}
                  pointerEvents={mode === m ? 'auto' : 'none'}
                >
                  <OnlineOrdersResults
                    mode={m as OrderMode}
                    affiliateId={selectedAffiliateId}
                    partnerId={selectedPartnerId}
                    activeId={activeId}
                    onChangeId={setActiveId}
                    onPreviewReconciliation={handlePreviewReconciliation}
                    onOpenDetails={handleOpenDetails}
                    onExchange={handleExchange}
                    onRefund={handleRefund}
                    visible={mode === m}
                  />
                </View>
              ) : null,
            )}
            {mountedModes.has('offline') ? (
              <View
                key="offline"
                className="absolute inset-0"
                style={mode === 'offline' ? { opacity: 1, zIndex: 1 } : { opacity: 0, zIndex: -1 }}
                pointerEvents={mode === 'offline' ? 'auto' : 'none'}
              >
                <OfflineOrdersResults
                  onOpenDetails={handleOpenDetails}
                  onExchange={handleExchange}
                  onRefund={handleRefund}
                  visible={mode === 'offline'}
                />
              </View>
            ) : null}
          </View>
        </View>

        {mountDetail ? <OrderDetailModal ref={modalRef} /> : null}
        {mountRecon ? <ReconciliationModal ref={reconciliationModalRef} /> : null}
        {mountRefund ? (
          <RefundConfirmModal ref={refundModalRef} onSuccess={handleRefundSuccess} />
        ) : null}
      </View>
    </View>
  )
}

export default function OrdersScreen() {
  return <LazyTabShell Content={OrdersContent} skeleton={<OrdersSkeleton />} />
}
