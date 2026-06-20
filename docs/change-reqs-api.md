# API POS — Yêu Cầu Bổ Sung Thiết Bị (Backend)

Tài liệu này lưu trữ các yêu cầu thay đổi/bổ sung phía API (Backend) phục vụ cho POS.

> [!CAUTION]
> **Yêu cầu sống còn (CRITICAL REQUIREMENT) về định dạng ID đơn hàng:**
>
> - Trường `id`, `originalOrderId`, `orderId`, `returnId` trong toàn bộ API phản hồi liên quan đến đơn hàng **BẮT BUỘC PHẢI TRẢ VỀ MÃ SALES ORDER THÂN THIỆN** (Ví dụ: `SO-26062004080249`), KHÔNG ĐƯỢC phép trả về UUID hệ thống (ví dụ: `019ed9ea-b646-70dc-ad7e-54d181c6ac77`).
> - Client POS sử dụng mã SO này trực tiếp để hiển thị mã đơn hàng, quét barcode tìm kiếm và in hóa đơn trực tiếp cho khách hàng. Việc Backend trả về UUID sẽ khiến cashier không thể tra cứu hóa đơn và vỡ luồng in ấn.

# Bổ sung yêu cầu: Cung cấp và lọc theo Trạng thái đơn hàng của Backend (Đồng bộ với Admin)

Yêu cầu Backend cung cấp thông tin trạng thái chi tiết của đơn hàng, hỗ trợ truy vấn lọc nhiều trạng thái đồng thời và bổ sung thống kê tổng hợp trực tiếp trong response metadata để Client hiển thị chính xác.

## 1. Yêu cầu chi tiết phía API `GET /v1/pos/orders`

### 1.1. Các tham số Query Parameters cần bổ sung/nâng cấp

| Tham số    | Kiểu dữ liệu | Định dạng / Mô tả                                                                                                                             | Ví dụ minh họa                |
| :--------- | :----------- | :-------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------- |
| `status`   | `string`     | Lọc nhiều trạng thái cùng lúc bằng cách truyền chuỗi các trạng thái phân tách bằng dấu phẩy (comma-separated). Không sử dụng lặp lại tham số. | `?status=FULFILLED,COMPLETED` |
| `state`    | `string`     | Lọc nhiều trạng thái chi tiết của WMS phân tách bằng dấu phẩy (comma-separated). Cú pháp tương tự như `status`.                               | `?state=FULFILLED,COMPLETED`  |
| `shift_id` | `string`     | ID của ca làm việc (`cashSessionId`). Lọc toàn bộ đơn hàng phát sinh trong ca được chỉ định.                                                  | `?shift_id=cs-999-uuid`       |

### 1.2. Yêu cầu về định dạng ID đơn hàng (Order ID)

- **Bắt buộc trả về định dạng mã SO:** ID đơn hàng (`id`, `originalOrderId`) trả về từ API **bắt buộc phải sử dụng mã Sales Order** của hệ thống (ví dụ: `SO-26062004080249`), không được trả về UUID hoặc số ID tự động tăng trong DB. Mã này được dùng để hiển thị và in hóa đơn trực tiếp tại POS.
- **Hỗ trợ tìm kiếm theo ID/Mã SO, Tên và Barcode sản phẩm:** Bên cạnh tìm kiếm theo số điện thoại, tên khách hàng... Backend **bắt buộc phải hỗ trợ lọc đơn hàng theo**:
  - Mã định dạng Sales Order (ví dụ: gõ hoặc quét mã `SO-26062004080249` in trên hóa đơn).
  - Tên sản phẩm nằm trong đơn hàng đó (ví dụ: tìm `"Magnet"` hoặc `"Postcard"` sẽ lọc ra các đơn hàng có mua mặt hàng này).
  - Mã Barcode sản phẩm (ví dụ: khi quét mã vạch sản phẩm bất kỳ, lọc ra danh sách các đơn hàng đã mua sản phẩm này).
    Tất cả các từ khóa tìm kiếm này được truyền qua tham số truy vấn tìm kiếm (Query parameter `q`).
- **Lưu ý về `orderId`/`orderCode` và `returnId`/`returnCode`:** Phía Client có cơ chế fallback tự động lấy `orderCode || orderId` và `returnCode || returnId`. Do đó, Backend có thể trả về cả hai trường trùng nhau (cùng là mã SO) hoặc chỉ cần điền mã SO vào `orderId`/`returnId` để tối giản payload.

