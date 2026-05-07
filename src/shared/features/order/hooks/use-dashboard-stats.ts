import { OrderStatus, PaymentMethod, database, ProductModel } from '@/shared/lib/database'
import { useEffect, useState, useRef } from 'react'
import { Q } from '@nozbe/watermelondb'
import { OrderLocalAPI } from '../api/local/order.local.api'

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
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS)
  const [isLoading, setIsLoading] = useState(true)
  const productsStockRef = useRef<Record<string, number>>({})

  // Pre-fetch all products stock to avoid flickering
  useEffect(() => {
    database
      .get<ProductModel>('products')
      .query()
      .fetch()
      .then((products) => {
        const map: Record<string, number> = {}
        products.forEach((p) => {
          map[p.id] = p.stock || 0
        })
        productsStockRef.current = map
      })
  }, [])

  useEffect(() => {
    if (!shiftId) {
      setStats(INITIAL_STATS)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const subscription = OrderLocalAPI.observeOrdersByShift(shiftId).subscribe((orders) => {
      const completed = orders.filter((o) => o.status === OrderStatus.COMPLETED)
      const cancelled = orders.filter(
        (o) => o.status === OrderStatus.FAILED || o.status === OrderStatus.REFUNDED,
      )

      let totalRevenue = 0
      let revCash = 0
      let revQr = 0
      let revCard = 0
      let totalProducts = 0
      const productCounts: Record<
        string,
        { id: string; name: string; qty: number; stock: number }
      > = {}

      completed.forEach((order) => {
        totalRevenue += order.total

        // Aggregate payments from snapshot
        order.paymentsSnapshot.forEach((p) => {
          if (p.method === PaymentMethod.CASH) revCash += p.amount
          else if (p.method === PaymentMethod.BANK_TRANSFER) revQr += p.amount
          else if (p.method === PaymentMethod.CARD) revCard += p.amount
        })

        // Aggregate products from snapshot
        order.itemsSnapshot.forEach((item) => {
          totalProducts += item.quantity
          if (!productCounts[item.productId]) {
            productCounts[item.productId] = {
              id: item.productId,
              name: item.name,
              qty: 0,
              stock: productsStockRef.current[item.productId] || 0,
            }
          }
          productCounts[item.productId].qty += item.quantity
        })
      })

      // Top 5 Products
      const topProducts = Object.values(productCounts)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5)

      // Payment Methods Data for Chart
      const paymentMethodsData = [
        { name: 'Tiền mặt', value: revCash, color: '#0284c7' },
        { name: 'QR Code', value: revQr, color: '#db2777' },
        { name: 'Thẻ / Card', value: revCard, color: '#ca8a04' },
      ].filter((d) => d.value > 0)

      setStats({
        totalRevenue,
        revCash,
        revQr,
        revCard,
        completedOrders: completed.length,
        cancelledOrders: cancelled.length,
        totalProducts,
        topProducts,
        paymentMethodsData,
      })
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [shiftId])

  return { stats, isLoading }
}
