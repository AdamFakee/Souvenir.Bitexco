# Mô-đun Thanh toán Đa phương thức (Payment Engine & Gateways)

Mô-đun quản lý toàn bộ các phương thức thanh toán tại quầy POS: Tiền mặt (Cash), QR Ngân hàng (BIDV VietQR), Quẹt thẻ ngân hàng (BIDV EDC Card Terminal), Thanh toán kết hợp (Split/Mix Payment) và Xác thực voucher khuyến mãi.

---

> ⚠️ **Đoạn Cảnh báo & Phân biệt:**
>
> - Mô-đun **Payment** điều khiển quy trình xác thực tiền/giao dịch của từng phương thức và giao tiếp máy in/két tiền, **KHÔNG quản lý danh mục sản phẩm**.
> - Đối với thanh toán QR, hệ thống sử dụng cơ chế polling trạng thái thanh toán từ server cho đến khi nhận được tín hiệu hoàn tất.

---

## 🔗 Danh sách Tham chiếu (Reference Links)

- Spec Bán hàng & Thanh toán: [docs/specs/0001-pos-checkout-sales.md](../../../docs/specs/0001-pos-checkout-sales.md)

---

## 1. Đang có gì (Bảng danh mục tệp)

| Tệp                                 | Trách nhiệm                                    | Chạm Vào/Ra (I/O)                                 |
| :---------------------------------- | :--------------------------------------------- | :------------------------------------------------ |
| `api/remote/generate-qr-code.ts`    | Tạo chuỗi VietQR động kèm mã giao dịch         | 🌐 REST API (`GET /v1/pos/payments/:id/qr`)       |
| `api/remote/get-payment-status.ts`  | Polling kiểm tra trạng thái thanh toán QR      | 🌐 REST API (`GET /v1/pos/payments/:id/status`)   |
| `api/remote/card-capture.ts`        | Capture giao dịch thẻ từ máy quẹt thẻ EDC      | 🌐 REST API (`POST /v1/pos/payments/:id/capture`) |
| `api/remote/transition-payment.ts`  | Chuyển đổi trạng thái dòng thanh toán          | 🌐 REST API                                       |
| `api/remote/verify-voucher.ts`      | Xác thực mã voucher giảm giá                   | 🌐 REST API                                       |
| `api/remote/get-payment-methods.ts` | Lấy danh sách phương thức thanh toán kích hoạt | 🌐 REST API                                       |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **Hiển thị VietQR trên Customer Vice Screen:**
   - **Quyết định**: Khi chọn phương thức QR, mã QR động được gửi lên màn hình phụ hướng về khách hàng.
   - **Lý giải**: Khách hàng quét mã thuận tiện, không cần nhìn nghiêng vào màn hình của thu ngân.
2. **Kích hoạt két tiền tự động:**
   - **Quyết định**: Chỉ kích hoạt xung mở két tiền (Cash Drawer Kick) khi đơn hàng có chứa phương thức thanh toán Tiền mặt.
   - **Lý giải**: Đảm bảo an toàn tài chính, tránh mở két khi khách thanh toán bằng QR hoặc Thẻ.

---

## 3. Hướng dẫn kiểm thử & Chạy lệnh

```bash
# Kiểm tra TypeScript strict mode
npm run check-type

# Kiểm tra Linter
npm run lint
```
