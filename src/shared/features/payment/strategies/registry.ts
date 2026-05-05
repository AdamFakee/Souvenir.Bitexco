import { PaymentStrategy } from '../types/payment-strategy.type'
import { CashStrategy } from './cash.strategy'
import { QrStrategy } from './qr.strategy'

/**
 * Danh sách đăng ký các phương thức thanh toán khả dụng trong hệ thống.
 * Khi muốn thêm một phương thức mới (ví dụ: Momo, ZaloPay, Thẻ):
 * 1. Tạo Strategy cho phương thức đó.
 * 2. Thêm vào mảng PAYMENT_REGISTRY bên dưới.
 */
export const PAYMENT_REGISTRY: PaymentStrategy[] = [CashStrategy, QrStrategy]
