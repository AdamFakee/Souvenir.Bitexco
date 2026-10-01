# Động cơ Xử lý Giao dịch Thanh toán (Payment Engine Core)

Động cơ điều phối trạng thái thanh toán đa phương thức (Payment State Machine), tích hợp cổng thanh toán QR Ngân hàng (BIDV VietQR) và giao thức điều khiển máy quẹt thẻ POS EDC.

---

> ⚠️ **Đoạn Cảnh báo & Phân biệt:**
>
> - `src/core/payment-engine` là phân lớp **Layer 2 (Core Business Logic)**: Chứa máy trạng thái thanh toán và cổng giao tiếp kết nối, tuyệt đối **KHÔNG import từ `src/features/` hoặc `src/app/`**.
> - Quản lý giao dịch thanh toán theo quy trình nguyên tử (Atomic Transactions) đảm bảo tổng các khoản thanh toán bằng đúng tổng giá trị đơn hàng.

---

## 🔗 Danh sách Tham chiếu (Reference Links)

- Spec Bán hàng & Thanh toán: [docs/specs/0001-pos-checkout-sales.md](../../../docs/specs/0001-pos-checkout-sales.md)
- Spec Trừu tượng hóa Phần cứng: [docs/specs/0005-hardware-hal-printer.md](../../../docs/specs/0005-hardware-hal-printer.md)

---

## 1. Đang có gì (Bảng danh mục tệp)

| Tệp                         | Trách nhiệm                                                                         | Chạm Vào/Ra (I/O) |
| :-------------------------- | :---------------------------------------------------------------------------------- | :---------------- |
| `payment-fsm.ts`            | State Machine quản lý các trạng thái PENDING, PROCESSING, COMPLETED, FAILED, VOIDED | ❌ Logic thuần    |
| `qr-poller.ts`              | Điều phối polling trạng thái thanh toán QR với cơ chế exponential backoff           | 🌐 REST API I/O   |
| `card-terminal-protocol.ts` | Giao thức truyền thông điệp điều khiển máy quẹt thẻ EDC qua Serial / TCP            | ⚠️ Hardware I/O   |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **Polling QR thông minh (Exponential Backoff & Timeout):**
   - **Quyết định**: Polling mỗi 2 giây trong 60 giây đầu, sau đó giảm tần suất và timeout sau 3 phút nếu khách chưa chuyển khoản.
   - **Lý giải**: Tối ưu hóa lưu lượng mạng và giải phóng tài nguyên khi khách hàng từ bỏ giao dịch.
2. **Quy tắc Void / Cancel thanh toán kết hợp:**
   - **Quyết định**: Khi khách hàng hủy đơn trong lúc đang thanh toán kết hợp nhiều phần, hệ thống tự động void các chặng thẻ/QR đã xử lý trước khi đóng phiên giao dịch.
   - **Lý giải**: Tránh treo tiền của khách hàng và đảm bảo tính nhất quán sổ sách.

---

## 3. Hướng dẫn kiểm thử & Chạy lệnh

```bash
# Kiểm tra TypeScript strict mode
npm run check-type

# Kiểm tra Linter
npm run lint
```
