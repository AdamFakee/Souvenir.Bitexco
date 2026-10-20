# Mô-đun Đơn hàng & Đổi/Trả hàng (Orders, Refund & Exchange)

Mô-đun quản lý danh sách đơn hàng đã bán, in lại hóa đơn, hoàn tiền/trả hàng và thực hiện đổi hàng ngang giá kèm cơ chế tạo hóa đơn mới hoàn chỉnh.

---

> ⚠️ **Đoạn Cảnh báo & Phân biệt:**
>
> - Mô-đun **Order** chỉ xử lý đơn hàng sau khi đã hoàn tất bán (`COMPLETED`), **KHÔNG quản lý giỏ hàng đang thanh toán** (thuộc `src/features/pos` và `src/features/payment`).
> - Khi đổi hàng thành công, hóa đơn in ra là **Hóa đơn đơn hàng mới hoàn chỉnh** (`EXCHANGE RECEIPT`): sản phẩm đổi hết bị loại bỏ, sản phẩm đổi 1 phần giữ lại số lượng còn lại, sản phẩm mới được thêm vào và toàn bộ số liệu tài chính (`totalTax`, `total`, `subtotal`, `code`, `createdAt`) kế thừa từ đơn gốc `activeOrder`.

---

## 🔗 Danh sách Tham chiếu (Reference Links)

- Spec Kiến trúc: [docs/specs/0002-order-refund-exchange.md](../../../docs/specs/0002-order-refund-exchange.md)
- API Contract: [docs/api/order/](../../../docs/api/order/)
- Route Màn hình Đổi hàng: `src/app/exchange.tsx`

---

## 1. Đang có gì (Bảng danh mục tệp)

| Tệp                                       | Trách nhiệm                                                                                  | Chạm Vào/Ra (I/O) |
| :---------------------------------------- | :------------------------------------------------------------------------------------------- | :---------------- |
| `machines/exchange-order.machine.ts`      | Máy trạng thái XState quản lý luồng đổi hàng, quét barcode, tính chênh lệch và duyệt quản lý | ⚠️ State Machine  |
| `components/exchange-screen.tsx`          | Màn hình đổi hàng full-screen, chọn món trả, tìm món mới và dựng `saleOrder` in hóa đơn      | ❌ Logic thuần UI |
| `components/bitexco-receipt-template.tsx` | Template hóa đơn chuẩn Bitexco cho cả đơn bán mới và đơn đổi hàng                            | ❌ Template in    |
| `components/refund-receipt-template.tsx`  | Template hóa đơn hoàn trả tiền (Refund Receipt)                                              | ❌ Template in    |
| `components/order-detail-modal.tsx`       | Modal xem chi tiết đơn hàng, lịch sử thanh toán và in lại bill                               | ❌ Logic thuần UI |
| `api/remote/exchange-order.ts`            | Gọi API `POST /v1/pos/orders/{orderId}/exchange`                                             | 🌐 REST API       |
| `api/remote/get-orders.ts`                | Lấy danh sách lịch sử đơn hàng phân trang                                                    | 🌐 REST API       |
| `api/remote/refund-order.ts`              | Gọi API hoàn tiền / trả hàng                                                                 | 🌐 REST API       |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **In Hóa đơn Đơn hàng mới hoàn chỉnh thay vì chỉ in món đổi:**
   - **Quyết định**: Dựng `saleOrder` gồm: `remainingOldItems` (sản phẩm giữ lại với số lượng đã trừ) + `replacementItems` (sản phẩm mới thay thế).
   - **Lý giải**: Khách hàng cần một hóa đơn duy nhất phản ánh toàn bộ giao dịch mua sắm sau khi đổi, không phải cầm nhiều mảnh hóa đơn rời rạc.
2. **Kế thừa 100% tài chính và metadata từ đơn gốc (`activeOrder`):**
   - **Quyết định**: Thuế VAT (`totalTax`), tổng thanh toán (`total`), tổng phụ (`subtotal`), giảm giá (`discount`), mã hóa đơn (`code`), ngày tạo (`createdAt`) được lấy trực tiếp từ `activeOrder`.
   - **Lý giải**: Đổi ngang giá bảo toàn giá trị tài chính ban đầu. Kế thừa trực tiếp loại bỏ nguy cơ lệch làm tròn số hoặc sai công thức bóc tách thuế khi tính lại.
3. **Bắt buộc duyệt Quản lý (Manager Approval) khi có yêu cầu:**
   - **Quyết định**: Hỗ trợ modal nhập mã nhân viên và mã PIN quản lý để ủy quyền giao dịch đổi/trả.
   - **Lý giải**: Kiểm soát thất thoát và tuân thủ quy trình kiểm soát nội bộ của tòa nhà Bitexco.
4. **Sinh mã đơn hàng offline chuẩn `SO-DDMMYYYY-xxxxx` & Auto Sync ngầm:**
   - **Quyết định**: Sinh mã đơn offline theo format `SO-DDMMYYYY-xxxxx` với 5 ký tự ngẫu nhiên A-Z 0-9 (loại bỏ bộ đếm STT đơn hàng theo ngày). Tích hợp Auto Sync tự động trong `useSync` (đẩy đơn khi reconnect mạng & chạy ngầm 5 phút/lần).
   - **Lý giải**: Đảm bảo mã đơn duy nhất, loại bỏ rủi ro trùng số thứ tự giữa nhiều máy POS độc lập trong ca bán hàng offline.

---

## 3. Hướng dẫn kiểm thử & Chạy lệnh

```bash
# Kiểm tra TypeScript strict mode
npm run check-type

# Kiểm tra Linter
npm run lint
```
