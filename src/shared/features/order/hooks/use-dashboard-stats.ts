import { PAYMENT_CHART_COLORS, PAYMENT_METHOD_LABELS } from '@/shared/features/payment'
import { database, OrderModel, OrderStatus, ProductModel } from '@/shared/lib/database'
import { Q } from '@nozbe/watermelondb'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

export interface DashboardStats {
  totalRevenue: number
  revCash: number
  revQr: number
  revCard: number
  completedOrders: number
  cancelledOrders: number
  totalProducts: number
  topProducts: { name: string; qty: number; stock: number }[]
  paymentMethodsData: { name: string; value: number; color: string }[]
}

const INITIAL_STATS: DashboardStats = {
  totalRevenue: 0,
  revCash: 0,
  revQr: 0,
  revCard: 0,
  completedOrders: 0,
  cancelledOrders: 0,
  totalProducts: 0,
  topProducts: [],
  paymentMethodsData: [],
}

export const useDashboardStats = (shiftId?: string) => {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['dashboard-stats', shiftId],
    queryFn: async () => {
      if (!shiftId) return INITIAL_STATS

      // 1. Fetch Orders and Products concurrently
      const [orders, products] = await Promise.all([
        database.get<OrderModel>('orders').query(Q.where('shift_id', shiftId)).fetch(),
        database.get<ProductModel>('products').query().fetch(),
      ])

      // 2. Build product stock map
      const stockMap: Record<string, number> = {}
      products.forEach((p) => {
        stockMap[p.id] = p.stock || 0
      })

      // 3. Revenue from Orders
      let revCash = 0
      let revQr = 0
      let revCard = 0

      // 4. Calculate Other Stats from Orders
      const completed = orders.filter((o) => o.status === OrderStatus.COMPLETED)
      const cancelled = orders.filter(
        (o) => o.status === OrderStatus.FAILED || o.status === OrderStatus.REFUNDED,
      )

      let totalProducts = 0
      const productCounts: Record<
        string,
        { id: string; name: string; qty: number; stock: number }
      > = {}

      completed.forEach((order) => {
        // Aggregate revenue
        order.paymentsSnapshot.forEach((payment) => {
          if (payment.method === 'cash') revCash += payment.amount
          if (payment.method === 'qr_bidv') revQr += payment.amount
          if (payment.method === 'card_bidv') revCard += payment.amount
        })

        // Aggregate products from snapshot
        order.itemsSnapshot.forEach((item) => {
          totalProducts += item.quantity
          if (!productCounts[item.productId]) {
            productCounts[item.productId] = {
              id: item.productId,
              name: item.name,
              qty: 0,
              stock: stockMap[item.productId] || 0,
            }
          }
          productCounts[item.productId].qty += item.quantity
        })
      })

      const totalRevenue = revCash + revQr + revCard

      const topProducts = Object.values(productCounts)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5)

      const paymentMethodsData = [
        { name: PAYMENT_METHOD_LABELS.cash, value: revCash, color: PAYMENT_CHART_COLORS.cash },
        { name: PAYMENT_METHOD_LABELS.qr_bidv, value: revQr, color: PAYMENT_CHART_COLORS.qr_bidv },
        {
          name: PAYMENT_METHOD_LABELS.card_bidv,
          value: revCard,
          color: PAYMENT_CHART_COLORS.card_bidv,
        },
      ].filter((d) => d.value > 0)

      return {
        totalRevenue,
        revCash,
        revQr,
        revCard,
        completedOrders: completed.length,
        cancelledOrders: cancelled.length,
        totalProducts,
        topProducts,
        paymentMethodsData,
      }
    },
    enabled: !!shiftId,
  })

  // Listen to DB changes to invalidate the query
  useEffect(() => {
    if (!shiftId) return

    // Listen to orders and products tables
    const subscription = database.withChangesForTables(['orders', 'products']).subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats', shiftId] })
    })

    return () => subscription.unsubscribe()
  }, [shiftId, queryClient])

  return {
    stats: query.data || INITIAL_STATS,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
  }
}
