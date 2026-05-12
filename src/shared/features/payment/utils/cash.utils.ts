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

const VND_DENOMS = [10_000, 20_000, 50_000, 100_000, 200_000, 500_000]

/**
 * Logic gợi ý số tiền khách đưa (Suggestions):
 * @param amount Tổng số tiền cần thanh toán (đã làm tròn).
 * @param typed Chuỗi ký tự số khách đã nhập từ Numpad.
 * @returns Danh sách tối đa 3 gợi ý số tiền (number[]).
 *
 * Quy tắc:
 * 1. Nếu khách CHƯA NHẬP (typed rỗng):
 *    - Làm tròn lên theo các mệnh giá phổ biến (10k, 20k, 50k, 100k, 200k, 500k).
 *    - Chỉ gợi ý số tiền LỚN HƠN tổng tiền (không gợi ý đúng số tiền).
 * 2. Nếu khách ĐANG NHẬP SỐ NHỎ (typed < 1000):
 *    - Giả định khách đang nhập số tờ (VD: "7" → 700k, "50" → 500k).
 *    - Gợi ý bằng cách nhân với 1k, 10k, 100k.
 *    - Chặn trên ở 10× amount để tránh gợi ý vô lý.
 * 3. Nếu khách ĐÃ NHẬP SỐ LỚN (typed >= 1000):
 *    - Trả về danh sách rỗng ([]) vì khách đang nhập chính xác số tiền.
 */
export const getCashSuggestions = (amount: number, typed: string): number[] => {
  if (typed) {
    const typedNum = Number(typed.replace(/\D/g, ''))

    if (typedNum <= 0 || typedNum >= 1000) return []

    const MAX = amount * 10
    return [typedNum * 1_000, typedNum * 10_000, typedNum * 100_000]
      .filter((v) => v > amount && v <= MAX)
      .slice(0, 3)
  }

  const candidates = new Set<number>()

  for (const denom of VND_DENOMS) {
    candidates.add(Math.ceil(amount / denom) * denom)
  }

  return Array.from(candidates)
    .filter((v) => v > amount)
    .sort((a, b) => a - b)
    .slice(0, 3)
}
