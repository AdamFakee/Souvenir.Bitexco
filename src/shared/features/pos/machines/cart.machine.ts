import { toast } from '@/shared/store/use-alert-store'
import { assign, sendParent, setup } from 'xstate'
import { Affiliate, AppliedVoucher, CartItem, CartProduct } from '../types/cart.types'

export interface CartContext {
  id: string
  label: string
  items: Record<string, CartItem>
  discount: number
  appliedVoucher: AppliedVoucher | null
  note: string
  /** HDV / Đại lý gắn với phiên. null = khách lẻ */
  affiliate: Affiliate | null
}

export type CartEvent =
  | { type: 'ADD_ITEM'; product: any; quantity?: number }
  | { type: 'REMOVE_ITEM'; productId: string }
  | { type: 'UPDATE_QUANTITY'; productId: string; quantity: number }
  | { type: 'SET_DISCOUNT'; discount: number }
  | { type: 'APPLY_VOUCHER'; voucher: AppliedVoucher }
  | { type: 'REMOVE_VOUCHER' }
  | { type: 'SET_NOTE'; note: string }
  | { type: 'SET_AFFILIATE'; affiliate: Affiliate | null }
  | { type: 'CLEAR_CART' }

export const cartMachine = setup({
  types: {
    context: {} as CartContext,
    events: {} as CartEvent,
    input: {} as { id: string; label: string; initialContext?: Partial<CartContext> },
  },
}).createMachine({
  id: 'cart',
  initial: 'idle',
  context: ({ input }) => ({
    id: input.id,
    label: input.label,
    items: {},
    discount: 0,
    appliedVoucher: null,
    note: '',
    affiliate: null,
    ...input.initialContext,
  }),
  states: {
    idle: {
      on: {
        // Thêm sản phẩm vào giỏ hàng hoặc tăng số lượng nếu đã tồn tại
        ADD_ITEM: {
          actions: [
            assign(({ context, event }) => {
              const { product: productInput, quantity = 1 } = event

              // Normalize product to plain object to avoid cyclical structure issues with WatermelonDB models
              const product: CartProduct = {
                id: productInput.id,
                name: productInput.name || '',
                price: productInput.price,
                sku: productInput.sku || '',
                unit:
                  productInput.unit ||
                  ('unitCode' in productInput
                    ? (productInput.unitCode as string)
                    : 'unit_code' in productInput
                      ? (productInput as { unit_code: string }).unit_code
                      : ''),
                unitId:
                  productInput.unitId ||
                  ('unit_id' in productInput ? (productInput as { unit_id: string }).unit_id : ''),
                taxRate:
                  (productInput.taxRate as number) ||
                  ('tax_rate' in productInput
                    ? (productInput as { tax_rate: number }).tax_rate
                    : 0),
                image: productInput.image || null,
                stock: (productInput.stock as number) || null,
              }

              const existingItem = context.items[product.id]
              const currentQty = existingItem ? existingItem.quantity : 0

              if (product.stock !== undefined && product.stock !== null) {
                if (product.stock <= 0) {
                  toast.warning(`Sản phẩm [${product.name}] đã hết hàng!`, 'Hết hàng')
                  return {}
                }
                if (currentQty + quantity > product.stock) {
                  toast.warning(
                    `Sản phẩm [${product.name}] chỉ còn ${product.stock} sản phẩm trong kho!`,
                    'Vượt quá tồn kho',
                  )
                  return {}
                }
              }

              const updatedItems = {
                ...context.items,
                [product.id]: {
                  id: product.id,
                  product,
                  price: product.price,
                  quantity: currentQty + quantity,
                },
              }

              return { items: updatedItems }
            }),
            sendParent({ type: 'CART_UPDATED' }),
          ],
        },
        // Xóa hoàn toàn một sản phẩm khỏi giỏ hàng
        REMOVE_ITEM: {
          actions: [
            assign(({ context, event }) => {
              const { [event.productId]: _, ...remainingItems } = context.items
              return { items: remainingItems }
            }),
            sendParent({ type: 'CART_UPDATED' }),
          ],
        },
        // Cập nhật số lượng của một sản phẩm hiện có
        UPDATE_QUANTITY: {
          actions: [
            assign(({ context, event }) => {
              const { productId, quantity } = event
              if (quantity <= 0) {
                const { [productId]: _, ...remainingItems } = context.items
                return { items: remainingItems }
              }

              const item = context.items[productId]
              if (!item) return {}

              const stock = item.product.stock
              if (stock !== undefined && stock !== null && quantity > stock) {
                toast.warning(
                  `Sản phẩm [${item.product.name}] chỉ còn ${stock} sản phẩm trong kho!`,
                  'Vượt quá tồn kho',
                )
                return {}
              }

              return {
                items: {
                  ...context.items,
                  [productId]: { ...item, quantity },
                },
              }
            }),
            sendParent({ type: 'CART_UPDATED' }),
          ],
        },
        // Áp dụng giảm giá trực tiếp (số tiền hoặc %) cho toàn bộ đơn hàng
        SET_DISCOUNT: {
          actions: [
            assign({
              discount: ({ event }) => event.discount,
            }),
            sendParent({ type: 'CART_UPDATED' }),
          ],
        },
        // Áp dụng mã giảm giá (voucher) vào đơn hàng
        APPLY_VOUCHER: {
          actions: [
            assign({
              appliedVoucher: ({ event }) => event.voucher,
            }),
            sendParent({ type: 'CART_UPDATED' }),
          ],
        },
        // Gỡ bỏ voucher hiện tại khỏi giỏ hàng
        REMOVE_VOUCHER: {
          actions: [
            assign({
              appliedVoucher: null,
            }),
            sendParent({ type: 'CART_UPDATED' }),
          ],
        },
        // Thêm hoặc chỉnh sửa ghi chú cho đơn hàng
        SET_NOTE: {
          actions: [
            assign({
              note: ({ event }) => event.note,
            }),
            sendParent({ type: 'CART_UPDATED' }),
          ],
        },
        // Gắn / đổi HDV hoặc Đại lý cho phiên
        SET_AFFILIATE: {
          actions: [
            assign({
              affiliate: ({ event }) => event.affiliate,
              label: ({ event }) => event.affiliate?.name ?? '',
            }),
            sendParent({ type: 'CART_UPDATED' }),
          ],
        },
        // Xóa sạch giỏ hàng sau khi thanh toán thành công, xóa voucher và note, giữ nguyên affiliate
        CLEAR_CART: {
          actions: [
            assign({
              items: {},
              appliedVoucher: null,
              note: '',
              discount: 0,
            }),
            sendParent({ type: 'CART_UPDATED' }),
          ],
        },
      },
    },
  },
})