### 1.3. Yêu cầu về cấu trúc Response Metadata (`meta`)

Ngoài các trường phân trang cơ bản (`page`, `limit`, `totalPages`), trường `meta` trong Response **bắt buộc** phải tính toán tổng của toàn bộ dữ liệu khớp với bộ lọc (không chỉ giới hạn trong trang hiện tại) và trả về các trường sau:

| Tên trường     | Kiểu dữ liệu | Mô tả                                                                                                             |
| :------------- | :----------- | :---------------------------------------------------------------------------------------------------------------- |
| `total`        | `number`     | Tổng số lượng đơn hàng khớp bộ lọc (để hiển thị "Tổng cộng: X đơn" ở Footer).                                     |
| `totalItems`   | `number`     | Tổng số lượng sản phẩm (`quantity` của các line items) trong tất cả các đơn hàng khớp bộ lọc (hiển thị ở Footer). |
| `totalRevenue` | `number`     | Tổng tiền (tổng doanh thu thực tế) của toàn bộ đơn hàng khớp bộ lọc (hiển thị ở Footer).                          |

---

## 2. Ví dụ thực tế Request & Response

### 2.1. Request truy vấn các đơn hàng Hoàn tiền (bao gồm `REFUNDED` và `PARTIALLY_REFUNDED`) trong ca hiện tại:

```http
GET /v1/pos/orders?status=REFUNDED,PARTIALLY_REFUNDED&state=REFUNDED,PARTIALLY_REFUNDED&shift_id=cs-999-uuid&page=1&limit=20
```

### 2.2. Response JSON mong muốn (Xem chi tiết trường `meta`):

> [!IMPORTANT]
>
> - Trường `id` và `originalOrderId` ở cấp độ đơn hàng **bắt buộc phải trả về mã Sales Order thân thiện với người dùng** (ví dụ: `SO-26062004080249`), không được trả về UUID hệ thống hay ID tự động tăng trong Database. Mã này trực tiếp dùng để hiển thị và quét mã vạch/in hóa đơn.

> [!NOTE]
> Trong đối tượng `refund` dưới đây:
>
> - `orderId` và `orderCode` đều là mã Sales Order gốc (đơn gốc trước khi bị trả, ví dụ: `SO-2606180800A012`).
> - `returnId` và `returnCode` đều là mã Sales Order của chính phiếu trả hàng này (ví dụ: `SO-26062004080249`).
> - Client có cơ chế tự động lấy `orderCode || orderId` và `returnCode || returnId` làm mã hiển thị, nên Backend có thể truyền cùng mã SO vào cả hai trường hoặc bỏ qua `orderCode`/`returnCode` để giảm tải payload.

```json
{
  "success": true,
  "status_code": 200,
  "message": "Lấy danh sách đơn hàng thành công",
  "data": [
    {
      "id": "SO-26062004080249",
      "shiftId": "cs-999-uuid",
      "staffId": "staff-123-uuid",
      "status": "REFUNDED",
      "subtotal": 150000,
      "discount": 10000,
      "voucherCode": "GIAM10K",
      "voucherDiscount": 10000,
      "total": 140000,
      "totalTax": 14000,
      "note": "Khách hoàn trả do lỗi sản phẩm",
      "refundReason": "Lỗi nhà sản xuất",
      "originalOrderId": "SO-2606180800A012",
      "isDeleted": false,
      "canReturn": false,
      "createdAt": "2026-06-19T20:53:07.000Z",
      "updatedAt": "2026-06-19T20:55:00.000Z",
      "customerTaxInfo": {
        "companyName": "Công ty TNHH Giải pháp Phần mềm Souvenir",
        "taxCode": "0102030405",
        "email": "invoice@souvenir.vn"
      },
      "itemsSnapshot": [
        {
          "productId": "prod-1",
          "sku": "SKU-PROD1-RED",
          "barcode": "8931234567890",
          "name": "Sản phẩm A - Màu Đỏ",
          "price": 75000,
          "quantity": 2,
          "subtotal": 150000,
          "taxRate": 10,
          "taxAmount": 15000,
          "discountAmount": 10000,
          "note": "Gói quà cẩn thận"
        }
      ],
      "paymentsSnapshot": [
        {
          "method": "card",
          "amount": 140000,
          "referenceCode": "REF123456789",
          "cardType": "VISA"
        }
      ],
      "refund": {
        "orderId": "SO-2606180800A012",
        "orderCode": "SO-2606180800A012",
        "returnId": "SO-2606180809F025",
        "returnCode": "SO-2606180809F025",
        "reason": "Lỗi nhà sản xuất",
        "refundedAt": "2026-06-19T20:55:00.000Z",
        "refundAmount": 140000,
        "lines": [
          {
            "productId": "prod-1",
            "sku": "SKU-PROD1-RED",
            "name": "Sản phẩm A - Màu Đỏ",
            "orderedQty": 2,
            "returnedQty": 2,
            "remainingQty": 0,
            "unitPrice": 75000,
            "lineRefundAmount": 150000,
            "isReturned": true
          }
        ]
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "hasNextPage": true,
    "total": 95,
    "totalItems": 180,
    "totalRevenue": 14250000,
    "timestamp": 1781852185
  },
  "error": null
}
```

