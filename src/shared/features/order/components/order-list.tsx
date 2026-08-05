import { EmptyState, IconButton, LoadMore } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { getPaymentMethodStyle, PaymentMethodCode } from '@/shared/features/payment'
import { cn, formatCurrency } from '@/shared/utils'
import { FlashList } from '@shopify/flash-list'
import { PackageOpen, Repeat2, Undo2 } from 'lucide-react-native'
import React, { memo, useCallback, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useOrderFilterStore } from '../store'
import { IOrder } from '../types'
import {
  checkCanExchange,
  checkCanReturn,
  formatReceiptCode,
  getOrderDisplayStatus,
} from '../utils'

interface OrderListProps {
  onOpenDetails: (order: IOrder) => void
  onExchange?: (order: IOrder) => void
  onRefund?: (order: IOrder) => void
  orders: IOrder[]
  isLoading: boolean
  fetchNextPage: () => void
  hasNextPage: boolean
  isFetchingNextPage: boolean
  mode?: 'all' | 'pos' | 'collaborator' | 'agent' | 'offline'
  onRefresh?: () => void
  refreshing?: boolean
}

const BRAND = '#1C4E68'
const TEXT_PRIMARY = '#303036'
const TEXT_TERTIARY = '#747475'
const BORDER = '#DFE0E1'
const ZEBRA = '#FAFAFB'

// ── Cột: Mã | CTV | Ngày | PTTT | Giá trị | Trạng thái | Hành động ──
type SortField = 'code' | 'collaborator' | 'createdAt' | 'paymentMethod' | 'total' | 'status'

const COLUMNS: { field: SortField | 'actions'; label: string; flex: number; sortable?: boolean }[] =
  [
    { field: 'code', label: 'Mã đơn hàng', flex: 1, sortable: false },
    { field: 'collaborator', label: 'Cộng tác viên', flex: 1, sortable: false },
    { field: 'createdAt', label: 'Ngày tạo đơn', flex: 1, sortable: false },
    { field: 'paymentMethod', label: 'PTTT', flex: 0.7, sortable: false },
    { field: 'total', label: 'Giá trị', flex: 0.8, sortable: false },
    { field: 'status', label: 'Trạng thái', flex: 0.8, sortable: false },
    { field: 'actions', label: 'Hành động', flex: 0.7, sortable: false },
  ]

function formatDateTime(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear().toString().slice(2))} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ── Payment method filter constants ──
const PAYMENT_METHOD_OPTIONS: { label: string; value: PaymentMethodCode | '' }[] = [
  { label: 'Tất cả', value: '' },
  { label: 'Tiền mặt', value: 'cash' },
  { label: 'QR Code', value: 'qr_bidv' },
  { label: 'Thẻ POS', value: 'card_bidv' },
  { label: 'Công nợ', value: 'cong_no' },
]

// ── Status filter constants ──
const STATUS_OPTIONS: { label: string; value: string | null }[] = [
  { label: 'Tất cả', value: null },
  { label: 'Hoàn thành', value: 'COMPLETED' },
  { label: 'Hủy hàng', value: 'REFUNDED,RETURNED,PARTIALLY_RETURNED,PARTIALLY_REFUNDED' },
]

// ── Sortable Header Cell (Thanh toán / Trạng thái header mở popover filter) ──
// ── Header cells: tách nhỏ để chỉ cell nào cần thì subscribe store ──

const PlainHeaderCell = memo(function PlainHeaderCell({
  label,
  flex,
  mode,
  field,
}: {
  label: string
  flex: number
  mode?: 'all' | 'pos' | 'collaborator' | 'agent' | 'offline'
  field: SortField | 'actions'
}) {
  let displayLabel = label
  if (field === 'collaborator') {
    if (mode === 'agent') displayLabel = 'Đối tác'
    else displayLabel = 'CTV / Đối tác'
  }

  return (
    <View style={{ flex }}>
      <View
        className={`flex-row items-center gap-1.5 ${field === 'actions' ? 'justify-center px-2' : 'px-4'}`}
        style={{ height: 64 }}
      >
        <Text numberOfLines={1} style={{ color: BRAND, fontFamily: 'Manrope-Bold', fontSize: 22 }}>
          {displayLabel}
        </Text>
      </View>
    </View>
  )
})

