import { Select } from '@/shared/components/ui/select'
import { OrderRemoteAPI } from '@/shared/features/order/api/remote/order.remote.api'
import {
  OrderDetailModal,
  type OrderDetailModalRef,
} from '@/shared/features/order/components/order-detail-modal'
import { OrderFilterBar } from '@/shared/features/order/components/order-filter-bar'
import { OrderList } from '@/shared/features/order/components/order-list'
import { OrderStatsFooter } from '@/shared/features/order/components/order-stats-footer'
import {
  ReconciliationModal,
  type ReconciliationModalRef,
} from '@/shared/features/order/components/reconciliation-modal'
import {
  RefundConfirmModal,
  type RefundConfirmModalRef,
} from '@/shared/features/order/components/refund-confirm-modal'
import { useOrders } from '@/shared/features/order/hooks/use-orders'
import { useOrderFilterStore } from '@/shared/features/order/store/use-order-filter-store'
import type { IOrder, Partner } from '@/shared/features/order/types'
import type { Affiliate } from '@/shared/features/pos/types/cart.types'
import { toast } from '@/shared/store'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type OrderMode = 'all' | 'pos' | 'collaborator' | 'agent'

const MODE_TABS = [
  { label: 'Tất cả', value: 'all' as const },
  { label: 'Khách lẻ', value: 'pos' as const },
  { label: 'Cộng tác viên', value: 'collaborator' as const },
  { label: 'Đối tác', value: 'agent' as const },
] as const

