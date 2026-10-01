import { database, OrderModel } from '@/shared/lib/database'
import { Q } from '@nozbe/watermelondb'

/**
 * Lấy danh sách đơn hàng chưa đồng bộ
 */
export async function getUnsyncedLocalOrders(): Promise<OrderModel[]> {
  return await database.get<OrderModel>('orders').query(Q.where('is_synced', false)).fetch()
}
