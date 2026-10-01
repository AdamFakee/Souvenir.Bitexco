import { database, OrderModel } from '@/shared/lib/database'
import { Q } from '@nozbe/watermelondb'

/**
 * Xóa vĩnh viễn các đơn hàng đã đồng bộ thành công khỏi Local Database (Delete on Sync).
 */
export async function markLocalOrdersSynced(orderIds: string[]): Promise<void> {
  if (!orderIds.length) return

  await database.write(async () => {
    const orders = await database
      .get<OrderModel>('orders')
      .query(Q.where('id', Q.oneOf(orderIds)))
      .fetch()

    const deletions = orders.map((order) => order.prepareDestroyPermanently())
    await database.batch(...deletions)
  })
}
