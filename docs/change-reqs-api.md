## Note 1: Đơn sinh từ trả hàng (exchange-out) — chặn đổi/trả tiếp

> **[Vấn đề thực tế]**: Đơn hàng được **tạo ra từ nghiệp vụ trả hàng** (đơn bán mới sinh sau exchange)
> **Ví dụ**: Đơn A đổi hàng => tạo ra đơn B => đơn B sẽ không đổi hàng được nữa (canExchange: false, canReturn: false)

### Ví dụ đơn thực tế cần chặn

```json
{
  "code": "SO-2607231501BAC8",
  "canExchange": false,
  "canReturn": false,
  "returnStatus": "RETURNED",
  "fulfillmentStatus": "FULFILLED",
  "originalOrderId": null,
  "itemsSnapshot": [
    {
      "sku": "2030102000036",
      "name": "Áo SKD đèn XL",
      "quantity": 1,
      "remainingQty": 0,
      "returnedQty": 1
    }
  ],
  "refunds": [{ "refundAmount": 100000, "reason": "" }],
  "totalRefunded": 100000
}
```

**Khi nhận `POST /refund` hoặc `POST /exchange` cho đơn đã satisfy bất kỳ điều kiện trên → BE trả `400` + `order.invalid_state`.**

FE dựa vào `canReturn` / `canExchange` từ list API để disable nút. BE enforce lại khi nhận request thực tế.

---

## Note 2: Ràng buộc quyền đổi/trả + `managerAuth` (TODO BACKEND — chưa triển khai)

> **[Hiện trạng]**: API `POST /v1/pos/orders/{id}/refund` và `POST /v1/pos/orders/{id}/exchange` **chưa triển khai** kiểm tra quyền (permission) và luồng `managerAuth`. BE cần bổ sung.

### Request body (FE gửi khi retry)

```json
{
  "idempotencyKey": "refund-…",
  "reason": "Sản phẩm lỗi",
  "shiftId": "uuid-ca",
  "staffId": "uuid-nv-thu-ngan",
  "managerAuth": {
    "employeeCode": "MGR001",
    "pin": "123456"
  }
}
```

| Field                      | Bắt buộc        | Mô tả                       |
| -------------------------- | --------------- | --------------------------- |
| `managerAuth`              | Không (lần đầu) | Gửi kèm khi retry sau `403` |
| `managerAuth.employeeCode` | Có\*            | Mã nhân viên quản lý        |
| `managerAuth.pin`          | Có\*            | PIN của quản lý             |

### Error codes BE phải trả về

| HTTP  | Code                               | Mô tả                                         |
| ----- | ---------------------------------- | --------------------------------------------- |
| `403` | `order.manager_approval_required`  | NV thu ngân không có quyền, cần QL xác nhận   |
| `403` | `refund.cashier_threshold`         | Vượt ngưỡng giá trị cho phép, cần QL xác nhận |
| `401` | `auth.invalid_manager_credentials` | PIN QL sai hoặc QL không có quyền             |

### BE rules

| Mã     | Rule                                                                                                  |
| ------ | ----------------------------------------------------------------------------------------------------- |
| AUTH01 | Kiểm tra `staffId` có quyền `pos.refund` / `pos.exchange` không.                                      |
| AUTH02 | Nếu không có quyền hoặc giá trị vượt ngưỡng → `403` với code tương ứng **trước khi** xử lý nghiệp vụ. |
| AUTH03 | Khi có `managerAuth`: xác thực `employeeCode` + `pin`; kiểm tra QL có đủ quyền approve.               |
| AUTH04 | PIN sai hoặc QL không đủ quyền → `401` `auth.invalid_manager_credentials`.                            |
| AUTH05 | PIN đúng + QL có quyền → tiếp tục xử lý refund/exchange bình thường.                                  |
| AUTH06 | `managerAuth` null/omit mà NV không có quyền → chỉ trả `403`, **không** tự bỏ qua.                    |

### Áp dụng cho cả hai endpoint

- `POST /v1/pos/orders/{id}/refund`
- `POST /v1/pos/orders/{id}/exchange`

### FE notes (đã xử lý sẵn — chờ BE triển khai)

FE đã có Manager Overlay và logic retry với `managerAuth`. Khi BE ship, FE hoạt động ngay không cần sửa thêm.

---

## Note 3: Thiếu `originalOrderId` trên đơn exchange-child — BE phải set (TODO BACKEND)

> **[Vấn đề]**: Đơn bán mới sinh từ nghiệp vụ đổi hàng (`POST /exchange`) **không được BE gán `originalOrderId`** → FE không phân biệt được đâu là đơn exchange-child để chặn đổi/trả tiếp.

