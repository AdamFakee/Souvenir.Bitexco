import { EmptyState, LoadMore, Shimmer } from '@/shared/components/ui'
import { COLORS } from '@/shared/constants'
import { getPaymentMethodStyle, PaymentMethodCode } from '@/shared/features/payment'
import { formatCurrency } from '@/shared/utils'
import { FlashList } from '@shopify/flash-list'
import { PackageOpen, Repeat2, Undo2 } from 'lucide-react-native'
import React, { memo, useCallback, useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useOrderFilterStore } from '../store'
import { IOrder } from '../types'
import {
  checkCanExchange,
  checkCanReturn,
  getOrderDisplayStatus,
  formatReceiptCode,
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

interface OrderDisplay {
  id: string
  updatedAt: Date | string | undefined
  code: string
  collaboratorName: string
  collaboratorCode: string
  dateTime: string
  ptttLabel: string
  ptttColor: string
  ptttBg: string
  totalFormatted: string
  statusLabel: string
  statusColor: string
  statusBg: string
  _order: IOrder
}

function buildOrderDisplay(item: IOrder): OrderDisplay {
  const payments = item.paymentsSnapshot || []
  let pttt: { label: string; color: string; bg: string }
  if (payments.length === 0) {
    pttt = { label: '—', color: COLORS.muted, bg: COLORS.surface[100] }
  } else if (payments.length >= 2) {
    const s = getPaymentMethodStyle('mix')
    pttt = { label: s.label, color: s.color, bg: s.bg }
  } else {
    const s = getPaymentMethodStyle(payments[0].method)
    pttt = { label: s.label, color: s.color, bg: s.bg }
  }

  const displayTotal = item.refund ? item.refund.refundAmount : item.total
  const displayStatus = getOrderDisplayStatus(item)

  let collaboratorName = '—'
  let collaboratorCode = ''

  if (item.agentType === 'agent' && item.partner) {
    collaboratorName = item.partner.nameVi || '—'
    collaboratorCode = item.partner.code ? `#${item.partner.code}` : ''
  } else if (item.affiliate) {
    collaboratorName = item.affiliate.name || '—'
    collaboratorCode = item.affiliate.code ? `#${item.affiliate.code}` : ''
  }

  return {
    id: item.id,
    updatedAt: item.updatedAt,
    code: formatReceiptCode(item.code || item.id),
    collaboratorName,
    collaboratorCode,
    dateTime: formatDateTime(item.createdAt),
    ptttLabel: pttt.label,
    ptttColor: pttt.color,
    ptttBg: pttt.bg,
    totalFormatted: formatCurrency(displayTotal),
    statusLabel: displayStatus.label,
    statusColor: displayStatus.color,
    statusBg: displayStatus.bgColor,
    _order: item,
  }
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
  { label: 'Hoàn hàng', value: 'REFUNDED,RETURNED,PARTIALLY_RETURNED,PARTIALLY_REFUNDED' },
]

// ── Sortable Header Cell (Thanh toán / Trạng thái header mở popover filter) ──
interface HeaderCellProps {
  field: SortField | 'actions'
  label: string
  flex: number
  sortable?: boolean
  currentSort: SortField | null
  currentDir: 'asc' | 'desc'
  onSort: (field: SortField) => void
  mode?: 'all' | 'pos' | 'collaborator' | 'agent' | 'offline'
}

const HeaderCell = memo(function HeaderCell({
  field,
  label,
  flex,
  sortable = true,
  currentSort,
  currentDir,
  onSort,
  mode,
}: HeaderCellProps) {
  const active = sortable && currentSort === field

  // Payment method popover filter
  const isPaymentCol = field === 'paymentMethod'
  const paymentMethod = useOrderFilterStore((s) => s.paymentMethod)
  const setPaymentMethod = useOrderFilterStore((s) => s.setPaymentMethod)
  const [showPaymentPopover, setShowPaymentPopover] = useState(false)

  // Status popover filter
  const isStatusCol = field === 'status'
  const statusFilter = useOrderFilterStore((s) => s.status)
  const setStatusFilter = useOrderFilterStore((s) => s.setStatus)
  const [showStatusPopover, setShowStatusPopover] = useState(false)

  let selectedLabel = label
  if (isPaymentCol) {
    selectedLabel = paymentMethod
      ? PAYMENT_METHOD_OPTIONS.find((o) => o.value === paymentMethod)?.label || 'PTTT'
      : 'PTTT'
  } else if (isStatusCol) {
    selectedLabel = statusFilter
      ? STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label || 'Trạng thái'
      : 'Trạng thái'
  } else if (field === 'collaborator' && mode === 'agent') {
    selectedLabel = 'Đối tác'
  } else if (field === 'collaborator' && mode === 'all') {
    selectedLabel = 'CTV / Đối tác'
  }

  const handlePress = useCallback(() => {
    if (isPaymentCol) {
      setShowPaymentPopover((v) => !v)
    } else if (isStatusCol) {
      setShowStatusPopover((v) => !v)
    } else {
      if (!sortable || field === 'actions') return
      onSort(field as SortField)
    }
  }, [isPaymentCol, isStatusCol, field, onSort, sortable])

  return (
    <View style={{ flex }}>
      <Pressable
        onPress={handlePress}
        disabled={!isPaymentCol && !isStatusCol && (!sortable || field === 'actions')}
        className={`flex-row items-center gap-1.5 ${field === 'actions' ? 'justify-center px-2' : 'px-4'}`}
        style={{ height: 64 }}
      >
        <Text
          numberOfLines={1}
          style={{
            color: BRAND,
            fontFamily: 'Manrope-Bold',
            fontSize: 22,
          }}
        >
          {selectedLabel}
        </Text>
        {active && !isPaymentCol && !isStatusCol && (
          <Text style={{ color: BRAND, fontSize: 15 }}>{currentDir === 'asc' ? '▲' : '▼'}</Text>
        )}
        {isPaymentCol && (
          <Text style={{ color: BRAND, fontSize: 13 }}>{showPaymentPopover ? '▲' : '▼'}</Text>
        )}
        {isStatusCol && (
          <Text style={{ color: BRAND, fontSize: 13 }}>{showStatusPopover ? '▲' : '▼'}</Text>
        )}
      </Pressable>

      {/* Popover PTTT */}
      {isPaymentCol && showPaymentPopover ? (
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
                  setShowPaymentPopover(false)
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

      {/* Popover Trạng thái */}
      {isStatusCol && showStatusPopover ? (
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
                  setShowStatusPopover(false)
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
    display,
    index,
    onPress,
    onExchange,
    onRefund,
    hideCollaborator,
  }: {
    display: OrderDisplay
    index: number
    onPress: () => void
    onExchange?: (order: IOrder) => void
    onRefund?: (order: IOrder) => void
    hideCollaborator?: boolean
  }) {
    const isEven = index % 2 === 1
    const order = display._order
    const canExchange = checkCanExchange(order)
    const canReturn = checkCanReturn(order)

    return (
      <Pressable
        onPress={onPress}
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
            {display.code}
          </Text>
        </View>

        {/* Cộng tác viên */}
        {!hideCollaborator && (
          <View className="flex-1 justify-center px-4" style={{ height: 60 }}>
            <Text
              numberOfLines={1}
              style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold', fontSize: 20 }}
            >
              {display.collaboratorName}
            </Text>
            {display.collaboratorCode ? (
              <Text style={{ color: TEXT_TERTIARY, fontFamily: 'Manrope-Bold', fontSize: 16 }}>
                {display.collaboratorCode}
              </Text>
            ) : null}
          </View>
        )}

        {/* Ngày tạo */}
        <View className="flex-1 justify-center px-4" style={{ height: 60 }}>
          <Text style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold', fontSize: 20 }}>
            {display.dateTime}
          </Text>
        </View>

        {/* Thanh toán */}
        <View className="justify-center px-4" style={{ flex: 0.7, height: 60 }}>
          <View
            className="self-start rounded-md px-3 py-1"
            style={{ backgroundColor: display.ptttBg }}
          >
            <Text
              className="uppercase tracking-tight"
              style={{ color: display.ptttColor, fontFamily: 'Manrope-Bold', fontSize: 18 }}
            >
              {display.ptttLabel}
            </Text>
          </View>
        </View>

        {/* Giá trị */}
        <View className="justify-center px-4" style={{ flex: 0.8, height: 60 }}>
          <Text style={{ color: TEXT_PRIMARY, fontFamily: 'Manrope-Bold', fontSize: 20 }}>
            {display.totalFormatted}
          </Text>
        </View>

        {/* Trạng thái */}
        <View className="justify-center px-4" style={{ flex: 0.8, height: 60 }}>
          <View
            className="self-start rounded-full px-3 py-1"
            style={{ backgroundColor: display.statusBg }}
          >
            <Text style={{ color: display.statusColor, fontFamily: 'Manrope-Bold', fontSize: 18 }}>
              {display.statusLabel}
            </Text>
          </View>
        </View>

        {/* Hành động: Đổi / Trả */}
        <View
          className="flex-row items-center justify-center gap-1.5 px-2"
          style={{ flex: 0.7, height: 60 }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đổi hàng"
            disabled={!canExchange || !onExchange}
            hitSlop={8}
            onPress={(e) => {
              e?.stopPropagation?.()
              if (canExchange) onExchange?.(order)
            }}
            className="h-11 w-11 items-center justify-center rounded-lg"
            style={{
              backgroundColor: canExchange ? 'rgba(28,78,104,0.1)' : 'transparent',
              opacity: canExchange && onExchange ? 1 : 0.35,
            }}
          >
            <Repeat2 size={22} color={canExchange ? BRAND : TEXT_TERTIARY} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Trả hàng"
            disabled={!canReturn || !onRefund}
            hitSlop={8}
            onPress={(e) => {
              e?.stopPropagation?.()
              if (canReturn) onRefund?.(order)
            }}
            className="h-11 w-11 items-center justify-center rounded-lg"
            style={{
              backgroundColor: canReturn ? 'rgba(220,38,38,0.08)' : 'transparent',
              opacity: canReturn && onRefund ? 1 : 0.35,
            }}
          >
            <Undo2 size={22} color={canReturn ? '#DC2626' : TEXT_TERTIARY} />
          </Pressable>
        </View>
      </Pressable>
    )
  },
  (prev, next) =>
    prev.display.id === next.display.id &&
    prev.display.updatedAt === next.display.updatedAt &&
    prev.index === next.index,
)

// ── Skeleton ──
const OrderSkeleton = ({
  index,
  hideCollaborator,
}: {
  index: number
  hideCollaborator?: boolean
}) => {
  const isEven = index % 2 === 1
  const activeCols = COLUMNS.filter((col) => !(col.field === 'collaborator' && hideCollaborator))
  return (
    <View
      className="flex-row items-center"
      style={{ minHeight: 62, backgroundColor: isEven ? ZEBRA : '#fff', paddingVertical: 8 }}
    >
      {activeCols.map((col, i) => (
        <View key={i} className="justify-center px-4" style={{ flex: col.flex, height: 60 }}>
          <Shimmer className="h-6 w-28 rounded-md" />
          {col.field === 'collaborator' && <Shimmer className="mt-1 h-4 w-20 rounded-md" />}
        </View>
      ))}
    </View>
  )
}

// ── Export TableHeader separately so popover isn't clipped by FlashList ──
interface TableHeaderProps {
  sortField: SortField | null
  sortDir: 'asc' | 'desc'
  onSort: (field: SortField) => void
  mode?: 'all' | 'pos' | 'collaborator' | 'agent' | 'offline'
}

export const TableHeader = memo(function TableHeader({
  sortField,
  sortDir,
  onSort,
  mode,
}: TableHeaderProps) {
  const activeCols = useMemo(() => {
    return COLUMNS.filter((col) => !(col.field === 'collaborator' && mode === 'pos'))
  }, [mode])

  return (
    <View className="z-50 flex-row items-center border-b bg-white" style={{ borderColor: BORDER }}>
      {activeCols.map((col) => (
        <HeaderCell
          key={col.field}
          field={col.field}
          label={col.label}
          flex={col.flex}
          sortable={col.sortable !== false && col.field !== 'actions'}
          currentSort={sortField}
          currentDir={sortDir}
          onSort={onSort}
          mode={mode}
        />
      ))}
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
}: OrderListProps) {
  const resetFilters = useOrderFilterStore((s) => s.resetFilters)
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const handleSort = useCallback(
    (field: SortField) => {
      // Không sort cột giá trị
      if (field === 'total') return
      if (sortField === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      } else {
        setSortField(field)
        setSortDir('asc')
      }
    },
    [sortField],
  )

  const displays = useMemo(() => {
    const list = orders.map(buildOrderDisplay)
    if (sortField) {
      list.sort((a, b) => {
        let va: string, vb: string
        switch (sortField) {
          case 'code':
            va = a.code
            vb = b.code
            break
          case 'collaborator':
            va = a.collaboratorName
            vb = b.collaboratorName
            break
          case 'createdAt':
            va = a.dateTime
            vb = b.dateTime
            break
          case 'paymentMethod':
            va = a.ptttLabel
            vb = b.ptttLabel
            break
          case 'total':
            va = a.totalFormatted
            vb = b.totalFormatted
            break
          case 'status':
            va = a.statusLabel
            vb = b.statusLabel
            break
        }
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      })
    }
    return list
  }, [orders, sortField, sortDir])

  const renderItem = useCallback(
    ({ item, index }: { item: OrderDisplay; index: number }) => (
      <OrderRow
        display={item}
        index={index}
        onPress={() => onOpenDetails(item._order)}
        onExchange={onExchange}
        onRefund={onRefund}
        hideCollaborator={mode === 'pos'}
      />
    ),
    [onOpenDetails, onExchange, onRefund, mode],
  )

  const keyExtractor = useCallback((item: OrderDisplay) => item.id, [])

  // Chỉ blank skeleton khi thật sự chưa có rows (keepPreviousData giữ list khi đổi tab)
  if (isLoading && orders.length === 0) {
    return (
      <View className="flex-1">
        <TableHeader sortField={sortField} sortDir={sortDir} onSort={handleSort} mode={mode} />
        {[...Array(6)].map((_, i) => (
          <OrderSkeleton key={i} index={i} hideCollaborator={mode === 'pos'} />
        ))}
      </View>
    )
  }

  return (
    <View className="flex-1">
      {/* Header pinned outside FlashList so popover isn't clipped */}
      <TableHeader sortField={sortField} sortDir={sortDir} onSort={handleSort} mode={mode} />
      <FlashList
        data={displays}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 8 }}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage()
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={<LoadMore isLoading={isFetchingNextPage} />}
        ListEmptyComponent={
          <EmptyState
            title="Danh sách trống"
            description="Chúng tôi không tìm thấy đơn hàng nào khớp với bộ lọc hiện tại của bạn."
            icon={PackageOpen}
            actionLabel="Xóa bộ lọc"
            onAction={resetFilters}
          />
        }
      />
    </View>
  )
})
