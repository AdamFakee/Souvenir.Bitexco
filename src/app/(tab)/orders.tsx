import { Select } from '@/shared/components/ui/select'
import {
  IOrder,
  OrderDetailModal,
  OrderDetailModalRef,
  OrderFilterBar,
  OrderList,
  OrderStatsFooter,
  Partner,
  ReconciliationModal,
  ReconciliationModalRef,
  RefundConfirmModal,
  RefundConfirmModalRef,
  useOrderFilterStore,
} from '@/shared/features/order'
import { OrderRemoteAPI } from '@/shared/features/order/api'
import { Affiliate } from '@/shared/features/pos'

import { COLORS } from '@/shared/constants'
import { useOrders } from '@/shared/features/order/hooks'
import { toast } from '@/shared/store'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import React, { memo, useCallback, useDeferredValue, useMemo, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

// ── 3 Tab Mode ──
type OrderMode = 'pos' | 'collaborator' | 'agent'

const MODE_TABS = [
  { label: 'POS', value: 'pos' as const },
  { label: 'Cộng tác viên', value: 'collaborator' as const },
  { label: 'Đại lý', value: 'agent' as const },
]

const BRAND = '#1C4E68'
const TAB_INACTIVE = '#FAFAFB'
const BORDER = '#DFE0E1'

// ── Stabilize select options ──
function useStableSelectOptions(
  guideType: 'collaborator' | 'agent',
  affiliates: Affiliate[],
  partners: Partner[],
) {
  const affiliatesKey = JSON.stringify(affiliates)
  const partnersKey = JSON.stringify(partners)
  return useMemo(() => {
    if (guideType === 'collaborator') {
      const opts: { label: string; value: string }[] = [
        { label: 'Tất cả Cộng tác viên', value: '' },
      ]
      affiliates.forEach((a) => opts.push({ label: `${a.name} (${a.code})`, value: a.id }))
      return opts
    } else {
      const opts: { label: string; value: string }[] = [{ label: 'Tất cả Đại lý', value: '' }]
      partners.forEach((p) => opts.push({ label: `${p.nameVi} (${p.code})`, value: p.id }))
      return opts
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guideType, affiliatesKey, partnersKey])
}

// ── Top Tab Bar (POS | CTV | Đại lý) ──
interface TopTabsProps {
  mode: OrderMode
  setMode: (v: OrderMode) => void
}

const TopTabs = memo(function TopTabs({ mode, setMode }: TopTabsProps) {
  return (
    <View className="flex-row gap-2 px-4 pt-3">
      {MODE_TABS.map((tab) => {
        const active = mode === tab.value
        return (
          <Pressable
            key={tab.value}
            onPress={() => setMode(tab.value)}
            className="items-center justify-center rounded-t-xl px-6 py-3"
            style={{
              backgroundColor: active ? COLORS.surface.variant : TAB_INACTIVE,
              shadowColor: active ? '#DBDBDB' : undefined,
              shadowOffset: active ? { width: 0, height: 10 } : undefined,
              shadowOpacity: active ? 0.24 : 0,
              shadowRadius: active ? 10 : undefined,
              elevation: active ? 8 : 0,
            }}
          >
            <Text
              className="text-base font-bold"
              style={{ color: active ? BRAND : '#0F0F0F', fontFamily: 'Manrope-Bold' }}
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

// ── Main Screen ──
export default function OrdersScreen() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const modalRef = useRef<OrderDetailModalRef>(null)
  const reconciliationModalRef = useRef<ReconciliationModalRef>(null)
  const refundModalRef = useRef<RefundConfirmModalRef>(null)

  const [mode, setMode] = useState<OrderMode>('pos')
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string | null>(null)
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null)

  // Dùng store filter gốc — có sẵn dateFrom/dateTo/status/search/staffId
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

  const guideType =
    mode === 'pos' ? null : mode === 'collaborator' ? ('collaborator' as const) : ('agent' as const)

  const { orders, stats, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useOrders({
    status: deferredFilters.status,
    searchQuery: deferredFilters.searchQuery,
    dateFrom: deferredFilters.dateFrom,
    dateTo: deferredFilters.dateTo,
    staffId: deferredFilters.staffId,
    affiliateId: deferredFilters.affiliateId,
    partnerId: deferredFilters.partnerId,
    guideType,
    paymentMethod: deferredFilters.paymentMethod,
  })

  // Chỉ fetch khi cần
  const showGuide = mode === 'collaborator' || mode === 'agent'

  const { data: affiliates = [] } = useQuery({
    queryKey: ['pos-affiliates-list'],
    queryFn: async () => {
      const res = await OrderRemoteAPI.getAffiliates()
      return res.items
    },
    enabled: showGuide,
  })

  const { data: partners = [] } = useQuery({
    queryKey: ['pos-partners-list'],
    queryFn: async () => {
      const res = await OrderRemoteAPI.getPartners()
      return res.items
    },
    enabled: showGuide,
  })

  // Chỉ gọi hook khi mode là guide; fallback về 'collaborator' an toàn
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
      // Cache order payload — màn /exchange đọc từ query cache
      queryClient.setQueryData(['exchange-order', order.id], order)
      router.push({ pathname: '/exchange', params: { orderId: order.id } })
    },
    [queryClient, router],
  )

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
        {/* Tab Bar: POS | CTV | Đại lý */}
        <TopTabs mode={mode} setMode={setMode} />

        {/* Body container */}
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
          {/* Filter bar — chung cho cả 3 tab: status + search + date + staff */}
          <OrderFilterBar showStaffFilter={true} />

          {/* Guide row: chỉ hiện thêm select CTV/Đại lý + nút biên nhận */}
          {mode !== 'pos' ? (
            <View className="mb-4 flex-row items-center gap-3">
              <Select
                options={selectOptions}
                value={activeId}
                onChange={setActiveId}
                placeholder={`Tất cả ${mode === 'collaborator' ? 'Cộng tác viên' : 'Đại lý'}`}
                className="flex-1"
              />
              <Pressable
                onPress={handlePreviewReconciliation}
                disabled={!activeId}
                className="h-12 items-center justify-center rounded-xl px-5"
                style={{ backgroundColor: activeId ? BRAND : '#DFE0E1' }}
              >
                <Text
                  className="text-base font-bold"
                  style={{ color: '#fff', fontFamily: 'Manrope-Bold' }}
                >
                  Xem biên nhận
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Table */}
          <View className="flex-1 rounded-lg border" style={{ borderColor: BORDER }}>
            <OrderList
              onOpenDetails={handleOpenDetails}
              orders={orders}
              isLoading={isLoading}
              fetchNextPage={fetchNextPage}
              hasNextPage={!!hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
            />
            <OrderStatsFooter stats={stats} />
          </View>
        </View>

        <OrderDetailModal
          ref={modalRef}
          onExchange={handleExchange}
          onRefund={refundModalRef.current?.open}
        />
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