### Ví dụ đơn exchange-child thực tế (lỗi)

```json
{
  "code": "SO-2607231501AC66",
  "canExchange": true,
  "canReturn": true,
  "note": "Exchange of SO-2607231501BAC8 (return RT-26072315018075)",
  "originalOrderId": null,
  "originalOrderCode": null,
  "paymentsSnapshot": [{ "method": "exchange", "amount": 100000, "provider": null }],
  "returnStatus": "NONE",
  "status": "COMPLETED"
}
```

**Vấn đề:**

- `originalOrderId` = `null` — **sai**, BE phải set UUID đơn gốc (`SO-2607231501BAC8`)
- `originalOrderCode` = `null` — **sai**, phải set mã đơn gốc
- `canExchange: true` và `canReturn: true` — **sai**, đơn exchange-child không được đổi/trả tiếp

### Yêu cầu BE

#### 1. Set `originalOrderId` + `originalOrderCode` khi tạo đơn exchange-child

| Field               | Kiểu          | Bắt buộc | Mô tả                              |
| ------------------- | ------------- | -------- | ---------------------------------- |
| `originalOrderId`   | string (UUID) | **Có**   | UUID đơn gốc bị đổi                |
| `originalOrderCode` | string        | **Có**   | Mã đơn gốc (SO-...) để FE hiển thị |

#### 2. Thêm field `isExchangeOrder` trên response `GET /v1/pos/orders`

| Field             | Kiểu    | Bắt buộc | Mô tả                                                 |
| ----------------- | ------- | -------- | ----------------------------------------------------- |
| `isExchangeOrder` | boolean | **Có**   | `true` nếu đơn này được sinh ra từ nghiệp vụ đổi hàng |

**Logic BE:**

```
isExchangeOrder = originalOrderId != null
```

Nếu BE đã set `originalOrderId` đúng → FE có thể tự tính `isExchangeOrder = !!originalOrderId`.  
Tuy nhiên, nên expose trường này để tường minh và không phụ thuộc FE suy luận.

#### 3. `canExchange` và `canReturn` phải tính lại đúng

Khi `isExchangeOrder = true` (tức `originalOrderId != null`):

- `canExchange` = **`false`**
- `canReturn` = **`false`** (hoặc theo product rule — nhưng mặc định chặn)

### Ví dụ response đúng sau khi fix

```json
{
  "code": "SO-2607231501AC66",
  "originalOrderId": "019f8f7e-8896-75da-9b0f-eabc238ed7a1",
  "originalOrderCode": "SO-2607231501BAC8",
  "isExchangeOrder": true,
  "canExchange": false,
  "canReturn": false,
  "paymentsSnapshot": [{ "method": "exchange", "amount": 100000, "provider": null }]
}
```

### FE notes

1. Map `OrderListApiItem.originalOrderId` + `isExchangeOrder` → `IOrder`.
2. `checkCanExchange` đã check `!originalOrderId` — khi BE fix, sẽ hoạt động đúng tự động.
3. Fallback hiện tại: FE detect `paymentsSnapshot[].method === 'exchange'` để nhận biết đơn exchange-child — **nhưng đây chỉ là workaround**, cần BE set `originalOrderId` đúng.

---

## Note 4: Lưu trữ và hiển thị thông tin tiền khách đưa (`cashTendered`) và tiền thừa (`cashChange`)

> **[Vấn đề]**: Khi thực hiện thanh toán tiền mặt ở chế độ Online, API checkout hiện chỉ ghi nhận số tiền thanh toán thực tế khớp với hóa đơn (`amount = 100,000đ`). Backend chưa hỗ trợ lưu trữ số tiền mặt khách đưa thực tế (ví dụ: `200,000đ`) và số tiền chênh lệch/tiền thừa phải trả lại khách (`100,000đ`). Điều này dẫn đến việc khi xem lại chi tiết đơn hàng (OrderDetail) hoặc in lại hóa đơn lịch sử, thông tin khách đưa và tiền thừa đều bị hiển thị sai lệch thành `100,000đ` và `0đ`.

### Yêu cầu BE

#### 1. Bổ sung các trường vào payload `POST /v1/pos/checkout`

Trong danh sách `payments` gửi lên, hỗ trợ nhận thêm `cashTendered` (tiền khách đưa) và `cashChange` (tiền thừa):

```json
"payments": [
  {
    "method": "cash",
    "amount": 100000,
    "cashTendered": 200000,
    "cashChange": 100000
  }
]
```

#### 2. Lưu trữ và trả về thông tin này trong API lấy chi tiết đơn hàng

