# API POS — Yêu Cầu Bổ Sung Thiết Bị (Backend)

Tài liệu này lưu trữ các yêu cầu thay đổi/bổ sung phía API (Backend) phục vụ cho POS.

# Bổ sung yêu cầu: Cung cấp và lọc theo Trạng thái đơn hàng của Backend

Yêu cầu Backend cung cấp thông tin trạng thái chi tiết của đơn hàng và đồng bộ tham số lọc để Client gọi API chính xác.

## 1. Yêu cầu chi tiết

- **Trạng thái trả về (Response status):** API cần trả về chính xác chuỗi trạng thái đơn hàng (order status) được định nghĩa trên hệ thống Backend/Database thay vì ép Client tự map hoặc dùng enum `OrderStatus` giới hạn của Client.
- **Tham số lọc (Query parameter `status`):** Endpoint lấy danh sách đơn hàng `GET /v1/pos/orders` chỉ chấp nhận tham số `status` là các giá trị trạng thái thực tế do Backend định nghĩa (không query theo enum Client `OrderStatus` cũ gồm `PENDING`, `COMPLETED`, `REFUNDED`, `FAILED`).
- **Tài liệu bàn giao:** Backend cần cung cấp đầy đủ danh sách các status khả dụng và mô tả ý nghĩa chi tiết của từng status để FE đối chiếu hiển thị ( tài liệu yêu cầu thêm cả label cho từng status).

# Bổ sung yêu cầu: Cung cấp thông tin hoàn tiền / trả hàng (Refund/Return)

Để hiển thị lịch sử và chi tiết các đợt trả hàng của đơn hàng tại giao diện POS, yêu cầu Backend bổ sung các trường thông tin hoàn tiền vào Response của API Danh sách đơn hàng `GET /v1/pos/orders` (và API Chi tiết đơn hàng tương ứng).

## 1. Cấu trúc thông tin trả hàng bổ sung

### 1.1 Thêm vào thông tin đơn hàng (`OrderListApiItem`)

| Tên trường (camelCase) | Kiểu dữ liệu          | Bắt buộc / Optional / Nullable | Mô tả                                                                                                          |
| :--------------------- | :-------------------- | :----------------------------- | :------------------------------------------------------------------------------------------------------------- |
| `totalRefunded`        | `number`              | **Optional**                   | Tổng số tiền đã hoàn trả cho đơn hàng tính đến hiện tại. Nếu không có, mặc định coi là `0`.                    |
| `refunds`              | `RefundHistoryItem[]` | **Optional**                   | Danh sách các đợt trả hàng/hoàn tiền liên quan đến đơn hàng này. Nếu không có, mặc định coi là mảng rỗng `[]`. |

### 1.2 Thêm vào thông tin chi tiết từng mặt hàng (`ItemSnapshot`)

| Tên trường (camelCase) | Kiểu dữ liệu | Bắt buộc / Optional / Nullable | Mô tả                                                                                        |
| :--------------------- | :----------- | :----------------------------- | :------------------------------------------------------------------------------------------- |
| `returnedQty`          | `number`     | **Optional**                   | Số lượng của sản phẩm này đã bị trả lại qua các đợt. Nếu không có, mặc định coi là `0`.      |
| `remainingQty`         | `number`     | **Optional**                   | Số lượng sản phẩm còn lại có thể thực hiện trả tiếp. Nếu không có, mặc định bằng `quantity`. |

---

## 2. Chi tiết cấu trúc dữ liệu con (Nested Models)

### 2.1 Cấu trúc `RefundHistoryItem` (Chi tiết đợt trả hàng)

| Tên trường (camelCase) | Kiểu dữ liệu | Bắt buộc / Optional / Nullable | Mô tả                                             |
| :--------------------- | :----------- | :----------------------------- | :------------------------------------------------ |
| `refundAmount`         | `number`     | **Bắt buộc**                   | Số tiền thực tế hoàn trả cho khách trong đợt này. |
| `reason`               | `string`     | **Bắt buộc / Nullable**        | Lý do trả hàng.                                   |
| `refundedAt`           | `string`     | **Bắt buộc**                   | Thời gian thực hiện trả hàng (ISO 8601).          |

---

## 3. Ví dụ mẫu JSON Response bổ sung thông tin trả hàng

Ví dụ minh họa cho đơn hàng có trạng thái **Hoàn tiền một phần** (`PARTIALLY_REFUNDED`):

```json
{
  "id": "ord-uuid-123456",
  "shiftId": "shift-uuid-999",
  "staffId": "staff-uuid-888",
  "status": "PARTIALLY_REFUNDED",
  "subtotal": 171000,
  "discount": 0,
  "voucherCode": null,
  "voucherDiscount": 0,
  "total": 171000,
  "totalTax": 15545,
  "note": null,
  "isDeleted": false,
  "canReturn": true,
  "createdAt": "2026-06-18T08:00:00Z",
  "updatedAt": "2026-06-18T10:30:00Z",
  "totalRefunded": 78000,
  "refunds": [
    {
      "refundAmount": 78000,
      "reason": "Khách đổi ý không lấy Magnet",
      "refundedAt": "2026-06-18T10:30:00Z"
    }
  ],
  "itemsSnapshot": [
    {
      "productId": "prod-uuid-1",
      "sku": "2010113000043",
      "barcode": "2010113000043",
      "name": "Metal Magnet Bitexco",
      "price": 78000,
      "quantity": 2,
      "subtotal": 156000,
      "taxRate": 0.08,
      "taxAmount": 12480,
      "discountAmount": 0,
      "note": null,
      "returnedQty": 1,
      "remainingQty": 1
    },
    {
      "productId": "prod-uuid-2",
      "sku": "2010113000088",
      "barcode": "2010113000088",
      "name": "Postcard Saigon Skydeck",
      "price": 15000,
      "quantity": 1,
      "subtotal": 15000,
      "taxRate": 0.08,
      "taxAmount": 1200,
      "discountAmount": 0,
      "note": null,
      "returnedQty": 0,
      "remainingQty": 1
    }
  ]
}
```
