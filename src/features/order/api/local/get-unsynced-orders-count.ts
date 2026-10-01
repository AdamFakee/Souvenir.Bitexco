import { database, OrderModel } from '@/shared/lib/database'
import { Q } from '@nozbe/watermelondb'

/**
 * Lấy số lượng đơn hàng chưa đồng bộ lên server.
 */
export async function getUnsyncedOrdersCount(): Promise<number> {
  try {
    return await database.get<OrderModel>('orders').query(Q.where('is_synced', false)).fetchCount()
  } catch (e) {
    console.error('✏️ [getUnsyncedOrdersCount] error:', e)
    return 0
  }
}
