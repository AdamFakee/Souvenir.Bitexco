# Động cơ Bán hàng Cốt lõi (POS Engine Core)

Động cơ tính toán giỏ hàng, phân bổ thuế VAT, áp dụng chiết khấu voucher, xử lý gói Combo và điều phối lưu trữ ngoại tuyến Outbox cho hệ thống POS Bitexco SkyStore.

---

> ⚠️ **Đoạn Cảnh báo & Phân biệt:**
>
> - `src/core/pos-engine` là phân lớp **Layer 2 (Core Business Logic)**: Chứa pure business logic, tuyệt đối **KHÔNG import từ `src/features/` hoặc `src/app/`**.
> - Mọi thao tác tính toán tiền, VAT, discount phải tuân thủ công thức Gross Price niêm yết tại quầy.

---

## 🔗 Danh sách Tham chiếu (Reference Links)

- Spec Bán hàng & Giỏ hàng: [docs/specs/0001-pos-checkout-sales.md](../../../docs/specs/0001-pos-checkout-sales.md)
- Spec Đồng bộ Ngoại tuyến: [docs/specs/0004-offline-sync-engine.md](../../../docs/specs/0004-offline-sync-engine.md)
- Spec Combo & Khuyến mãi: [docs/specs/0010-combo-promotions.md](../../../docs/specs/0010-combo-promotions.md)

---

## 1. Đang có gì (Bảng danh mục tệp)

| Tệp                         | Trách nhiệm                                                    | Chạm Vào/Ra (I/O)   |
| :-------------------------- | :------------------------------------------------------------- | :------------------ |
| `cart-calculator.ts`        | Tính toán tổng tiền, chiết khấu, VAT dòng món và phân bổ combo | ❌ Logic thuần      |
| `offline-outbox-manager.ts` | Quản lý ghi đơn vào hàng đợi SQLite Outbox khi mất mạng        | ⚠️ Local SQLite I/O |
| `idempotency-generator.ts`  | Sinh mã Idempotency Key duy nhất cho mỗi giao dịch             | ❌ Logic thuần      |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **Công thức bóc tách VAT từ Gross Price:**
   - **Quyết định**: $\text{VAT} = \text{Price} \times \left(\frac{\text{taxRate}}{100 + \text{taxRate}}\right)$.
   - **Lý giải**: Giá niêm yết tại quầy lưu niệm đã bao gồm thuế VAT để khách hàng dễ dàng nhận biết tổng số tiền thanh toán.
2. **Idempotency Key độc nhất:**
   - **Quyết định**: Mỗi lần nhấn thanh toán sinh một key dạng `pos-checkout-{timestamp}-{uuid}`.
   - **Lý giải**: Đảm bảo an toàn khi gửi lại request hoặc đồng bộ ngoại tuyến, tránh tạo trùng đơn hay trừ kho 2 lần.

---

## 3. Hướng dẫn kiểm thử & Chạy lệnh

```bash
# Kiểm tra TypeScript strict mode
npm run check-type

# Kiểm tra Linter
npm run lint
```
