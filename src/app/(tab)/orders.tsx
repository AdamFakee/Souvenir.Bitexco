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
import React, { memo, useCallback, useDeferredValue, useMemo, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type OrderMode = 'pos' | 'collaborator' | 'agent'

const MODE_TABS = [
  { label: 'Khách lẻ', value: 'pos' as const },
  { label: 'Cộng tác viên', value: 'collaborator' as const },
  { label: 'Đại lý', value: 'agent' as const },
]

function useStableSelectOptions(
  guideType: 'collaborator' | 'agent',
  affiliates: Affiliate[],
  partners: Partner[],
) {
  return useMemo(() => {
    if (guideType === 'collaborator') {
      const opts: { label: string; value: string }[] = [
        { label: 'Tất cả Cộng tác viên', value: '' },
      ]
      affiliates.forEach((a) => opts.push({ label: `${a.name} (${a.code})`, value: a.id }))
      return opts
    }
    const opts: { label: string; value: string }[] = [{ label: 'Tất cả Đại lý', value: '' }]
    partners.forEach((p) => opts.push({ label: `${p.nameVi} (${p.code})`, value: p.id }))
    return opts
  }, [guideType, affiliates, partners])
}

interface TopTabsProps {
  mode: OrderMode
  onChangeMode: (v: OrderMode) => void
}

const TopTabs = memo(function TopTabs({ mode, onChangeMode }: TopTabsProps) {
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
              className={`font-manrope-bold text-xl font-bold ${
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

export default function OrdersScreen() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const modalRef = useRef<OrderDetailModalRef>(null)
  const reconciliationModalRef = useRef<ReconciliationModalRef>(null)
  const refundModalRef = useRef<RefundConfirmModalRef>(null)

  const [mode, setMode] = useState<OrderMode>('pos')
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string | null>(null)
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null)

  const status = useOrderFilterStore((s) => s.status)
  const searchQuery = useOrderFilterStore((s) => s.searchQuery)
  const dateFrom = useOrderFilterStore((s) => s.dateFrom)
  const dateTo = useOrderFilterStore((s) => s.dateTo)
  const staffId = useOrderFilterStore((s) => s.staffId)
  const paymentMethod = useOrderFilterStore((s) => s.paymentMethod)

  const deferredFilters = useDeferredValue(
    useMemo(
      () => ({
        status,
        searchQuery,
        dateFrom,
        dateTo,
        staffId,
        paymentMethod,
        affiliateId: mode === 'collaborator' ? selectedAffiliateId : null,
        partnerId: mode === 'agent' ? selectedPartnerId : null,
        guideType:
          mode === 'pos'
            ? null
            : mode === 'collaborator'
              ? ('collaborator' as const)
              : ('agent' as const),
      }),
      [
        status,
        searchQuery,
        dateFrom,
        dateTo,
        staffId,
        paymentMethod,
        mode,
        selectedAffiliateId,
        selectedPartnerId,
      ],
    ),
  )

  const { orders, stats, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useOrders({
    status: deferredFilters.status,
    searchQuery: deferredFilters.searchQuery,
    dateFrom: deferredFilters.dateFrom,
    dateTo: deferredFilters.dateTo,
    staffId: deferredFilters.staffId,
    affiliateId: deferredFilters.affiliateId,
    partnerId: deferredFilters.partnerId,
    guideType: deferredFilters.guideType,
    paymentMethod: deferredFilters.paymentMethod,
  })

  const { data: affiliates = [] } = useQuery({
    queryKey: ['pos-affiliates-list'],
    queryFn: async () => {
      const res = await OrderRemoteAPI.getAffiliates()
      return res.items
    },
    enabled: mode === 'collaborator',
  })

  const { data: partners = [] } = useQuery({
    queryKey: ['pos-partners-list'],
    queryFn: async () => {
      const res = await OrderRemoteAPI.getPartners()
      return res.items
    },
    enabled: mode === 'agent',
  })

  const stableGuideType: 'collaborator' | 'agent' = mode === 'agent' ? 'agent' : 'collaborator'
  const selectOptions = useStableSelectOptions(stableGuideType, affiliates, partners)

  const activeId = useMemo(
    () =>
      mode === 'collaborator' ? selectedAffiliateId : mode === 'agent' ? selectedPartnerId : null,
    [mode, selectedAffiliateId, selectedPartnerId],
  )

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
    refundModalRef.current?.open(order)
  }, [])

  const handlePreviewReconciliation = useCallback(() => {
    if (mode === 'pos') return

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
        toast.info('Vui lòng chọn cụ thể một Đại lý để đối soát.', 'Yêu cầu chọn Đại lý')
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

    reconciliationModalRef.current?.open({
      ownerName,
      ownerCode,
      ownerType: mode,
      partnerId: mode === 'agent' ? selectedPartnerId : null,
      affiliateId: mode === 'collaborator' ? selectedAffiliateId : null,
      dateFrom,
      dateTo,
    })
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
          <OrderFilterBar showStaffFilter={true} />

          {mode !== 'pos' ? (
            <View className="mb-4 flex-row items-center gap-3">
              <Select
                options={selectOptions}
                value={activeId}
                onChange={setActiveId}
                placeholder={`Tất cả ${mode === 'collaborator' ? 'Cộng tác viên' : 'Đại lý'}`}
                className="flex-1"
                triggerClassName="h-14 rounded-xl"
                triggerTextClassName="text-lg font-bold"
              />
              {mode === 'collaborator' && (
                <Pressable
                  onPress={handlePreviewReconciliation}
                  disabled={!activeId}
                  className={`h-14 items-center justify-center rounded-xl px-8 ${
                    activeId ? 'bg-primary' : 'bg-outline'
                  }`}
                >
                  <Text className="font-manrope-bold text-lg font-bold text-white">
                    Xem biên nhận
                  </Text>
                </Pressable>
              )}
            </View>
          ) : null}

          <View className="flex-1 rounded-lg border border-outline">
            <OrderList
              onOpenDetails={handleOpenDetails}
              onExchange={handleExchange}
              onRefund={handleRefund}
              orders={orders}
              isLoading={isLoading}
              fetchNextPage={fetchNextPage}
              hasNextPage={!!hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
            />
            <OrderStatsFooter stats={stats} />
          </View>
        </View>

        <OrderDetailModal ref={modalRef} />
        <ReconciliationModal ref={reconciliationModalRef} />
        <RefundConfirmModal
          ref={refundModalRef}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['orders'] })
          }}
        />
      </View>
    </SafeAreaView>
  )
}