Trong response của API chi tiết đơn hàng và danh sách đơn hàng (`GET /v1/pos/orders` / `GET /v1/pos/orders/{id}`), cấu trúc của `paymentsSnapshot` (hoặc `payments`) cần chứa thông tin tiền khách đưa và tiền thừa:

```json
"paymentsSnapshot": [
  {
    "method": "cash",
    "amount": 100000,
    "cashTendered": 200000,
    "cashChange": 100000
  }
]
```

### FE notes

1. FE đã chuẩn bị sẵn luồng thu thập `cashTendered` và `cashChange` từ giao diện Numpad thanh toán.
2. Khi BE hỗ trợ lưu trữ các trường này trong database và trả về qua API, FE sẽ hiển thị chính xác lịch sử tiền khách đưa và tiền thừa tại màn hình **OrderDetail** cũng như khi in lại bill từ lịch sử.

---

## Note 5: Lệch dữ liệu doanh thu giữa `GET /v1/pos/dashboard/product-revenue` và `GET /v1/pos/dashboard/overview`

> **[Vấn đề]**: Khi thống kê doanh thu ca:
>
> - API overview (`/v1/pos/dashboard/overview`) trả về đúng doanh thu thực tế bán ra (`totalRevenue = 100,000đ`).
> - API chi tiết sản phẩm (`/v1/pos/dashboard/product-revenue`) tính toán sai doanh thu bằng cách tự cộng thêm thuế vào giá đã gồm thuế cho cả **từng mặt hàng** (`items[].total = 108,000đ` thay vì `100,000đ` đối với sản phẩm đơn giá 100k số lượng 1) và **tổng doanh thu báo cáo** (`totalRevenue = 108,000đ`).

### Ví dụ dữ liệu thực tế bị lệch:

- **API product-revenue (Sai)**:

```json
{
  "items": [
    {
      "name": "Áo SKD trang 3XL",
      "price": 100000,
      "qty": 1,
      "total": 108000
    }
  ],
  "page": 0,
  "pageSize": 10,
  "totalCount": 1,
  "totalItems": 1,
  "totalRevenue": 108000
}
```

- **API overview (Đúng)**:

```json
{
  "cancelledOrders": 0,
  "completedOrders": 1,
  "employeeCode": "1234",
  "employeeName": "Dev Ops Engineer",
  "paymentMethods": [
    {
      "amount": 100000,
      "method": "cash",
      "name": "Tiền mặt"
    }
  ],
  "shiftStart": "03:04",
  "shiftTime": "0:02",
  "totalProductsSold": 1,
  "totalRevenue": 100000
}
```

### Yêu cầu BE:

Sửa lại công thức tính doanh thu trong API `/v1/pos/dashboard/product-revenue` để không cộng dồn thêm thuế VAT vào giá bán thực tế của sản phẩm (giá bán đã bao gồm thuế). Tổng doanh thu và doanh thu từng sản phẩm trong báo cáo sản phẩm phải khớp với tổng doanh thu trong báo cáo overview.

---

## Note 6: Hỗ trợ bộ lọc trạng thái hoạt động và giao dịch cho danh sách CTV và Đại lý (API hiện tại)

> **[Bối cảnh]**: Các API danh sách Cộng tác viên (`GET /v1/pos/affiliates`) và Đại lý (`GET /v1/pos/partners`) hiện có trên hệ thống cần hỗ trợ các tham số truy vấn (Query Parameters) sau để phục vụ tính năng lọc trên giao diện Đơn hàng.

### Các tham số lọc cần hỗ trợ:

1. **Lọc trạng thái hoạt động:**
   - **Tham số:** `isActive` (boolean).
   - **Mô tả:** `true` = chỉ lấy các CTV/Đại lý đang hoạt động (Active); `false` = chỉ lấy các đối tượng đã tạm dừng hoạt động.

2. **Lọc theo lịch sử giao dịch:**
   - **Tham số:** `hasTransaction` (boolean).
   - **Mô tả:** `true` = chỉ hiển thị các CTV/Đại lý đã từng phát sinh ít nhất một giao dịch/đơn hàng thành công; `false` = hiển thị các CTV/Đại lý chưa phát sinh đơn hàng.

### Ví dụ Request từ Client:

- Lọc danh sách CTV đang hoạt động và đã phát sinh giao dịch:
  `GET /v1/pos/affiliates?isActive=true&hasTransaction=true`
- Lọc danh sách Đại lý đang hoạt động và đã phát sinh giao dịch:
  `GET /v1/pos/partners?isActive=true&hasTransaction=true`
