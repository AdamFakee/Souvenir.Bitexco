import { COLORS } from '@/shared/constants'
import { OrderStatus } from '@/shared/lib/database/models/order'

export const ORDER_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  ALL: {
    label: 'Tất cả',
    color: COLORS.primary.onFixedVariant,
    bgColor: COLORS.primary.fixed,
  },
  [OrderStatus.COMPLETED]: {
    label: 'Hoàn thành',
    color: COLORS.success.default,
    bgColor: COLORS.success.container,
  },
  [OrderStatus.REFUNDED]: {
    label: 'Hoàn tiền',
    color: COLORS.warning.default,
    bgColor: COLORS.warning.container,
  },
  [OrderStatus.FAILED]: {
    label: 'Thất bại',
    color: COLORS.error.default,
    bgColor: COLORS.error.container,
  },
}
