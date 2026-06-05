# Souvenir POS — Tính năng & Rule (Backend-focused)

---

## Mục lục

1. [auth — Xác thực](#1-auth--xác-thực)
2. [payment — Thanh toán](#2-payment--thanh-toán)
3. [order — Đơn hàng](#3-order--đơn-hàng)
4. [shift — Ca làm việc](#4-shift--ca-làm-việc)
5. [product — Sản phẩm](#5-product--sản-phẩm)
6. [dashboard — Thống kê](#6-dashboard--thống-kê)
7. [Local DB Schema (FE SQLite)](#7-local-db-schema-fe-sqlite)

---

## 1. `auth` — Xác thực

### API Endpoints

| Method | URL                        | Mô tả                             |
| ------ | -------------------------- | --------------------------------- |
| POST   | `/v1/pos-devices/activate` | Kích hoạt thiết bị (1 lần)        |
| POST   | `/v1/device/auth/login`    | Đăng nhập nhân viên               |
| POST   | `/v1/device/auth/refresh`  | Refresh access token              |
| POST   | `/v1/device/auth/logout`   | Đăng xuất (thu hồi refresh token) |
| GET    | `/v1/device/auth/me`       | Thông tin nhân viên hiện tại      |

### Rules BE phải đảm bảo

**Token Delivery Mode (ADR-0022):**

- Khi request có header `X-Token-Delivery: body` → trả `refreshToken` trong JSON body, **không** set cookie
- Khi **thiếu** header này → set cookie (web mode), trả `refreshToken: null` trong JSON
- React Native client **bắt buộc** gửi header này — nếu BE bỏ qua logic này, client không lưu được refresh token

**Refresh Token Rotation:**

- Mỗi lần gọi `/refresh` thành công → trả `refreshToken` **mới** (khác cái cũ)
- Token cũ phải bị revoke ngay lập tức sau khi đã phát token mới
- Nếu dùng refresh token đã revoke → trả `401`

**Login response fields bắt buộc:**

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "employee": {
    "id": "...",
    "employeeCode": "...",
    "name": "...",
    "permissions": ["print:shift", "..."]
  },
  "device": { "id": "...", "deviceCode": "..." }
}
```

**Logout:**

- Thu hồi refresh token server-side
- Nếu token không tồn tại → vẫn trả `200` (idempotent)

---

## 2. `payment` — Thanh toán

### API Endpoints

| Method | URL                                 | Mô tả                                  |
| ------ | ----------------------------------- | -------------------------------------- |
| POST   | `/v1/pos/checkout`                  | Tạo đơn & ghi nhận thanh toán (atomic) |
| GET    | `/v1/pos/payments/:id/qr`           | Lấy nội dung QR BIDV                   |
| GET    | `/v1/pos/payments/:id/status`       | Polling trạng thái QR                  |
| POST   | `/v1/pos/payments/:id/process`      | Chuyển payment sang processing (card)  |
| POST   | `/v1/pos/payments/:id/capture-info` | Lưu thông tin EDC card                 |
| POST   | `/v1/pos/payments/:id/authorize`    | Authorize card payment                 |
| POST   | `/v1/pos/payments/:id/capture`      | Capture (hoàn tất) card payment        |
| POST   | `/v1/pos/payments/:id/cancel`       | Void / cancel payment leg              |

### Checkout Request (POST /v1/pos/checkout)

```json
{
  "cashSessionId": "session_xxx",
  "customerId": null,
  "currency": "VND",
  "notes": null,
  "lines": [
    {
      "variantId": "uuid",
      "unitId": "uuid",
      "qty": 2,
      "unitPrice": 50000,
      "discountAmount": 0,
      "taxRate": 0.08
    }
  ],
  "payments": [{ "method": "cash", "amount": 100000, "provider": null, "cardTerminalId": null }],
  "voucherCode": null,
  "issueInvoice": false,
  "customerName": null,
  "customerTaxId": null,
  "customerAddress": null
}
```

### Rules BE phải đảm bảo

**Checkout:**

- Toàn bộ thao tác là **atomic** — order + payments được tạo cùng 1 transaction, không để trạng thái nửa chừng
- `currency` luôn là `"VND"`
- Nếu có nhiều payment legs (mixed) → tổng `amount` phải bằng `grandTotal`

**Checkout Response bắt buộc có:**

```json
{
  "orderId": "uuid",
  "orderCode": "ORD-xxx",
  "grandTotal": 100000,
  "payments": [
    {
      "paymentId": "uuid",
      "method": "qr_bidv",
      "amount": 50000,
      "state": "PENDING",
      "version": 1
    }
  ]
}
```

- `paymentId` bắt buộc có cho từng payment leg (client dùng để poll QR / điều khiển terminal)

**Mix Payment — Cancel flow:**

- Client cancel theo thứ tự: void payment leg trước → cancel order sau
- Nếu cancel order cần manager approval → trả `403 order.manager_approval_required`

---

## 3. `order` — Đơn hàng

### API Endpoints

| Method | URL                           | Mô tả                            |
| ------ | ----------------------------- | -------------------------------- |
| GET    | `/v1/pos/orders`              | Danh sách đơn (có filter/paging) |
| POST   | `/v1/pos/orders/:id/refund`   | Trả hàng / hoàn tiền             |
| POST   | `/v1/pos/orders/:id/exchange` | Đổi hàng                         |
| POST   | `/v1/pos/orders/:id/cancel`   | Hủy đơn                          |
| POST   | `/v1/pos/sync/orders`         | Sync bulk đơn offline            |

### 3.1 Danh sách đơn (GET /v1/pos/orders)

**Query params:** `status`, `q`, `date_from`, `date_to`, `page`, `limit`

**Response bắt buộc có:**

```json
{
  "items": [...],
  "totalCount": 100,
  "page": 1,
  "pageSize": 20
}
```

**Rules:**

- `date_from` / `date_to` là ISO string, BE filter theo ngày đầy đủ
- Mỗi item phải có field `canReturn` (boolean) — client dùng để ẩn/hiện nút trả hàng
  - `canReturn = false` khi đơn đã hoàn tiền, hoặc hết thời hạn trả, hoặc có điều kiện đặc biệt khác

### 3.2 Refund — POST /v1/pos/orders/:id/refund

**Request:**

```json
{
  "idempotency_key": "refund-1234567890-abc",
  "reason": "Khách đổi ý",
  "shift_id": "uuid",
  "staff_id": "uuid",
  "lines": [{ "productId": "uuid", "qty": 1 }],
  "manager_auth": {
    "employee_code": "MGR001",
    "pin": "1234"
  }
}
```

**Rules:**

- `idempotency_key` — nếu cùng key đã xử lý thành công → trả lại kết quả cũ, không xử lý lại
- `manager_auth` là optional field — chỉ có khi nhân viên đã qua bước PIN quản lý
- Nếu đơn cần phê duyệt quản lý và `manager_auth` vắng mặt → trả `403 order.manager_approval_required`
- Nếu `manager_auth` sai → trả `401 auth.invalid_manager_credentials`
- Số lượng trả (`qty`) không được vượt số lượng gốc trong đơn
- `order.canReturn = false` hoặc status không phải `COMPLETED` → từ chối

**Response:**

```json
{
  "returnId": "uuid",
  "returnCode": "RET-xxx",
  "orderId": "uuid",
  "orderCode": "ORD-xxx",
  "refundAmount": 50000,
  "status": "COMPLETED"
}
```

### 3.3 Exchange — POST /v1/pos/orders/:id/exchange

**Request:**

```json
{
  "idempotencyKey": "exchange-1234567890-abc",
  "reason": "Đổi size",
  "shift_id": "uuid",
  "staff_id": "uuid",
  "returned_lines": [{ "productId": "uuid", "qty": 1 }],
  "replacement_lines": [
    {
      "variantId": "uuid",
      "unitId": "uuid",
      "qty": 1,
      "unitPrice": 60000,
      "discountAmount": 0,
      "taxRate": 0.08
    }
  ]
}
```

**Rules:**

- Đơn có voucher / discount → từ chối (`order.exchange_voucher_not_allowed`)
- `replacementValue >= returnedValue` — không cho đổi hàng có giá trị thấp hơn
  - `returnedValue` tính theo giá gốc trong snapshot
  - `replacementValue` = tổng `unitPrice * qty + VAT` của replacement lines
- Nếu chênh lệch dương → client thanh toán thêm (FE xử lý, BE ghi nhận)

**Response:**

```json
{
  "exchangeId": "uuid",
  "exchangeCode": "EXC-xxx",
  "orderId": "uuid",
  "returnedValue": 50000,
  "replacementValue": 60000,
  "differenceAmount": 10000,
  "status": "COMPLETED"
}
```

### 3.4 Cancel — POST /v1/pos/orders/:id/cancel

**Request:**

```json
{
  "shift_id": "uuid",
  "staff_id": "uuid",
  "reason": "cashier_cancelled_payment",
  "manager_auth": { "employee_code": "MGR001", "pin": "1234" }
}
```

**Rules:** Tương tự Refund — hỗ trợ Manager Approval flow (`403` / `401`).

### 3.5 Offline Sync — POST /v1/pos/sync/orders

**Request:** Array (không phải object)

```json
[
  {
    "id": "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx",
    "shiftId": "uuid",
    "staffId": "uuid",
    "status": "COMPLETED",
    "subtotal": 100000,
    "discount": 0,
    "voucherCode": null,
    "voucherDiscount": 0,
    "total": 100000,
    "totalTax": 8000,
    "itemsSnapshot": [...],
    "paymentsSnapshot": [...],
    "isDeleted": false,
    "createdAt": "2026-06-04T10:00:00.000Z",
    "updatedAt": "2026-06-04T10:00:00.000Z"
  }
]
```

**Rules:**

- Payload phải là **array** — không wrap trong object
- Tất cả ID phải là GUID format (FE tự convert trước khi gửi)
- Tất cả field là **camelCase** (FE đã map từ snake_case SQLite)
- Upsert theo `id` — nếu đã tồn tại → update, chưa có → insert
- Trả `200` sau khi xử lý xong toàn bộ batch

### Error Codes (Order)

| HTTP | Error Code                                 | Mô tả                                    |
| ---- | ------------------------------------------ | ---------------------------------------- |
| 403  | `order.manager_approval_required`          | Cần PIN quản lý để tiếp tục              |
| 401  | `auth.invalid_manager_credentials`         | PIN quản lý sai                          |
| 401  | `auth.insufficient_manager_permissions`    | Quản lý không đủ quyền                   |
| 404  | `order.not_found`                          | Không tìm thấy đơn                       |
| 422  | `order.invalid_state`                      | Trạng thái đơn không cho phép thao tác   |
| 422  | `order.return_quantity_exceeded`           | Số lượng trả vượt quá cho phép           |
| 422  | `order.exchange_voucher_not_allowed`       | Đơn có voucher không được đổi            |
| 422  | `order.exchange_replacement_value_invalid` | Giá trị đổi mới < giá trị trả            |
| 409  | _(any)_                                    | Conflict version — client reload lại đơn |
| 429  | _(any)_                                    | Rate limit                               |

> **Quan trọng:** FE đọc `error.response.data.errorCode` hoặc `error.response.data.error` để phân loại.
> BE phải trả **nhất quán** một trong hai field đó.

---

## 4. `shift` — Ca làm việc

### API Endpoints

| Method | URL                             | Mô tả                                |
| ------ | ------------------------------- | ------------------------------------ |
| GET    | `/v1/pos/shifts/:id`            | Chi tiết ca (kèm `state`, `version`) |
| POST   | `/v1/pos/shifts/:id/transition` | Thực hiện transition                 |
| GET    | `/v1/pos/shifts/:id/statistics` | Số liệu dự kiến chốt ca              |
| GET    | `/v1/pos/shifts/:id/z-report`   | Báo cáo Z cuối ca                    |

### Close Shift — 3 bước OCC

FE gọi tuần tự, mỗi bước re-fetch `version` từ server:

| Bước | Action         | Điều kiện gọi             | Từ state    | Sang state  |
| ---- | -------------- | ------------------------- | ----------- | ----------- |
| 1    | `start_close`  | `state === 'OPEN'`        | OPEN        | CLOSING     |
| 2    | `submit_count` | `state === 'CLOSING'`     | CLOSING     | RECONCILING |
| 3    | `resolve`      | `state === 'RECONCILING'` | RECONCILING | CLOSED      |

**Request mỗi bước:**

```json
{
  "action": "start_close",
  "expectedVersion": 3
}
```

**submit_count có thêm:**

```json
{
  "action": "submit_count",
  "expectedVersion": 4,
  "countedCash": 500000,
  "notes": "Lý do chênh lệch nếu có"
}
```

### Rules BE phải đảm bảo

**OCC (Optimistic Concurrency Control):**

- `expectedVersion` phải khớp với `version` hiện tại của ca trên server
- Nếu không khớp → trả `409 Conflict` (client sẽ re-fetch và retry)
- Sau mỗi transition thành công → tăng `version` lên 1

**Idempotency:**

- Nếu client gọi lại cùng transition khi ca đã ở state tiếp theo → trả `200` (không lỗi)
- Ví dụ: gọi `start_close` khi ca đã ở `CLOSING` → ignore, trả current state

**Statistics endpoint:**

- Trả `expectedEndingCash` = tiền đầu ca + tổng thu tiền mặt trong ca
- FE dùng để hiển thị con số "dự kiến" để nhân viên đối chiếu

**Z-Report:**

- Chỉ trả data cho nhân viên có quyền `print:shift` (check từ JWT/session)
- Nếu không có quyền → `403`

---

## 5. `product` — Sản phẩm

### API Endpoints

| Method | URL                       | Mô tả                                   |
| ------ | ------------------------- | --------------------------------------- |
| GET    | `/v1/pos/products/sync`   | Sync delta sản phẩm về local            |
| GET    | `/v1/pos/products/lookup` | Lookup theo barcode (dùng cho Exchange) |

### Rules

**Sync delta:**

- Query param: `since=<ISO timestamp>` → chỉ trả sản phẩm thay đổi sau timestamp đó
- Nếu không có `since` → trả toàn bộ (full sync)
- Mỗi sản phẩm phải có đủ: `variantId`, `unitId`, `taxRate` — FE dùng cho checkout

**Lookup barcode:**

- Query param: `barcode=<code>` hoặc `sku=<code>`
- Trả `null` / `404` nếu không tìm thấy (không lỗi 500)
- Response cần có: `variantId`, `productId`, `unitId`, `unitCode`, `price`, `taxRate`, `available` (stock)

---

## 6. `dashboard` — Thống kê

### API Endpoints

| Method | URL                 | Mô tả                |
| ------ | ------------------- | -------------------- |
| GET    | `/v1/pos/dashboard` | Thống kê ca hiện tại |

### Rules

- Query param: `shiftId`
- Trả số liệu đã tính sẵn: doanh thu, số đơn, tổng theo từng phương thức thanh toán
- VAT đã bao gồm trong doanh thu — **không** để FE tự tính lại
- Nếu ca đã đóng → vẫn trả được (FE có thể query ca cũ nếu cần)

---

## 7. Local DB Schema (FE SQLite)

> FE dùng WatermelonDB. Ghi lại để BE biết cấu trúc dữ liệu FE sync lên.
> Tất cả bảng dùng UUID string làm PK.

### Sync fields (mọi bảng đều có)

| Field         | Type    | Mô tả                                     |
| ------------- | ------- | ----------------------------------------- |
| `is_deleted`  | Boolean | Soft delete                               |
| `sync_status` | String  | `DRAFT` / `PENDING` / `SYNCED` / `FAILED` |
| `created_at`  | Number  | Unix ms                                   |
| `updated_at`  | Number  | Unix ms                                   |

### Bảng `orders`

| Field               | Type          | Mô tả                      |
| ------------------- | ------------- | -------------------------- |
| `id`                | String (UUID) | PK                         |
| `shift_id`          | String        | FK → shifts                |
| `staff_id`          | String        | FK → staff                 |
| `status`            | String        | `COMPLETED`, `REFUNDED`    |
| `subtotal`          | Number        | Trước giảm giá             |
| `discount`          | Number        | Giảm giá                   |
| `voucher_code`      | String        | Mã voucher                 |
| `voucher_discount`  | Number        | Giảm từ voucher            |
| `total`             | Number        | Tổng cuối                  |
| `total_tax`         | Number        | Tổng VAT                   |
| `refund_reason`     | String        | Lý do hoàn                 |
| `original_order_id` | String        | FK → đơn gốc (refund)      |
| `items_snapshot`    | JSON          | Mảng sản phẩm lúc chốt     |
| `payments_snapshot` | JSON          | Mảng thanh toán lúc chốt   |
| `is_synced`         | Boolean       | `0` = chưa sync lên server |

### items_snapshot

```json
[
  {
    "productId": "uuid",
    "productName": "Móc khóa Bitexco",
    "sku": "MK-001",
    "price": 50000,
    "quantity": 2,
    "subtotal": 100000,
    "taxRate": 0.08
  }
]
```

### payments_snapshot

```json
[
  { "method": "CASH", "amount": 50000, "cashTendered": 100000, "cashChange": 50000 },
  { "method": "CARD", "amount": 50000, "referenceCode": "BIDV12345" }
]
```

### Bảng `products`

| Field         | Type          | Mô tả                     |
| ------------- | ------------- | ------------------------- |
| `id`          | String (UUID) | = variantId               |
| `category_id` | String        | FK → categories           |
| `sku`         | String        | Mã sản phẩm               |
| `name`        | String        | Tên                       |
| `price`       | Number        | Giá bán                   |
| `stock`       | Number        | Tồn kho                   |
| `unit_id`     | String        | ID đơn vị                 |
| `unit_code`   | String        | Mã đơn vị                 |
| `tax_rate`    | Number        | VAT thập phân (0.08 = 8%) |

### Bảng `shifts`

| Field                  | Type          | Mô tả                    |
| ---------------------- | ------------- | ------------------------ |
| `id`                   | String (UUID) | PK                       |
| `staff_id`             | String        | FK → staff               |
| `device_id`            | String        | ID thiết bị POS          |
| `start_time`           | Number        | Unix ms                  |
| `end_time`             | Number        | Unix ms (null = đang mở) |
| `starting_cash`        | Number        | Tiền đầu ca              |
| `expected_ending_cash` | Number        | Dự kiến cuối ca          |
| `actual_ending_cash`   | Number        | Thực tế kiểm đếm         |
| `discrepancy_reason`   | String        | Lý do chênh lệch         |
| `status`               | String        | `OPEN` / `CLOSED`        |
