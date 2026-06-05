# API POS — Tài liệu Tổng Hợp

Tổng hợp các endpoint liên quan đến POS: Phương thức thanh toán, Hủy đơn, Đồng bộ offline, Trả hàng / Hoàn tiền.

---

## Mục Lục

1. [Phương thức thanh toán — `GET /v1/payment-methods`](#1-phương-thức-thanh-toán)
2. [Hủy đơn hàng — `POST /v1/pos/orders/{id}/cancel`](#2-hủy-đơn-hàng)
3. [Đồng bộ đơn hàng offline — `POST /v1/pos/sync/orders`](#3-đồng-bộ-đơn-hàng-offline)
4. [Trả hàng / Hoàn tiền — `POST /v1/pos/orders/{id}/refund`](#4-trả-hàng--hoàn-tiền)

---

## 1. Phương Thức Thanh Toán

> Trả về danh sách phương thức thanh toán được cấu hình cho cửa hàng, bao gồm cấu hình ngân hàng (QR) và cấu hình thiết bị đầu cuối (Card Portable) để POS không cần hardcode.

- **Endpoint:** `GET /v1/payment-methods`
- **Xác thực:** Yêu cầu `Authorization: Bearer <accessToken>`

### Response (200 OK)

```json
[
  {
    "code": "cash",
    "name": "Tiền mặt",
    "icon": "banknote",
    "enabled": true,
    "provider": null,
    "settlementDays": 0,
    "displayOrder": 1,
    "isDefault": true,
    "bankConfig": null,
    "terminalConfig": null
  },
  {
    "code": "qr_bidv",
    "name": "VietQR BIDV",
    "icon": "qr-code",
    "enabled": true,
    "provider": "bidv",
    "settlementDays": 1,
    "displayOrder": 2,
    "isDefault": true,
    "bankConfig": {
      "bankCode": "BIDV",
      "accountNo": "12345678901",
      "accountName": "CONG TY TNHH SOUVENIR BITEXCO"
    },
    "terminalConfig": null
  },
  {
    "code": "card_bidv",
    "name": "Thẻ BIDV",
    "icon": "credit-card",
    "enabled": true,
    "provider": "card-bidv",
    "settlementDays": 1,
    "displayOrder": 4,
    "isDefault": true,
    "bankConfig": null,
    "terminalConfig": {
      "posUrl": "http://192.168.1.142:8080",
      "merchantName": "TGDD",
      "cashierId": "cashier01",
      "license": "name=TGDD;bank=BIDV;copyright=Use for TGDD only;..."
    }
  }
]
```

### Cấu Trúc `bankConfig` (Dành cho QR)

| Trường        | Kiểu dữ liệu | Bắt buộc | Mô tả                                                           |
| :------------ | :----------- | :------- | :-------------------------------------------------------------- |
| `bankCode`    | string       | ✓        | Mã ngân hàng tiêu chuẩn VietQR (Ví dụ: `BIDV`, `VCB`, `ICB`...) |
| `accountNo`   | string       | ✓        | Số tài khoản ngân hàng thụ hưởng nhận tiền                      |
| `accountName` | string       | ✓        | Tên chủ tài khoản thụ hưởng (In hoa không dấu)                  |

### Cấu Trúc `terminalConfig` (Dành cho Card Portable)

| Trường         | Kiểu dữ liệu | Bắt buộc | Mô tả                                                                |
| :------------- | :----------- | :------- | :------------------------------------------------------------------- |
| `posUrl`       | string       | ✓        | URL cổng kết nối socket trực tiếp tới thiết bị POS Ingenico          |
| `merchantName` | string       | ✓        | Tên đơn vị chấp nhận thẻ (Merchant Name)                             |
| `cashierId`    | string       | ✓        | Định danh thu ngân (Cashier ID)                                      |
| `license`      | string       | ✓        | Chuỗi giấy phép (License Key) được BIDV cung cấp để kết nối thiết bị |

### Hướng Dẫn Tích Hợp FE

1. **Luồng QR:** Khi khởi chạy app, POS gọi `GET /v1/payment-methods`, trích xuất `bankConfig` từ cổng `qr_bidv` và lưu vào `AppContext.tenantConfig`. Khi sinh mã QR (`POST /v1/payments/{id}/qr`), truyền các giá trị này lên.
2. **Luồng Card Portable:** Khi thu ngân chọn `card_bidv`, POS đọc `terminalConfig` và truyền động các tham số `posUrl`, `merchantName`, `cashierId`, `license` vào hàm `connect()` của `PortablePaymentService`.

---

## 2. Hủy Đơn Hàng

> **Luồng hoạt động:** Máy POS gửi request hủy đơn hàng khi thu ngân chọn hủy thanh toán trong quá trình chờ giao dịch không tiền mặt (QR/Card). Request cần gửi kèm ca làm việc và nhân viên để backend ghi audit trail.

- **Endpoint:** `POST /v1/pos/orders/{id}/cancel`
- **Xác thực:** Yêu cầu `Authorization: Bearer <accessToken>` (Device JWT)
- **Quyền hạn (Permission):** `pos:checkout`

### Path Parameters

| Tham số | Kiểu dữ liệu | Bắt buộc | Mô tả                     |
| ------- | ------------ | -------- | ------------------------- |
| `id`    | string       | Có       | UUID của đơn hàng cần hủy |

### Request Body

```json
{
  "shift_id": "uuid-ca-lam-viec",
  "staff_id": "uuid-nhan-vien",
  "reason": "cashier_cancelled_payment",
  "manager_auth": {
    "employee_code": "uuid-quan-ly-hoac-ma-nhan-vien",
    "pin": "123456"
  }
}
```

### Body Fields

| Trường                       | Kiểu dữ liệu | Bắt buộc | Mô tả                                                                          |
| :--------------------------- | :----------- | :------- | :----------------------------------------------------------------------------- |
| `shift_id`                   | string       | Có       | UUID ca làm việc/cash session hiện tại.                                        |
| `staff_id`                   | string       | Có       | UUID nhân viên thực hiện hủy đơn.                                              |
| `reason`                     | string       | Không    | Lý do hủy để audit/log.                                                        |
| `manager_auth`               | object       | Không    | Thông tin phê duyệt của Quản lý (chỉ gửi kèm khi retry hủy đơn cần phê duyệt). |
| `manager_auth.employee_code` | string       | Có       | Mã nhân viên quản lý phê duyệt.                                                |
| `manager_auth.pin`           | string       | Có       | Mã PIN hoặc Mật khẩu của quản lý (độ dài tùy ý).                               |

### Business Rules

| Mã   | Rule                                                                                                                                                                                                                                                        |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR01 | Chỉ cho phép hủy đơn ở trạng thái có thể hủy, ví dụ `PENDING` hoặc trạng thái backend cho phép.                                                                                                                                                             |
| BR02 | Không cho phép hủy đơn đã `COMPLETED`, đã bị hủy, hoặc trạng thái không hợp lệ.                                                                                                                                                                             |
| BR03 | Backend phải ghi nhận `staff_id`, `shift_id`, thời gian hủy và lý do hủy nếu có.                                                                                                                                                                            |
| BR04 | Nếu đơn đã reserve/trừ tồn kho lúc tạo, backend phải hoàn tồn kho khi hủy.                                                                                                                                                                                  |
| BR05 | Nếu đơn chưa reserve/trừ tồn kho, backend không cần restock khi hủy.                                                                                                                                                                                        |
| BR06 | Với mixed payment/cash đã thu một phần, tiền hoàn thực tế do thu ngân tự xử lý trực tiếp tại quầy; backend chỉ ghi nhận trạng thái hủy và số tiền liên quan nếu cần audit.                                                                                  |
| BR07 | Nếu có payment không tiền mặt đang pending, backend cần cancel/void payment hoặc đánh dấu order/payment ở trạng thái phù hợp để không capture tiếp.                                                                                                         |
| BR08 | Nếu tài khoản thu ngân không đủ quyền tự hủy đơn hàng, backend phải trả về HTTP `403` với mã lỗi `order.manager_approval_required` để kích hoạt popup PIN Quản lý trên POS.                                                                                 |
| BR09 | Khi nhận được `manager_auth` trong payload, backend tiến hành xác thực tài khoản và mã PIN của Quản lý. Nếu sai, trả về lỗi `auth.invalid_manager_credentials` (401). Nếu Quản lý không có quyền hủy, trả về `auth.insufficient_manager_permissions` (403). |

### Response (200 OK)

```json
{
  "orderId": "uuid-don-hang",
  "orderCode": "SO-20260602-001",
  "status": "CANCELLED",
  "cancelledAt": "2026-06-02T10:30:00Z"
}
```

| Trường        | Kiểu dữ liệu | Mô tả                                          |
| ------------- | ------------ | ---------------------------------------------- |
| `orderId`     | string       | UUID đơn hàng đã hủy.                          |
| `orderCode`   | string       | Mã đơn hàng hiển thị.                          |
| `status`      | string       | Trạng thái mới sau hủy, thường là `CANCELLED`. |
| `cancelledAt` | string       | Thời điểm backend ghi nhận hủy đơn.            |

### Error Codes

| HTTP  | Error Code                              | Trường hợp                                                               |
| ----- | --------------------------------------- | ------------------------------------------------------------------------ |
| `400` | `pos.session_not_found`                 | Không tìm thấy ca làm việc hiện tại.                                     |
| `400` | `order.invalid_state`                   | Đơn hàng không ở trạng thái cho phép hủy.                                |
| `401` | `auth.unauthorized`                     | Token hết hạn hoặc không hợp lệ.                                         |
| `401` | `auth.invalid_manager_credentials`      | Mã quản lý hoặc mã PIN không chính xác.                                  |
| `403` | `auth.forbidden`                        | Không có quyền `pos:checkout`.                                           |
| `403` | `order.manager_approval_required`       | Yêu cầu phê duyệt của Quản lý để hủy đơn (kích hoạt popup PIN trên POS). |
| `403` | `auth.insufficient_manager_permissions` | Tài khoản quản lý này không có quyền phê duyệt hủy đơn hàng.             |
| `404` | `order.not_found`                       | Không tìm thấy đơn hàng.                                                 |
| `409` | `order.version_conflict`                | OCC conflict — dữ liệu đã thay đổi, FE cần tải lại đơn.                  |
| `422` | `request.invalid_payload`               | Dữ liệu request không hợp lệ.                                            |
| `429` | `rate_limit.exceeded`                   | Rate limit.                                                              |
| `500` | `Internal server error`                 | `{ "error": "Internal server error", "traceId": "..." }`                 |

### Ghi Chú Tích Hợp FE

1. FE gửi `shift_id` và `staff_id` để backend audit.
2. FE dùng `status` trong response để update UI, không suy luận từ `{ success: true }`.
3. FE không tự restock local; nếu cần restock, backend xử lý theo rule reserve/trừ tồn.
4. Nếu cashier đã thu tiền mặt/mixed payment trước khi hủy, tiền hoàn thực tế do cashier tự xử lý trực tiếp với khách tại quầy.

---

## 3. Đồng Bộ Đơn Hàng Offline

> **Bối cảnh:** Khi máy POS mất mạng, các đơn hàng tiền mặt vẫn được tạo cục bộ (local) và lưu vào SQLite. Khách hàng đã trả tiền mặt và cầm bill rời đi — hệ thống buộc phải ghi nhận đơn hàng này bất chấp các ràng buộc để đảm bảo khớp dòng tiền của thu ngân.

- **Endpoint:** `POST /v1/pos/sync/orders`
- **Xác thực:** Yêu cầu `Authorization: Bearer <token>`

### Logic Backend Yêu Cầu

1. **KHÔNG** check tồn kho chặn đơn (có thể ghi nhận âm kho hoặc cảnh báo sau).
2. **KHÔNG** check lại voucher.
3. Lấy trực tiếp thông tin `total`, `subtotal`, `itemsSnapshot`, `paymentsSnapshot` từ body để lưu đè lên DB (Data Replication).
4. Nếu `id` (guid) đã tồn tại, tiến hành **Upsert** để tránh trùng lặp khi retry.

### Request Body

Body là một **JSON Array** trực tiếp (không bọc trong object):

```json
[
  {
    "id": "uuid",
    "shiftId": "uuid",
    "staffId": "uuid",
    "status": "COMPLETED",
    "subtotal": 150000,
    "discount": 0,
    "voucherCode": null,
    "voucherDiscount": 0,
    "total": 150000,
    "totalTax": 13636,
    "note": null,
    "refundReason": null,
    "originalOrderId": null,
    "customerTaxInfo": null,
    "itemsSnapshot": [
      {
        "productId": "uuid",
        "sku": "SP-001",
        "name": "Sản phẩm A",
        "price": 150000,
        "quantity": 1,
        "subtotal": 150000,
        "taxRate": 10,
        "taxAmount": 13636,
        "discountAmount": 0
      }
    ],
    "paymentsSnapshot": [
      {
        "method": "CASH",
        "amount": 150000,
        "cashTendered": 200000,
        "cashChange": 50000
      }
    ],
    "isDeleted": false,
    "createdAt": "2026-05-28T09:00:00.000Z",
    "updatedAt": "2026-05-28T09:00:00.000Z"
  }
]
```

> **Lưu ý:** `createdAt` và `updatedAt` phải là chuỗi ISO-8601 (không phải Unix timestamp số).

### Response (200 OK)

```json
{}
```

### Lợi Ích

1. Đảm bảo toàn vẹn dữ liệu kế toán và dòng tiền ca làm việc của thu ngân — tiền đã thu không bao giờ bị reject.
2. Quản lý trạng thái dễ dàng từ phía Mobile POS nhờ cơ chế Outbox Pattern và cờ `is_synced`.
3. Có thể Retry nhiều lần mà không sợ sinh ra nhiều đơn rác nhờ cơ chế Upsert theo `id` đơn hàng.

---

## 4. Trả Hàng / Hoàn Tiền

> **Luồng hoạt động:** Thu ngân chọn một hoặc nhiều sản phẩm trong đơn gốc, nhập số lượng cần trả, sau đó POS gửi một request online để backend validate, nhập lại tồn kho và trả về dữ liệu in phiếu trả hàng. **Tiền hoàn thực tế do thu ngân tự xử lý trực tiếp với khách tại quầy.**

- **Endpoint:** `POST /v1/pos/orders/{id}/refund`
- **Xác thực:** Yêu cầu `Authorization: Bearer <accessToken>` (Device JWT)
- **Quyền hạn (Permission):** `pos:refund`
- **Yêu cầu online:** Bắt buộc có mạng; FE không tạo phiếu trả hàng offline.

### Path Parameters

| Tham số | Kiểu dữ liệu | Bắt buộc | Mô tả                              |
| ------- | ------------ | -------- | ---------------------------------- |
| `id`    | string       | Có       | UUID của đơn hàng gốc cần trả hàng |

### Request Body

```json
{
  "idempotencyKey": "client-generated-uuid",
  "reason": "Sản phẩm lỗi",
  "shift_id": "uuid-ca-lam-viec",
  "staff_id": "uuid-nhan-vien",
  "lines": [
    { "productId": "uuid-san-pham-1", "qty": 2 },
    { "productId": "uuid-san-pham-2", "qty": 1 }
  ],
  "manager_auth": {
    "employee_code": "uuid-quan-ly-hoac-ma-nhan-vien",
    "pin": "123456"
  }
}
```

### Body Fields

| Trường                       | Kiểu dữ liệu | Bắt buộc | Mô tả                                                                                             |
| ---------------------------- | ------------ | -------- | ------------------------------------------------------------------------------------------------- |
| `idempotencyKey`             | string       | Có       | UUID do FE sinh cho mỗi lần bấm xác nhận trả hàng, dùng để backend chống duplicate khi POS retry. |
| `reason`                     | string       | Không    | Lý do trả hàng. Có thể là chuỗi rỗng nếu thu ngân không nhập lý do.                               |
| `shift_id`                   | string       | Có       | UUID ca làm việc/cash session hiện tại.                                                           |
| `staff_id`                   | string       | Có       | UUID nhân viên thực hiện trả hàng.                                                                |
| `lines`                      | array        | Có       | Danh sách sản phẩm và số lượng cần trả. Phải có ít nhất 1 dòng hợp lệ.                            |
| `lines[].productId`          | string       | Có       | UUID sản phẩm trong đơn gốc.                                                                      |
| `lines[].qty`                | number       | Có       | Số lượng trả của sản phẩm. Phải `> 0` và không vượt số lượng còn trả.                             |
| `manager_auth`               | object       | Không    | Thông tin phê duyệt của Quản lý (chỉ gửi kèm khi retry trả hàng cần phê duyệt).                   |
| `manager_auth.employee_code` | string       | Có       | Mã nhân viên quản lý phê duyệt.                                                                   |
| `manager_auth.pin`           | string       | Có       | Mã PIN hoặc Mật khẩu của quản lý (độ dài tùy ý).                                                  |

### Business Rules

| Mã   | Rule                                                                                                                                                                                                                                               |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR01 | Chỉ được trả hàng với đơn hàng đã thanh toán thành công.                                                                                                                                                                                           |
| BR02 | Chỉ được trả các sản phẩm tồn tại trong đơn hàng gốc.                                                                                                                                                                                              |
| BR03 | Số lượng trả không được vượt quá số lượng đã mua trừ số lượng đã trả trước đó.                                                                                                                                                                     |
| BR04 | Backend là nguồn dữ liệu chính để đối chiếu phiếu trả hàng và đơn hàng gốc.                                                                                                                                                                        |
| BR05 | Người dùng phải chọn ít nhất 1 sản phẩm để trả hàng; số lượng trả của mỗi dòng phải lớn hơn 0.                                                                                                                                                     |
| BR06 | Giá trị hoàn trả tính theo giá thực tế trên đơn hàng gốc, sau giảm giá nếu có.                                                                                                                                                                     |
| BR07 | Sau khi trả hàng thành công, backend cập nhật lại tồn kho của sản phẩm được trả.                                                                                                                                                                   |
| BR08 | Tiền hoàn thực tế do thu ngân tự xử lý trực tiếp; backend không cần xử lý chi tiền/settlement.                                                                                                                                                     |
| BR09 | Một đơn hàng có thể phát sinh nhiều lần trả hàng cho đến khi trả hết số lượng đã mua.                                                                                                                                                              |
| BR10 | Không cho phép trả hàng với đơn hàng đã bị hủy hoặc trạng thái không hợp lệ.                                                                                                                                                                       |
| BR11 | Backend deduplicate request theo `idempotencyKey` trong TTL ngắn (đề xuất 5 phút) để tránh tạo 2 phiếu trả hàng khi POS retry.                                                                                                                     |
| BR12 | Nếu tài khoản thu ngân không đủ quyền tự trả hàng, backend phải trả về HTTP `403` với mã lỗi `order.manager_approval_required` để kích hoạt popup PIN Quản lý trên POS.                                                                            |
| BR13 | Khi nhận được `manager_auth` trong payload, backend xác thực tài khoản và mã PIN của Quản lý. Nếu sai, trả về `auth.invalid_manager_credentials` (401). Nếu Quản lý không có quyền trả hàng, trả về `auth.insufficient_manager_permissions` (403). |

### Quy Tắc Làm Tròn Tiền Hoàn

Làm tròn đến hàng nghìn theo quy tắc tiền mặt Việt Nam:

| Giá trị tính toán | Giá trị hoàn sau làm tròn |
| ----------------- | ------------------------- |
| `10_400`          | `10_000`                  |
| `10_500`          | `11_000`                  |
| `125_499`         | `125_000`                 |
| `125_500`         | `126_000`                 |

> FE chỉ hiển thị tạm tính theo cùng quy tắc. Giá trị authoritative vẫn là `refundAmount` backend trả về.

### Response (200 OK)

```json
{
  "returnId": "uuid-phieu-tra-hang",
  "returnCode": "RTN-20260602-001",
  "orderId": "uuid-don-goc",
  "orderCode": "SO-20260602-001",
  "refundAmount": 126000,
  "status": "COMPLETED",
  "receipt": {
    "orderId": "uuid-don-goc",
    "orderCode": "SO-20260602-001",
    "returnId": "uuid-phieu-tra-hang",
    "returnCode": "RTN-20260602-001",
    "reason": "Sản phẩm lỗi",
    "refundedAt": "2026-06-02T10:30:00Z",
    "refundAmount": 126000,
    "lines": [
      {
        "productId": "uuid-san-pham-1",
        "sku": "SP-001",
        "name": "Cà phê sữa đá",
        "orderedQty": 4,
        "returnedQty": 2,
        "remainingQty": 2,
        "unitPrice": 63000,
        "lineRefundAmount": 126000,
        "isReturned": true
      },
      {
        "productId": "uuid-san-pham-2",
        "sku": "SP-002",
        "name": "Trà đào",
        "orderedQty": 1,
        "returnedQty": 0,
        "remainingQty": 1,
        "unitPrice": 45000,
        "lineRefundAmount": 0,
        "isReturned": false
      }
    ]
  }
}
```

### Response Fields

| Trường                             | Kiểu dữ liệu | Mô tả                                                                                        |
| ---------------------------------- | ------------ | -------------------------------------------------------------------------------------------- |
| `returnId`                         | string       | UUID phiếu trả hàng/hoàn tiền.                                                               |
| `returnCode`                       | string       | Mã phiếu trả hàng human-readable, ví dụ `RTN-20260602-001`.                                  |
| `orderId`                          | string       | UUID đơn hàng gốc.                                                                           |
| `orderCode`                        | string       | Mã đơn hàng gốc hiển thị/in bill.                                                            |
| `refundAmount`                     | number       | Tổng số tiền hoàn sau làm tròn.                                                              |
| `status`                           | string       | Trạng thái xử lý trả hàng, thường là `COMPLETED`.                                            |
| `receipt`                          | object       | Dữ liệu in phiếu trả hàng.                                                                   |
| `receipt.lines[].productId`        | string       | UUID sản phẩm.                                                                               |
| `receipt.lines[].orderedQty`       | number       | Số lượng đã mua trong đơn gốc.                                                               |
| `receipt.lines[].returnedQty`      | number       | Số lượng hoàn trong lần xử lý này.                                                           |
| `receipt.lines[].remainingQty`     | number       | Số lượng còn có thể trả sau lần xử lý này (`orderedQty - totalReturnedQtyAcrossAllReturns`). |
| `receipt.lines[].lineRefundAmount` | number       | Số tiền hoàn của dòng này.                                                                   |
| `receipt.lines[].isReturned`       | boolean      | `true` nếu dòng này có hoàn trong lần này.                                                   |

### Error Codes

| HTTP  | Error Code                              | Trường hợp                                                                |
| ----- | --------------------------------------- | ------------------------------------------------------------------------- |
| `400` | `order.return_quantity_exceeded`        | Số lượng trả hàng vượt quá số lượng cho phép.                             |
| `400` | `pos.session_not_found`                 | Không tìm thấy ca làm việc hiện tại.                                      |
| `401` | `auth.unauthorized`                     | Token hết hạn hoặc không hợp lệ.                                          |
| `401` | `auth.invalid_manager_credentials`      | Mã quản lý hoặc mã PIN không chính xác.                                   |
| `403` | `auth.forbidden`                        | Không có quyền `pos:refund`.                                              |
| `403` | `order.manager_approval_required`       | Yêu cầu phê duyệt của Quản lý để trả hàng (kích hoạt popup PIN trên POS). |
| `403` | `auth.insufficient_manager_permissions` | Tài khoản quản lý này không có quyền phê duyệt trả hàng.                  |
| `404` | `order.not_found`                       | Không tìm thấy đơn hàng.                                                  |
| `409` | `order.version_conflict`                | OCC conflict — dữ liệu đã thay đổi, FE cần tải lại đơn.                   |
| `500` | `Internal server error`                 | `{ "error": "Internal server error", "traceId": "..." }`                  |

### Ghi Chú Tích Hợp FE

1. FE gửi đúng các dòng được chọn; không gửi dòng có `qty = 0`.
2. FE hỗ trợ chọn tất cả, chọn một sản phẩm, hoặc chọn một sản phẩm với số lượng `2`, `3`, `4`, ...
3. FE reset state/machine mỗi lần mở và đóng modal trả hàng để tránh dính dữ liệu cũ.
4. FE không tự cập nhật tồn kho, payment snapshot hoặc order status sau khi gọi API.
5. FE chỉ hiển thị số tiền cần hoàn; tiền hoàn thực tế do thu ngân tự xử lý trực tiếp với khách.
6. FE dùng `receipt.lines` backend trả về để in phiếu trả hàng.
7. Nếu `reason` rỗng, FE không in dòng lý do trên phiếu trả hàng.
