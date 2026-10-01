import { database, ProductModel } from '@/shared/lib/database'
import { Q } from '@nozbe/watermelondb'

export interface DeductStockItem {
  product: { id: string }
  quantity: number
}

/**
 * Trừ tồn kho sản phẩm.
 */
export const prepareDeductStock = async (items: DeductStockItem[]): Promise<ProductModel[]> => {
  if (items.length === 0) return []

  const productIds = items.map((i) => i.product.id)
  const products = await database
    .get<ProductModel>('products')
    .query(Q.where('id', Q.oneOf(productIds)))
    .fetch()

  return products.map((product) => {
    const cartItem = items.find((i) => i.product.id === product.id)
    if (!cartItem) return product

    return product.prepareUpdate((p) => {
      if (p.stock !== null && p.stock !== undefined) {
        p.stock = Math.max(0, p.stock - cartItem.quantity)
      }
    })
  })
}