---

## 3. Danh sách trạng thái đồng bộ với Admin và các trạng thái Client POS gửi lên khi lọc

Dưới đây là bảng đặc tả chi tiết danh sách trạng thái đơn hàng (dưới dạng chuỗi phân tách bằng dấu phẩy) mà Client POS sẽ gửi lên Backend thông qua 2 query parameters `status` và `state` tương ứng với mỗi tab bộ lọc trên giao diện POS:

| Tên Tab bộ lọc trên POS | Chuỗi trạng thái gửi lên (`status` & `state`)                | Mô tả nghiệp vụ                                                                                                     |
| :---------------------- | :----------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| **Hoàn thành**          | `FULFILLED,COMPLETED`                                        | Đơn hàng bán ra đã giao hàng thành công hoặc đã hoàn tất chu kỳ.                                                    |
| **Hoàn hàng**           | `RETURNED,REFUNDED,PARTIALLY_RETURNED,PARTIALLY_REFUNDED`    | Đơn hàng phát sinh giao dịch trả lại hàng hóa / hoàn trả một phần hoặc toàn bộ tiền mặt cho khách.                  |
| **Đang xử lý**          | `PENDING,CONFIRMED,PAYMENT_PENDING,PAID,FULFILLING,INVOICED` | Đơn hàng đang trong trạng thái chờ xử lý thanh toán, đang chuẩn bị hàng, đã thanh toán tạm tính hoặc đang xuất kho. |
| **Đã hủy**              | `CANCELLED,FAILED`                                           | Đơn hàng bị hủy bỏ hoặc giao dịch thanh toán thất bại.                                                              |

> [!IMPORTANT]
> **Yêu cầu đối với Backend:**
>
> - API `GET /v1/pos/orders` lọc theo tham số `status` và `state` bắt buộc phải hỗ trợ tiếp nhận giá trị dạng chuỗi phân tách bằng dấu phẩy (comma-separated, ví dụ: `?status=FULFILLED,COMPLETED&state=FULFILLED,COMPLETED`) để thực hiện lọc các đơn hàng khớp với bất kỳ trạng thái nào trong danh sách (OR logic).

# Bổ sung yêu cầu: Cung cấp thông tin hoàn tiền / trả hàng (Refund/Return)

Để hiển thị lịch sử và chi tiết các đợt trả hàng của đơn hàng tại giao diện POS, yêu cầu Backend bổ sung các trường thông tin hoàn tiền vào Response của API Danh sách đơn hàng `GET /v1/pos/orders` (và API Chi tiết đơn hàng tương ứng).

## 1. Cấu trúc thông tin trả hàng bổ sung

### 1.1 Thêm vào thông tin đơn hàng (`OrderListApiItem`)

| Tên trường (camelCase) | Kiểu dữ liệu          | Bắt buộc / Optional / Nullable     | Mô tả                                                                                                                                              |
| :--------------------- | :-------------------- | :--------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| `totalRefunded`        | `number`              | **Optional**                       | Tổng số tiền đã hoàn trả cho đơn hàng tính đến hiện tại. Nếu không có, mặc định coi là `0`.                                                        |
| `refunds`              | `RefundHistoryItem[]` | **Optional**                       | Danh sách các đợt trả hàng/hoàn tiền liên quan đến đơn hàng này. Nếu không có, mặc định coi là mảng rỗng `[]`.                                     |
| `staffName`            | `string`              | **Bắt buộc / Nullable**            | Tên hiển thị của nhân viên thực hiện bán đơn hàng này (tương ứng với `staffId`).                                                                   |
| `refund`               | `RefundReceiptData`   | **BẮT BUỘC (nếu là đơn trả hàng)** | Chi tiết thông tin hoàn tiền dùng để POS kết xuất và in phiếu trả hàng trực tiếp (khi đơn hàng ở trạng thái `REFUNDED` hoặc `PARTIALLY_REFUNDED`). |

