import { Button, SearchInput, SegmentedControl } from '@/shared/components/ui'
import { Select } from '@/shared/components/ui/select'
import {
  IOrder,
  OrderDetailModal,
  OrderDetailModalRef,
  OrderFilterBar,
  OrderList,
  OrderStatsFooter,
  ReconciliationModal,
  ReconciliationModalRef,
  useOrderFilterStore,
  Partner,
} from '@/shared/features/order'
import { OrderRemoteAPI } from '@/shared/features/order/api'
import { Affiliate } from '@/shared/features/pos'

import { useOrders } from '@/shared/features/order/hooks'
import { toast } from '@/shared/store'
import { useQuery } from '@tanstack/react-query'
import { COLORS } from '@/shared/constants'
import { PAYMENT_METHOD_LABELS, PaymentMethodCode } from '@/shared/features/payment'
import { Printer as PrinterIcon, ChevronDown, Check } from 'lucide-react-native'
import React, { useDeferredValue, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const paymentMethodOptions: { label: string; value: PaymentMethodCode | '' }[] = [
  { label: 'Tất cả', value: '' },
  { label: 'Tiền mặt', value: 'cash' },
  { label: 'QR Code', value: 'qr_bidv' },
  { label: 'Thẻ POS', value: 'card_bidv' },
  { label: 'Hỗn hợp', value: 'mix' },
  { label: 'Công nợ', value: 'cong_no' },
]

export default function OrdersScreen() {
  const modalRef = useRef<OrderDetailModalRef>(null)
  const printRef = useRef<View>(null)
  const reconciliationModalRef = useRef<ReconciliationModalRef>(null)

  const [mode, setMode] = useState<'pos' | 'guide'>('pos')
  const [guideType, setGuideType] = useState<'collaborator' | 'agent'>('collaborator')
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false)
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string | null>(null)
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null)

  const status = useOrderFilterStore((s) => s.status)
  const searchQuery = useOrderFilterStore((s) => s.searchQuery)
  const dateFrom = useOrderFilterStore((s) => s.dateFrom)
  const dateTo = useOrderFilterStore((s) => s.dateTo)
  const staffId = useOrderFilterStore((s) => s.staffId)
  const paymentMethod = useOrderFilterStore((s) => s.paymentMethod)
  const setPaymentMethod = useOrderFilterStore((s) => s.setPaymentMethod)

  // Defer ALL filter values so every visual update (tab highlight, toggle, etc.)
  // is instant while the heavy network fetch is deferred as low-priority work
  const deferredStatus = useDeferredValue(status)
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const deferredStaffId = useDeferredValue(staffId)
  const deferredDateFrom = useDeferredValue(dateFrom)
  const deferredDateTo = useDeferredValue(dateTo)
  const deferredPaymentMethod = useDeferredValue(paymentMethod)

  const deferredAffiliateId = useDeferredValue(mode === 'guide' ? selectedAffiliateId : null)
  const deferredPartnerId = useDeferredValue(mode === 'guide' ? selectedPartnerId : null)

  const { orders, stats, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useOrders({
    status: deferredStatus,
    searchQuery: deferredSearchQuery,
    dateFrom: deferredDateFrom,
    dateTo: deferredDateTo,
    staffId: deferredStaffId,
    affiliateId: deferredAffiliateId,
    partnerId: deferredPartnerId,
    guideType: mode === 'guide' ? guideType : null,
    paymentMethod: deferredPaymentMethod,
  })

  // Load affiliates (guides) and partners (agents)
  const { data: affiliates = [] } = useQuery({
    queryKey: ['pos-affiliates-list'],
    queryFn: async () => {
      const res = await OrderRemoteAPI.getAffiliates()
      return res.items
    },
  })

  const { data: partners = [] } = useQuery({
    queryKey: ['pos-partners-list'],
    queryFn: async () => {
      const res = await OrderRemoteAPI.getPartners()
      return res.items
    },
  })

  const selectOptions = useMemo(() => {
    if (guideType === 'collaborator') {
      const opts = [{ label: 'Tất cả Hướng dẫn viên', value: '' }]
      affiliates.forEach((a: Affiliate) => {
        opts.push({ label: `${a.name} (${a.code})`, value: a.id })
      })
      return opts
    } else {
      const opts = [{ label: 'Tất cả Đại lý', value: '' }]
      partners.forEach((p: Partner) => {
        opts.push({ label: `${p.nameVi} (${p.code})`, value: p.id })
      })
      return opts
    }
  }, [guideType, affiliates, partners])

  const handleOpenDetails = (order: IOrder) => {
    modalRef.current?.open(order)
  }

  // Handle previewing reconciliation receipt — modal tự query API bên trong
  const handlePreviewReconciliation = () => {
    let ownerName = ''
    let ownerCode = ''

    if (guideType === 'collaborator') {
      if (!selectedAffiliateId) {
        toast.info('Vui lòng chọn cụ thể một Hướng dẫn viên để đối soát.', 'Yêu cầu chọn HDV')
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
      ownerType: guideType,
      partnerId: guideType === 'agent' ? selectedPartnerId : null,
      affiliateId: guideType === 'collaborator' ? selectedAffiliateId : null,
      dateFrom,
      dateTo,
    })
  }

  const activeId = guideType === 'collaborator' ? selectedAffiliateId : selectedPartnerId
  const setActiveId = (id: string | null) => {
    if (guideType === 'collaborator') {
      setSelectedAffiliateId(id)
      setSelectedPartnerId(null)
    } else {
      setSelectedPartnerId(id)
      setSelectedAffiliateId(null)
    }
  }

  const subTabItems = guideType === 'collaborator' ? affiliates : partners

  return (
    <SafeAreaView className="flex-1">
      <View className="flex-1 bg-surface-50">
        {/* Page Header */}
        <View className="border-b border-outline-variant bg-white px-8 pt-8">
          <View className="mb-6 flex-row items-center justify-between">
            <Text className="text-5xl font-black tracking-tight text-surface-on">
              Quản lý Đơn hàng
            </Text>

            {/* Segmented Control Mode Switcher */}
            <SegmentedControl
              options={[
                { label: 'Đơn hàng POS', value: 'pos' as const },
                { label: 'CTV & Đại lý', value: 'guide' as const },
              ]}
              value={mode}
              onChange={setMode}
              className="w-80"
            />
          </View>

          {mode === 'pos' ? (
            <OrderFilterBar showStaffFilter={true} />
          ) : (
            <>
              <View className="mb-6 flex-row items-center gap-6">
                {/* Guide Type Segmented Switcher */}
                <SegmentedControl
                  options={[
                    { label: 'Cộng tác viên', value: 'collaborator' as const },
                    { label: 'Đại lý', value: 'agent' as const },
                  ]}
                  value={guideType}
                  onChange={(val) => {
                    setGuideType(val)
                    setSelectedAffiliateId(null)
                    setSelectedPartnerId(null)
                  }}
                  className="h-full w-80"
                />

                {/* Spacer to push select and button to the end */}
                <View className="flex-1" />

                {/* Select Dropdown to pick active item */}
                <Select
                  options={selectOptions}
                  value={activeId ?? ''}
                  onChange={(val) => setActiveId(val || null)}
                  placeholder={guideType === 'collaborator' ? 'Chọn Hướng dẫn viên' : 'Chọn Đại lý'}
                  className="w-96"
                />

                <Button
                  label="Xem biên nhận"
                  leftIcon={PrinterIcon}
                  variant="primary"
                  className="h-16"
                  onPress={handlePreviewReconciliation}
                  disabled={activeId === null}
                />
              </View>
              <OrderFilterBar showStaffFilter={false} />
            </>
          )}
        </View>

        {/* Orders Table Area */}
        <View className="flex-1 p-8">
          <View className="flex-1 overflow-hidden rounded-[24px] border border-outline-variant bg-white shadow-sm">
            {/* Table Header */}
            <View className="z-30 flex-row items-center border-b-2 border-outline-variant bg-[#f8fafc] px-8 py-5">
              <Text className="mr-8 w-48 text-lg font-bold uppercase tracking-wider text-muted">
                Thời gian
              </Text>
              <Text className="mr-8 w-52 text-lg font-bold uppercase tracking-wider text-muted">
                Mã Đơn
              </Text>
              <Text className="mr-8 flex-1 text-lg font-bold uppercase tracking-wider text-muted">
                Sản phẩm
              </Text>
              <View className="z-50 mr-8 w-36 items-center">
                <Pressable
                  onPress={() => setShowPaymentDropdown(true)}
                  className="flex-row items-center justify-center gap-1.5 rounded-lg bg-surface-100 px-3 py-1.5 active:bg-surface-200"
                >
                  <Text
                    className="text-center text-lg font-bold uppercase tracking-wider text-muted"
                    numberOfLines={1}
                  >
                    {paymentMethod
                      ? (PAYMENT_METHOD_LABELS[
                          paymentMethod as keyof typeof PAYMENT_METHOD_LABELS
                        ] ?? paymentMethod)
                      : 'Thanh toán'}
                  </Text>
                  <ChevronDown size={14} color="#8d8e8f" />
                </Pressable>

                {showPaymentDropdown && (
                  <>
                    <Pressable
                      style={{
                        position: 'absolute',
                        top: -500,
                        left: -500,
                        right: -500,
                        bottom: -1500,
                        zIndex: 40,
                      }}
                      onPress={() => setShowPaymentDropdown(false)}
                    />
                    <View className="absolute top-10 z-50 w-44 overflow-hidden rounded-xl border border-outline-variant bg-white shadow-lg">
                      <ScrollView bounces={false} style={{ maxHeight: 280 }}>
                        {paymentMethodOptions.map((opt) => {
                          const isSelected = (paymentMethod || '') === opt.value
                          return (
                            <Pressable
                              key={opt.value}
                              onPress={() => {
                                setPaymentMethod(opt.value || null)
                                setShowPaymentDropdown(false)
                              }}
                              className={`flex-row items-center justify-between px-4 py-3 active:bg-surface-100 ${
                                isSelected ? 'bg-primary/5' : ''
                              }`}
                            >
                              <Text
                                className={`text-base ${
                                  isSelected
                                    ? 'font-black text-primary'
                                    : 'font-medium text-surface-on'
                                }`}
                              >
                                {opt.label}
                              </Text>
                              {isSelected && <Check size={16} color="#2563eb" />}
                            </Pressable>
                          )
                        })}
                      </ScrollView>
                    </View>
                  </>
                )}
              </View>
              <Text className="mr-8 w-40 text-right text-lg font-bold uppercase tracking-wider text-muted">
                Tổng cộng
              </Text>
              <Text className="mr-8 w-52 text-center text-lg font-bold uppercase tracking-wider text-muted">
                Trạng thái
              </Text>
              <View className="w-12" />
            </View>

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

        <OrderDetailModal ref={modalRef} />

        <ReconciliationModal ref={reconciliationModalRef} />
      </View>
    </SafeAreaView>
  )
}