const PaymentHeaderCell = memo(function PaymentHeaderCell({ flex }: { flex: number }) {
  const paymentMethod = useOrderFilterStore((s) => s.paymentMethod)
  const setPaymentMethod = useOrderFilterStore((s) => s.setPaymentMethod)
  const [showPopover, setShowPopover] = useState(false)

  const selectedLabel = paymentMethod
    ? PAYMENT_METHOD_OPTIONS.find((o) => o.value === paymentMethod)?.label || 'PTTT'
    : 'PTTT'

  return (
    <View style={{ flex }}>
      <Pressable
        onPress={() => setShowPopover((v) => !v)}
        className="flex-row items-center gap-1.5 px-4"
        style={{ height: 64 }}
      >
        <Text numberOfLines={1} style={{ color: BRAND, fontFamily: 'Manrope-Bold', fontSize: 22 }}>
          {selectedLabel}
        </Text>
        <Text style={{ color: BRAND, fontSize: 13 }}>{showPopover ? '▲' : '▼'}</Text>
      </Pressable>

      {showPopover ? (
        <View
          className="absolute left-4 z-10 rounded-xl border bg-white py-1 shadow-lg"
          style={{ borderColor: BORDER, minWidth: 220, top: 64 }}
        >
          {PAYMENT_METHOD_OPTIONS.map((opt) => {
            const active = (paymentMethod ?? '') === opt.value
            return (
              <Pressable
                key={opt.value}
                onPress={() => {
                  setPaymentMethod((opt.value as PaymentMethodCode) || null)
                  setShowPopover(false)
                }}
                className="px-5 py-4 active:bg-gray-100"
                style={{ backgroundColor: active ? 'rgba(28,78,104,0.08)' : 'transparent' }}
              >
                <Text
                  style={{
                    color: active ? BRAND : TEXT_PRIMARY,
                    fontFamily: 'Manrope-Bold',
                    fontSize: 18,
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      ) : null}
    </View>
  )
})

const StatusHeaderCell = memo(function StatusHeaderCell({ flex }: { flex: number }) {
  const statusFilter = useOrderFilterStore((s) => s.status)
  const setStatusFilter = useOrderFilterStore((s) => s.setStatus)
  const [showPopover, setShowPopover] = useState(false)

  const selectedLabel = statusFilter
    ? STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label || 'Trạng thái'
    : 'Trạng thái'

  return (
    <View style={{ flex }}>
      <Pressable
        onPress={() => setShowPopover((v) => !v)}
        className="flex-row items-center gap-1.5 px-4"
        style={{ height: 64 }}
      >
        <Text numberOfLines={1} style={{ color: BRAND, fontFamily: 'Manrope-Bold', fontSize: 22 }}>
          {selectedLabel}
        </Text>
        <Text style={{ color: BRAND, fontSize: 13 }}>{showPopover ? '▲' : '▼'}</Text>
      </Pressable>

      {showPopover ? (
        <View
          className="absolute left-4 z-10 rounded-xl border bg-white py-1 shadow-lg"
          style={{ borderColor: BORDER, minWidth: 220, top: 64 }}
        >
          {STATUS_OPTIONS.map((opt) => {
            const active = statusFilter === opt.value
            return (
              <Pressable
                key={opt.label}
                onPress={() => {
                  setStatusFilter(opt.value)
                  setShowPopover(false)
                }}
                className="px-5 py-4 active:bg-gray-100"
                style={{ backgroundColor: active ? 'rgba(28,78,104,0.08)' : 'transparent' }}
              >
                <Text
                  style={{
                    color: active ? BRAND : TEXT_PRIMARY,
                    fontFamily: 'Manrope-Bold',
                    fontSize: 18,
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      ) : null}
    </View>
  )
})

// ── Zebra Row (click vào row mở modal; icon hành động stopPropagation) ──
const OrderRow = memo(
  function OrderRow({
    order,
    index,
    onOpenDetails,
    onExchange,
    onRefund,
  }: {
    order: IOrder
    index: number
    onOpenDetails: (order: IOrder) => void
    onExchange?: (order: IOrder) => void
    onRefund?: (order: IOrder) => void
  }) {
    const isEven = index % 2 === 1
    const payments = order.paymentsSnapshot || []
    let ptttLabel = '—'
    let ptttColor: string = COLORS.muted
    let ptttBg: string = COLORS.surface[100]

    if (payments.length >= 2) {
      const s = getPaymentMethodStyle('mix')
      ptttLabel = s.label
      ptttColor = s.color
      ptttBg = s.bg
    } else if (payments.length === 1) {
      const s = getPaymentMethodStyle(payments[0].method)
      ptttLabel = s.label
      ptttColor = s.color
      ptttBg = s.bg
    }

    const displayTotal = order.refund ? order.refund.refundAmount : order.total
    const displayStatus = getOrderDisplayStatus(order)

    let collaboratorName = '—'
    let collaboratorCode = ''

    if (order.agentType === 'agent' && order.partner) {
      collaboratorName = order.partner.nameVi || '—'
      collaboratorCode = order.partner.code ? `#${order.partner.code}` : ''
    } else if (order.affiliate) {
      collaboratorName = order.affiliate.name || '—'
      collaboratorCode = order.affiliate.code ? `#${order.affiliate.code}` : ''
    }

    const canExchange = order.canExchange ?? checkCanExchange(order)
    const canReturn = order.canReturn ?? checkCanReturn(order)
    const code = formatReceiptCode(order.code || order.id)
    const dateTime = formatDateTime(order.createdAt)
    const totalFormatted = formatCurrency(displayTotal)

    const handlePress = useCallback(() => onOpenDetails(order), [onOpenDetails, order])

    return (
      <Pressable
        onPress={handlePress}
        className="flex-row items-center active:opacity-70"
        style={{
          minHeight: 62,
          backgroundColor: isEven ? ZEBRA : '#fff',
          paddingVertical: 8,
        }}
      >
        {/* Mã đơn */}
        <View className="flex-1 justify-center px-4" style={{ height: 60 }}>
          <Text
            numberOfLines={1}
            style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold', fontSize: 20 }}
          >
            {code}
          </Text>
        </View>

        {/* Cộng tác viên */}
        <View className="flex-1 justify-center px-4" style={{ height: 60 }}>
          <Text
            numberOfLines={1}
            style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold', fontSize: 20 }}
          >
            {collaboratorName}
          </Text>
          {collaboratorCode ? (
            <Text style={{ color: TEXT_TERTIARY, fontFamily: 'Manrope-Bold', fontSize: 16 }}>
              {collaboratorCode}
            </Text>
          ) : null}
        </View>

        {/* Ngày tạo */}
        <View className="flex-1 justify-center px-4" style={{ height: 60 }}>
          <Text style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold', fontSize: 20 }}>
            {dateTime}
          </Text>
        </View>

        {/* Thanh toán */}
        <View className="justify-center px-4" style={{ flex: 0.7, height: 60 }}>
          <View className="self-start rounded-md px-3 py-1" style={{ backgroundColor: ptttBg }}>
            <Text
              className="uppercase tracking-tight"
              style={{ color: ptttColor, fontFamily: 'Manrope-Bold', fontSize: 18 }}
            >
              {ptttLabel}
            </Text>
          </View>
        </View>

        {/* Giá trị */}
        <View className="justify-center px-4" style={{ flex: 0.8, height: 60 }}>
          <Text style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold', fontSize: 20 }}>
            {totalFormatted}
          </Text>
        </View>

        {/* Trạng thái */}
        <View className="justify-center px-4" style={{ flex: 0.8, height: 60 }}>
          <View
            className="self-start rounded-full px-3 py-1"
            style={{ backgroundColor: displayStatus.bgColor }}
          >
            <Text style={{ color: displayStatus.color, fontFamily: 'Manrope-Bold', fontSize: 18 }}>
              {displayStatus.label}
            </Text>
          </View>
        </View>

        {/* Hành động: Đổi / Trả */}
        <View
          className="flex-row items-center justify-center gap-1.5 px-2"
          style={{ flex: 0.7, height: 60 }}
        >
          <IconButton
            icon={Repeat2}
            variant="md"
            size={28}
            color={canExchange ? BRAND : TEXT_TERTIARY}
            accessibilityLabel="Đổi hàng"
            disabled={!canExchange || !onExchange}
            onPress={(e) => {
              e?.stopPropagation?.()
              if (canExchange) onExchange?.(order)
            }}
            className={cn('h-11 w-11 rounded-lg', canExchange ? 'bg-primary/10' : 'none')}
            style={{
              opacity: canExchange && onExchange ? 1 : 0.35,
            }}
          />
          <IconButton
            icon={Undo2}
            variant="md"
            size={28}
            color={canReturn ? '#DC2626' : TEXT_TERTIARY}
            accessibilityLabel="Trả hàng"
            disabled={!canReturn || !onRefund}
            onPress={(e) => {
              e?.stopPropagation?.()
              if (canReturn) onRefund?.(order)
            }}
            className={cn('h-11 w-11 rounded-lg', canReturn ? 'bg-error/10' : 'none')}
            style={{
              opacity: canReturn && onRefund ? 1 : 0.35,
            }}
          />
        </View>
      </Pressable>
    )
  },
  (prev, next) =>
    prev.order.id === next.order.id &&
    prev.order.updatedAt === next.order.updatedAt &&
    prev.index === next.index,
)

// ── Skeleton ──
export const OrderSkeleton = ({ index }: { index: number }) => {
  const isEven = index % 2 === 1
  const activeCols = COLUMNS
  return (
    <View
      className="flex-row items-center"
      style={{ minHeight: 62, backgroundColor: isEven ? ZEBRA : '#fff', paddingVertical: 8 }}
    >
      {activeCols.map((col, i) => (
        <View key={i} className="justify-center px-4" style={{ flex: col.flex, height: 60 }}>
          <View className="h-6 w-28 rounded-md bg-neutral-200" />
          {col.field === 'collaborator' && (
            <View className="mt-1 h-4 w-20 rounded-md bg-neutral-200 opacity-60" />
          )}
        </View>
      ))}
    </View>
  )
}

// ── Export TableHeader separately so popover isn't clipped by FlashList ──
interface TableHeaderProps {
  mode?: 'all' | 'pos' | 'collaborator' | 'agent' | 'offline'
}

export const TableHeader = memo(function TableHeader({ mode }: TableHeaderProps) {
  const activeCols = COLUMNS

  return (
    <View className="z-50 flex-row items-center border-b bg-white" style={{ borderColor: BORDER }}>
      {activeCols.map((col) => {
        if (col.field === 'paymentMethod') {
          return <PaymentHeaderCell key={col.field} flex={col.flex} />
        }
        if (col.field === 'status') {
          return <StatusHeaderCell key={col.field} flex={col.flex} />
        }
        return (
          <PlainHeaderCell
            key={col.field}
            field={col.field}
            label={col.label}
            flex={col.flex}
            mode={mode}
          />
        )
      })}
    </View>
  )
})

// ── Main ──
export const OrderList = memo(function OrderList({
  onOpenDetails,
  onExchange,
  onRefund,
  orders,
  isLoading,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  mode = 'pos',
  onRefresh,
  refreshing,
}: OrderListProps) {
  const resetFilters = useOrderFilterStore((s) => s.resetFilters)

  const renderItem = useCallback(
    ({ item, index }: { item: IOrder; index: number }) => {
      return (
        <OrderRow
          order={item}
          index={index}
          onOpenDetails={onOpenDetails}
          onExchange={onExchange}
          onRefund={onRefund}
        />
      )
    },
    [onOpenDetails, onExchange, onRefund],
  )

  const keyExtractor = useCallback((item: IOrder) => item.id, [])

  return (
    <View className="flex-1">
      {/* Header pinned outside FlashList so popover isn't clipped */}
      <TableHeader mode={mode} />
      <FlashList
        data={orders}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 8 }}
        onRefresh={onRefresh}
        refreshing={refreshing}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage()
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={<LoadMore isLoading={isFetchingNextPage} />}
        ListEmptyComponent={
          isLoading ? (
            <View>
              {Array.from({ length: 6 }).map((_, i) => (
                <OrderSkeleton key={i} index={i} />
              ))}
            </View>
          ) : (
            <EmptyState
              title="Danh sách trống"
              description="Chúng tôi không tìm thấy đơn hàng nào khớp với bộ lọc hiện tại của bạn."
              icon={PackageOpen}
              actionLabel="Xóa bộ lọc"
              onAction={resetFilters}
            />
          )
        }
      />
    </View>
  )
})