---

## 2. Chi tiết cấu trúc dữ liệu con (Nested Models)

### 2.1 Cấu trúc `RefundHistoryItem` (Chi tiết lịch sử các đợt trả hàng của đơn gốc)

| Tên trường (camelCase) | Kiểu dữ liệu | Bắt buộc / Optional / Nullable | Mô tả                                             |
| :--------------------- | :----------- | :----------------------------- | :------------------------------------------------ |
| `refundAmount`         | `number`     | **Bắt buộc**                   | Số tiền thực tế hoàn trả cho khách trong đợt này. |
| `reason`               | `string`     | **Bắt buộc / Nullable**        | Lý do trả hàng.                                   |
| `refundedAt`           | `string`     | **Bắt buộc**                   | Thời gian thực hiện trả hàng (ISO 8601).          |

---

### 2.2 Cấu trúc `RefundReceiptData` (Chi tiết thông tin in phiếu hoàn tiền trực tiếp của đơn trả hàng)

Trường `refund` trong thông tin đơn hàng (khi status = `REFUNDED` hoặc `PARTIALLY_REFUNDED`) chứa dữ liệu để in hóa đơn trả hàng tại POS:

| Tên trường (camelCase) | Kiểu dữ liệu          | Bắt buộc / Optional / Nullable | Mô tả                                                                                      |
| :--------------------- | :-------------------- | :----------------------------- | :----------------------------------------------------------------------------------------- |
| `orderId`              | `string`              | **Bắt buộc**                   | ID / Mã của **đơn hàng gốc ban đầu** (ví dụ: `SO-2606180800A012`).                         |
| `orderCode`            | `string`              | **Optional**                   | Mã hiển thị của **đơn hàng gốc ban đầu** (thường trùng khớp với `orderId`).                |
| `returnId`             | `string`              | **Optional**                   | ID / Mã của **phiếu trả hàng / đơn hoàn tiền này** (ví dụ: `SO-2606180809F025`).           |
| `returnCode`           | `string`              | **Optional**                   | Mã hiển thị của **phiếu trả hàng / đơn hoàn tiền này** (thường trùng khớp với `returnId`). |
| `reason`               | `string`              | **Bắt buộc**                   | Lý do trả hàng (ví dụ: "Lỗi nhà sản xuất").                                                |
| `refundedAt`           | `string`              | **Optional**                   | Thời gian thực hiện hoàn tiền (ISO 8601).                                                  |
| `refundAmount`         | `number`              | **Bắt buộc**                   | Tổng số tiền thực tế được hoàn lại cho khách hàng ở đợt/phiếu trả hàng này.                |
| `lines`                | `RefundReceiptLine[]` | **Bắt buộc**                   | Danh sách chi tiết các mặt hàng nằm trong phiếu trả hàng này.                              |

#### Cấu trúc `RefundReceiptLine` (Chi tiết dòng sản phẩm hoàn trả)

| Tên trường (camelCase) | Kiểu dữ liệu | Bắt buộc / Optional / Nullable | Mô tả                                                                                             |
| :--------------------- | :----------- | :----------------------------- | :------------------------------------------------------------------------------------------------ |
| `productId`            | `string`     | **Bắt buộc**                   | ID của sản phẩm được trả lại.                                                                     |
| `sku`                  | `string`     | **Optional**                   | SKU của sản phẩm.                                                                                 |
| `name`                 | `string`     | **Bắt buộc**                   | Tên sản phẩm được hiển thị trên phiếu in.                                                         |
| `orderedQty`           | `number`     | **Bắt buộc**                   | Số lượng sản phẩm đã mua ban đầu ở đơn gốc.                                                       |
| `returnedQty`          | `number`     | **Bắt buộc**                   | Số lượng sản phẩm thực tế trả lại trong phiếu này.                                                |
| `remainingQty`         | `number`     | **Bắt buộc**                   | Số lượng sản phẩm còn lại mà khách hàng giữ lại (sau khi đã trừ số lượng trả).                    |
| `unitPrice`            | `number`     | **Bắt buộc**                   | Đơn giá của sản phẩm tại thời điểm mua.                                                           |
| `lineRefundAmount`     | `number`     | **Bắt buộc**                   | Tổng tiền hoàn lại cho sản phẩm này (bằng `unitPrice` nhân với số lượng trả `returnedQty`).       |
| `isReturned`           | `boolean`    | **Bắt buộc**                   | Trạng thái xác định sản phẩm này có nằm trong diện trả hàng ở phiếu này không (`true` / `false`). |

