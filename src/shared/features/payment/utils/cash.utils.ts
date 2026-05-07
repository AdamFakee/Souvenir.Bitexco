/**
 * Làm tròn số tiền theo quy tắc tiền mặt Việt Nam:
 * - Dưới 500đ: Làm tròn xuống (ví dụ 10.400 -> 10.000)
 * - Từ 500đ trở lên: Làm tròn lên (ví dụ 10.500 -> 11.000)
 * @param amount Số tiền cần làm tròn
 * @returns Số tiền sau khi làm tròn đến hàng nghìn
 */
export const roundCashAmount = (amount: number): number => {
  return Math.round(amount / 1000) * 1000
}
