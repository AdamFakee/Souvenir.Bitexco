/**
 * Định dạng con số đếm (ví dụ: số bàn, số đơn hàng)
 * Nếu là 0, trả về '0'.
 * Nếu từ 1-9, trả về '01'-'09'.
 * Các trường hợp khác trả về chuỗi của số đó.
 */
export const formatCount = (value: number): string => {
  if (value === 0) return '0'
  return value.toString().padStart(2, '0')
}

/**
 * Định dạng doanh thu viết tắt (K, M)
 */
export const formatRevenue = (amount: number): string => {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`
  }
  return amount.toString()
}

/**
 * Định dạng tiền tệ VND (ví dụ: 100.000đ)
 */
export const formatVND = (amount: number): string => {
  return `${amount.toLocaleString('vi-VN')} vnđ`
}

// ponytail: lift formatter to module scope — creating Intl.NumberFormat per call
// was expensive on Hermes, especially inside FlatList/FlashList renderItem
const vndFormatter = new Intl.NumberFormat('vi-VN')

/**
 * Định dạng tiền tệ VND bằng Intl (ví dụ: 100.000 ₫)
 */
export const formatCurrency = (
  amount: number,
  options: { showSymbol?: boolean; suffix?: string } = { showSymbol: true },
): string => {
  const formatted = vndFormatter.format(amount)
  if (options.showSymbol === false) return formatted
  return `${formatted} ${options.suffix || '₫'}`
}