---

## 3. Ví dụ mẫu JSON Response bổ sung thông tin trả hàng

Ví dụ minh họa cho đơn hàng có trạng thái **Hoàn tiền một phần** (`PARTIALLY_REFUNDED`):

```json
{
  "id": "ord-uuid-123456",
  "shiftId": "shift-uuid-999",
  "staffId": "staff-uuid-888",
  "staffName": "Nguyễn Văn Bán Hàng",
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

# Bổ sung yêu cầu: Tự động làm tròn khi thanh toán bằng Tiền mặt (Cash Rounding)

Để đảm bảo đồng bộ số tiền lẻ khi khách hàng thanh toán bằng tiền mặt, yêu cầu Backend tự động xử lý làm tròn ở API checkout:

## 1. Yêu cầu chi tiết

- **Tự động làm tròn:** Khi gọi API `POST /v1/pos/checkout` với danh sách payments chứa phương thức thanh toán là tiền mặt (`cash`), Backend cần tự động làm tròn tổng số tiền của đơn hàng (`grandTotal`) về hàng nghìn gần nhất (chia hết cho 1.000đ).
  - Ví dụ: Tổng tiền tính toán từ sản phẩm + thuế là `155,123đ` -> Làm tròn thành `155,000đ`.
  - Ví dụ: Tổng tiền tính toán từ sản phẩm + thuế là `155,789đ` -> Làm tròn thành `156,000đ`.
- **Công thức làm tròn:** Sử dụng thuật toán làm tròn toán học về đơn vị nghìn gần nhất:
  $$\text{roundedAmount} = \text{round}\left(\frac{\text{unroundedAmount}}{1000}\right) \times 1000$$
  _(Ví dụ trong Javascript/TypeScript: `Math.round(amount / 1000) _ 1000`)\*
- **Trạng thái đơn hàng:** Đơn hàng sau khi làm tròn và nhận đủ số tiền đã làm tròn từ Client phải được chuyển sang trạng thái đã thanh toán đầy đủ (`COMPLETED`), không báo lỗi thiếu tiền hay giữ trạng thái nợ/chưa hoàn tất do chênh lệch tiền lẻ.

---

# Bổ sung yêu cầu: Fix lỗi không nhất quán & lỗi nghiệp vụ khi Trả/Đổi Hàng (Refund/Exchange)

## 1. Đồng bộ các điều kiện validate Đổi/Trả hàng

Backend cần cài đặt các quy tắc kiểm tra logic đồng bộ với Client để từ chối các yêu cầu không hợp lệ ngay từ tầng API:

### 1.1 Trạng thái đơn hàng gốc hợp lệ

- Chỉ cho phép Đổi/Trả đối với các đơn hàng có trạng thái **`PAID`, `FULFILLED` hoặc `COMPLETED`**.
- Trả về mã lỗi ví dụ `order.invalid_return_status` nếu trạng thái đơn hàng gốc là `PENDING`, `FAILED`, `CANCELLED`...

### 1.2 Giới hạn thời gian đổi hàng

- Phía Client cấu hình giới hạn đổi hàng trong vòng **24 giờ** kể từ thời điểm tạo đơn hàng (`createdAt`).
- Backend cần kiểm tra điều kiện này và từ chối xử lý đổi hàng nếu quá hạn, trả về mã lỗi cụ thể: `order.exchange_expired` (Ví dụ: _"Đơn hàng đã quá hạn 1 ngày (24 giờ), không được phép đổi hàng"_).

### 1.3 Đơn hàng áp dụng khuyến mãi / voucher

- Client không hỗ trợ đổi hàng đối với các đơn hàng có sử dụng voucher (`voucherCode` khác rỗng), giảm giá voucher (`voucherDiscount > 0`) hoặc giảm giá trực tiếp đơn hàng (`discount > 0`).
- Backend cần kiểm tra điều kiện này và từ chối nếu vi phạm, trả về mã lỗi cụ thể: `order.exchange_discounted` (Ví dụ: _"Đơn hàng có khuyến mãi hoặc voucher không được đổi hàng"_).

### 1.4 Chưa test phần nhập tài khoản admin có quyển trả để gửi reqs khi trả hàng lại