// ── Mode tabs ──────────────────────────────────────────────
const TopTabs = memo(function TopTabs({
  mode,
  onChangeMode,
}: {
  mode: OrderMode
  onChangeMode: (v: OrderMode) => void
}) {
  return (
    <View className="flex-row gap-2 px-4 pt-3">
      {MODE_TABS.map((tab) => {
        const active = mode === tab.value
        return (
          <Pressable
            key={tab.value}
            onPress={() => onChangeMode(tab.value)}
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
              adjustsFontSizeToFit
            >
              {tab.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
})

// ── Guide owner select (CTV / Đối tác) ──────────────────────
const GuideOwnerBar = memo(function GuideOwnerBar({
  mode,
  affiliates,
  partners,
  activeId,
  onChangeId,
  onPreviewReconciliation,
}: {
  mode: 'collaborator' | 'agent'
  affiliates: Affiliate[]
  partners: Partner[]
  activeId: string | null
  onChangeId: (id: string | null) => void
  onPreviewReconciliation: () => void
}) {
  const options = useMemo(() => {
    if (mode === 'collaborator') {
      return [
        { label: 'Tất cả Cộng tác viên', value: '' },
        ...affiliates.map((a) => ({ label: `${a.name} (${a.code})`, value: a.id })),
      ]
    }
    return [
      { label: 'Tất cả Đối tác', value: '' },
      ...partners.map((p) => ({ label: `${p.nameVi} (${p.code})`, value: p.id })),
    ]
  }, [mode, affiliates, partners])

  return (
    <View className="mb-4 flex-row items-center gap-3">
      <Select
        options={options}
        value={activeId}
        onChange={onChangeId}
        placeholder={`Tất cả ${mode === 'collaborator' ? 'Cộng tác viên' : 'Đối tác'}`}
        className="flex-1"
        triggerClassName="h-[64px] rounded-xl"
        triggerTextClassName="text-[20px] font-bold"
      />
      {mode === 'collaborator' && (
        <Pressable
          onPress={onPreviewReconciliation}
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

// ── List + stats: owns useOrders so search/filter refetch không kéo shell ──
const OrdersResults = memo(function OrdersResults({
  mode,
  affiliateId,
  partnerId,
  onOpenDetails,
  onExchange,
  onRefund,
}: {
  mode: OrderMode
  affiliateId: string | null
  partnerId: string | null
  onOpenDetails: (order: IOrder) => void
  onExchange: (order: IOrder) => void
  onRefund: (order: IOrder) => void
}) {
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

  const { orders, stats, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useOrders({
    status,
    dateFrom,
    dateTo,
    staffId,
    affiliateId: mode === 'collaborator' ? affiliateId : null,
    partnerId: mode === 'agent' ? partnerId : null,
    guideType,
    paymentMethod,
  })

  return (
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
      />
      <OrderStatsFooter stats={stats} />
    </View>
  )
})

// ── Screen shell: mode + chrome only ───────────────────────
export default function OrdersScreen() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const modalRef = useRef<OrderDetailModalRef>(null)
  const reconciliationModalRef = useRef<ReconciliationModalRef>(null)
  const refundModalRef = useRef<RefundConfirmModalRef>(null)

  const [mode, setMode] = useState<OrderMode>('pos')
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string | null>(null)
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null)

  // Modal nặng (refund machine + receipt) mount sau paint / khi user cần
  const [mountModals, setMountModals] = useState(false)
  const mountModalsRef = useRef(false)
  const pendingDetail = useRef<IOrder | null>(null)
  const pendingRefund = useRef<IOrder | null>(null)
  const pendingRecon = useRef<Parameters<ReconciliationModalRef['open']>[0] | null>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      mountModalsRef.current = true
      setMountModals(true)
    }, 0)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!mountModals) return
    if (pendingDetail.current) {
      modalRef.current?.open(pendingDetail.current)
      pendingDetail.current = null
    }
    if (pendingRefund.current) {
      refundModalRef.current?.open(pendingRefund.current)
      pendingRefund.current = null
    }
    if (pendingRecon.current) {
      reconciliationModalRef.current?.open(pendingRecon.current)
      pendingRecon.current = null
    }
  }, [mountModals])

  const dateFrom = useOrderFilterStore((s) => s.dateFrom)
  const dateTo = useOrderFilterStore((s) => s.dateTo)

  const { data: affiliates = [] } = useQuery({
    queryKey: ['pos-affiliates-list', { isActive: true, hasTransaction: true }],
    queryFn: async () =>
      (await OrderRemoteAPI.getAffiliates({ isActive: true, hasTransaction: true })).items,
    enabled: mode === 'collaborator',
    staleTime: 5 * 60 * 1000,
  })

  const { data: partners = [] } = useQuery({
    queryKey: ['pos-partners-list', { isActive: true, hasTransaction: true }],
    queryFn: async () =>
      (await OrderRemoteAPI.getPartners({ isActive: true, hasTransaction: true })).items,
    enabled: mode === 'agent',
    staleTime: 5 * 60 * 1000,
  })

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
    console.log('detail:: ', JSON.stringify(order, null, 2))
    if (!mountModalsRef.current) {
      pendingDetail.current = order
      mountModalsRef.current = true
      setMountModals(true)
      return
    }
    modalRef.current?.open(order)
  }, [])

  const handleExchange = useCallback(
    (order: IOrder) => {
      queryClient.setQueryData(['exchange-order', order.id], order)
      router.push({ pathname: '/exchange', params: { orderId: order.id } })
    },
    [queryClient, router],
  )

  const handleRefund = useCallback((order: IOrder) => {
    if (!mountModalsRef.current) {
      pendingRefund.current = order
      mountModalsRef.current = true
      setMountModals(true)
      return
    }
    refundModalRef.current?.open(order)
  }, [])

  const handleRefundSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['orders'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
  }, [queryClient])

  const handlePreviewReconciliation = useCallback(() => {
    if (mode === 'pos' || mode === 'all') return

    let ownerName = ''
    let ownerCode = ''

    if (mode === 'collaborator') {
      if (!selectedAffiliateId) {
        toast.info('Vui lòng chọn cụ thể một Cộng tác viên để đối soát.', 'Yêu cầu chọn CTV')
        return
      }
      const activeAff = affiliates.find((a) => a.id === selectedAffiliateId)
      if (activeAff) {
        ownerName = activeAff.name
        ownerCode = activeAff.code
      }
    } else {
      if (!selectedPartnerId) {
        toast.info('Vui lòng chọn cụ thể một Đối tác để đối soát.', 'Yêu cầu chọn Đối tác')
        return
      }
      const activePartner = partners.find((p) => p.id === selectedPartnerId)
      if (activePartner) {
        ownerName = activePartner.nameVi
        ownerCode = activePartner.code
      }
    }

    if (!dateFrom || !dateTo) {
      toast.info('Vui lòng chọn khoảng thời gian để đối soát.', 'Thiếu khoảng ngày')
      return
    }

    const payload = {
      ownerName,
      ownerCode,
      ownerType: mode,
      partnerId: mode === 'agent' ? selectedPartnerId : null,
      affiliateId: mode === 'collaborator' ? selectedAffiliateId : null,
      dateFrom,
      dateTo,
    }
    if (!mountModalsRef.current) {
      pendingRecon.current = payload
      mountModalsRef.current = true
      setMountModals(true)
      return
    }
    reconciliationModalRef.current?.open(payload)
  }, [mode, selectedAffiliateId, selectedPartnerId, affiliates, partners, dateFrom, dateTo])

  return (
    <SafeAreaView className="flex-1">
      <View className="flex-1 bg-white">
        <TopTabs mode={mode} onChangeMode={setMode} />

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
          <OrderFilterBar showStaffFilter />

          {mode !== 'pos' && mode !== 'all' ? (
            <GuideOwnerBar
              mode={mode}
              affiliates={affiliates}
              partners={partners}
              activeId={activeId}
              onChangeId={setActiveId}
              onPreviewReconciliation={handlePreviewReconciliation}
            />
          ) : null}

          <OrdersResults
            mode={mode}
            affiliateId={selectedAffiliateId}
            partnerId={selectedPartnerId}
            onOpenDetails={handleOpenDetails}
            onExchange={handleExchange}
            onRefund={handleRefund}
          />
        </View>

        {mountModals ? (
          <>
            <OrderDetailModal ref={modalRef} />
            <ReconciliationModal ref={reconciliationModalRef} />
            <RefundConfirmModal ref={refundModalRef} onSuccess={handleRefundSuccess} />
          </>
        ) : null}
      </View>
    </SafeAreaView>
  )
}
