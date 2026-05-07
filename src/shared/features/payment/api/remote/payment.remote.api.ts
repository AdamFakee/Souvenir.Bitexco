import { OrderStatus } from '@/shared/lib/database/models/order'
import { PaymentMethod } from '@/shared/lib/database/models/payment'
import type {
  OrderItemRaw,
  OrderRaw,
  PaymentRaw,
} from '@/shared/features/order/api/remote/order.remote.api'
import type { CartItem } from '@/shared/features/pos/store/use-cart-store'

export interface CreateOrderResponse {
  /** ID đơn hàng do Backend tạo ra */
  orderId: string
}

export interface GetQrResponse {
  /** Số hóa đơn do Backend sinh ra (dùng cho đối soát) */
  billNumber: string
  /** Chuỗi nội dung để render QR Code */
  qrContent: string
}

export interface VerifyPaymentResponse {
  /** Trạng thái đã thanh toán hay chưa */
  isPaid: boolean
}

export interface OrderSyncDataResponse {
  order: OrderRaw
  orderItems: OrderItemRaw[]
  payments: PaymentRaw[]
}

/**
 * Remote API cho luồng thanh toán QR Code.
 * Hiện tại là Mock, sẽ thay bằng Real API khi Backend cung cấp endpoint.
 */
export const PaymentRemoteAPI = {
  /**
   * Tạo Order và trả về orderId.
   */
  createOrder: async (payload: {
    items: CartItem[]
    total: number
    discount: number
    voucherCode?: string
    staffId: string
    shiftId: string
  }): Promise<CreateOrderResponse> => {
    // --- MOCK: Giả lập delay mạng 1 giây ---
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const mockOrderId = `BE_QR_${Date.now()}`
    return { orderId: mockOrderId }
    // --- END MOCK ---
  },

  /**
   * Lấy nội dung mã QR dựa vào orderId.
   */
  getQrCode: async (orderId: string): Promise<GetQrResponse> => {
    // --- MOCK: Giả lập delay mạng 0.5 giây ---
    await new Promise((resolve) => setTimeout(resolve, 500))
    const billNumber = `BILL_${Date.now()}`
    const qrContent = `https://payment.mock/qr/${orderId}?bill=${billNumber}`
    return { billNumber, qrContent }
    // --- END MOCK ---
  },

  /**
   * Xác thực trạng thái thanh toán (Polling).
   */
  _mockCounts: new Map<string, number>(),
  verifyPaymentTransaction: async (orderId: string): Promise<VerifyPaymentResponse> => {
    // --- MOCK: Giả lập delay mỗi lần poll 800ms ---
    await new Promise((resolve) => setTimeout(resolve, 800))

    const currentCount = PaymentRemoteAPI._mockCounts.get(orderId) || 0
    const nextCount = currentCount + 1
    PaymentRemoteAPI._mockCounts.set(orderId, nextCount)

    const isPaid = nextCount >= 4
    if (isPaid) PaymentRemoteAPI._mockCounts.delete(orderId) // Dọn dẹp

    return { isPaid }
    // --- END MOCK ---
  },

  /**
   * Kéo dữ liệu Order, OrderItems, Payments của một đơn hàng cụ thể.
   * Dùng để cập nhật database local sau khi thanh toán thành công.
   */
  getOrderSyncData: async (orderId: string): Promise<OrderSyncDataResponse> => {
    console.log('PaymentRemoteAPI: Fetching sync data for order...', orderId)

    // --- MOCK: Giả lập trả về dữ liệu chuẩn từ server ---
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const mockOrderId = orderId
    const mockShiftId = `shift_mock_123` // Giả lập shift id
    const mockStaffId = `staff_mock_456` // Giả lập staff id

    // 1. Mock Order Items (Dùng Product ID từ mock-products.json)
    const orderItems: OrderItemRaw[] = [
      {
        id: `item_1_${Date.now()}`,
        order_id: mockOrderId,
        product_id: 'prod_1',
        product_name_snapshot: 'Wooden postcard Magnet, GMHN',
        price_snapshot: 129000,
        quantity: 1,
        refunded_quantity: 0,
        subtotal: 129000,
        tax_rate_snapshot: 8,
        tax_amount: 9555,
        discount_amount: 0,
        is_deleted: false,
        created_at: Date.now(),
        updated_at: Date.now(),
      },
      {
        id: `item_2_${Date.now()}`,
        order_id: mockOrderId,
        product_id: 'prod_15',
        product_name_snapshot: 'Tượng & Mô hình mẫu số 15',
        price_snapshot: 40000,
        quantity: 2,
        refunded_quantity: 0,
        subtotal: 80000,
        tax_rate_snapshot: 8,
        tax_amount: 5925,
        discount_amount: 0,
        is_deleted: false,
        created_at: Date.now(),
        updated_at: Date.now(),
      },
    ]

    // 2. Mock Payments
    const payments: PaymentRaw[] = [
      {
        id: `pay_${Date.now()}`,
        order_id: mockOrderId,
        method: PaymentMethod.BANK_TRANSFER,
        amount: 209000,
        reference_code: `REF_${Date.now()}`,
        is_deleted: false,
        created_at: Date.now(),
        updated_at: Date.now(),
      },
    ]

    // 3. Mock Order
    const order: OrderRaw = {
      id: mockOrderId,
      shift_id: mockShiftId,
      staff_id: mockStaffId,
      status: OrderStatus.COMPLETED,
      subtotal: 209000,
      discount: 0,
      voucher_discount: 0,
      total: 209000,
      total_tax: 15480,
      customer_tax_info: null,
      items_snapshot: orderItems.map((i) => ({
        productId: i.product_id,
        sku: 'SKU_MOCK',
        name: i.product_name_snapshot,
        price: i.price_snapshot,
        quantity: i.quantity,
        subtotal: i.subtotal,
        taxRate: i.tax_rate_snapshot,
        taxAmount: i.tax_amount,
        discountAmount: i.discount_amount,
      })),
      payments_snapshot: payments.map((p) => ({
        method: p.method,
        amount: p.amount,
      })),
      is_deleted: false,
      created_at: Date.now(),
      updated_at: Date.now(),
    }

    return { order, orderItems, payments }
    // --- END MOCK ---
  },
}
