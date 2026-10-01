import {
  database,
  OrderModel,
  sanitizePaymentsSnapshot,
  PaymentSnapshot,
} from '@/shared/lib/database'
import { IOrder } from '@/shared/types'
import { Q } from '@nozbe/watermelondb'
import { useEffect, useMemo, useState } from 'react'
import { useOrderFilterStore } from '../store'

const mapLocalOrderToIOrder = (o: OrderModel): IOrder => {
  const createdTime =
    (o._raw as any).created_at || (o.createdAt ? new Date(o.createdAt).getTime() : Date.now())
  const updatedTime =
    (o._raw as any).updated_at || (o.updatedAt ? new Date(o.updatedAt).getTime() : Date.now())

  let rawPayments: PaymentSnapshot[] = o.paymentsSnapshot || []
  if ((!rawPayments || rawPayments.length === 0) && (o._raw as any).payments_snapshot) {
    try {
      const parsed =
        typeof (o._raw as any).payments_snapshot === 'string'
          ? JSON.parse((o._raw as any).payments_snapshot)
          : (o._raw as any).payments_snapshot
      rawPayments = sanitizePaymentsSnapshot(parsed)
    } catch (e) {
      console.error('[mapLocalOrderToIOrder] Lỗi parse raw payments_snapshot:', e)
    }
  }

  return {
    id: o.id,
    code: null,
    shiftId: o.shiftId,
    staffId: o.staffId,
    status: (o.status as any) || 'COMPLETED',
    subtotal: o.subtotal || 0,
    discount: o.discount || 0,
    voucherCode: o.voucherCode,
    voucherDiscount: o.voucherDiscount || 0,
    total: o.total || 0,
    totalTax: o.totalTax || 0,
    note: o.note,
    refundReason: o.refundReason,
    originalOrderId: o.originalOrderId,
    customerTaxInfo: o.customerTaxInfo,
    itemsSnapshot: o.itemsSnapshot || [],
    paymentsSnapshot: rawPayments,
    isDeleted: o.isDeleted || false,
    canReturn: false,
    canExchange: false,
    createdAt: new Date(createdTime),
    updatedAt: new Date(updatedTime),
    partnerId: o.partnerId || (o._raw as any).partner_id || null,
    partnerName: o.partnerName || (o._raw as any).partner_name || null,
    affiliateId: o.affiliateId || (o._raw as any).affiliate_id || null,
    affiliateName: o.affiliateName || (o._raw as any).affiliate_name || null,
    agentType:
      o.partnerId || (o._raw as any).partner_id
        ? 'agent'
        : o.affiliateId || (o._raw as any).affiliate_id
          ? 'collaborator'
          : 'retail',
  }
}

const NOOP_ASYNC = async () => {}

/**
 * Hook theo dõi số lượng đơn offline chưa đồng bộ theo thời gian thực (Reactive từ SQLite)
 */
export const useUnsyncedOrdersCount = () => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const subscription = database
      .get<OrderModel>('orders')
      .query(Q.where('is_deleted', Q.notEq(true)), Q.where('is_synced', false))
      .observeCount()
      .subscribe({
        next: (cnt) => setCount(cnt),
        error: (err) => console.error('[useUnsyncedOrdersCount] error:', err),
      })
    return () => subscription.unsubscribe()
  }, [])

  return count
}

/**
 * Hook theo dõi danh sách và thống kê đơn hàng Offline theo thời gian thực (Tối ưu hiệu năng cao)
 */
export const useOfflineOrders = () => {
  const searchQuery = useOrderFilterStore((s) => s.searchQuery.trim())
  const [rawOrders, setRawOrders] = useState<OrderModel[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const clauses: any[] = [Q.where('is_deleted', Q.notEq(true)), Q.where('is_synced', false)]

    if (searchQuery) {
      const sanitized = Q.sanitizeLikeString(searchQuery)
      clauses.push(
        Q.or(
          Q.where('id', Q.like(`%${sanitized}%`)),
          Q.where('items_snapshot', Q.like(`%${sanitized}%`)),
        ),
      )
    }

    // Đẩy việc sắp xếp xuống thẳng Native SQLite Engine (Index-based B-Tree)
    clauses.push(Q.sortBy('created_at', Q.desc))

    const subscription = database
      .get<OrderModel>('orders')
      .query(...clauses)
      .observe()
      .subscribe({
        next: (list) => {
          setRawOrders(list)
          setIsLoading(false)
        },
        error: (err) => {
          console.error('[useOfflineOrders] observe error:', err)
          setIsLoading(false)
        },
      })

    return () => subscription.unsubscribe()
  }, [searchQuery])

  // Single-pass O(N): Map dữ liệu hiển thị và tính toán Thống kê trong 1 vòng lặp duy nhất
  const { orders, stats } = useMemo(() => {
    const len = rawOrders.length
    const list: IOrder[] = new Array(len)
    let totalItems = 0
    let totalRevenue = 0

    for (let i = 0; i < len; i++) {
      const o = rawOrders[i]
      const items = o.itemsSnapshot || []
      let orderQty = 0

      for (let j = 0; j < items.length; j++) {
        orderQty += items[j].quantity || 0
      }

      totalItems += orderQty
      totalRevenue += o.total || 0
      list[i] = mapLocalOrderToIOrder(o)
    }

    return {
      orders: list,
      stats: {
        count: len,
        totalItems,
        totalRevenue,
      },
    }
  }, [rawOrders])

  return {
    orders,
    stats,
    fetchNextPage: NOOP_ASYNC,
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading,
    refetch: NOOP_ASYNC,
  }
}
