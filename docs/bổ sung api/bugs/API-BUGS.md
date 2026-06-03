# API BUGS

---

## BUG-001 · `POST /v1/pos/checkout` — 400 khi `price` từ search trả về null

> **Mô tả:** Gọi `/v1/pos/search` trả về sản phẩm với `price: null`. Dùng đúng dữ liệu đó để checkout thì server trả 400. Client không thể hoàn tất đơn hàng dù không tự ý thay đổi gì.

**Ngày:** ~28/05/2026

### Request gửi đi

```http
POST /v1/pos/checkout
Content-Type: application/json
Authorization: Bearer <device_access_token>
```

```json
{
  "cashSessionId": "019e4eaf-2063-7e97-afab-023a8f3d01e1",
  "customerId": null,
  "currency": "VND",
  "notes": null,
  "lines": [
    {
      "variantId": "019e4eb6-43e8-7d8f-a34c-7fde4dcf94bc",
      "unitId": "00000000-0000-0000-0000-000000000010",
      "qty": 1,
      "unitPrice": 0,
      "discountAmount": 0,
      "taxRate": 0
    },
    {
      "variantId": "019e434b-10cf-70a1-89e2-a5c6c28c8417",
      "unitId": "00000000-0000-0000-0000-000000000010",
      "qty": 1,
      "unitPrice": 0,
      "discountAmount": 0,
      "taxRate": 0
    }
  ],
  "payments": [
    {
      "method": "cash",
      "amount": 0,
      "provider": null,
      "cardTerminalId": null
    }
  ],
  "voucherCode": null,
  "issueInvoice": false
}
```

> `unitPrice: 0` là do `GET /v1/pos/search` trả `"price": null` cho toàn bộ sản phẩm.

### Response nhận về

**HTTP 400 Bad Request**

```json
{
  "error": "Sản phẩm không nằm trong danh sách bán của cửa hàng 'SkyStore'."
}
```

### Dữ liệu gốc từ `GET /v1/pos/search` (trigger lỗi)

```json
[
  {
    "variantId": "019e434b-10cf-70a1-89e2-a5c6c28c8417",
    "sku": "0002893323",
    "productName": "PRODUCT TEST 1",
    "unitId": "00000000-0000-0000-0000-000000000010",
    "unitCode": "PCS",
    "price": null,
    "onHand": 0,
    "available": 0
  },
  {
    "variantId": "019e4eb6-43e8-7d8f-a34c-7fde4dcf94bc",
    "sku": "0002893329",
    "productName": "test 4",
    "unitId": "00000000-0000-0000-0000-000000000010",
    "unitCode": "PCS",
    "price": null,
    "onHand": 0,
    "available": 0
  }
]
```

---

## BUG-002 · `POST /v1/payments/{id}/transitions` — Order không chuyển trạng thái sau khi Payment CAPTURED

> **Mô tả:** Toàn bộ flow thanh toán thẻ đều trả HTTP 200 (card-capture → authorize → capture). Máy EDC xác nhận giao dịch thành công. Nhưng sau đó query Order vẫn thấy trạng thái cũ (`CONFIRMED`/`PENDING`), không có bước nào từ phía client thất bại.

**Ngày:** 28/05/2026

### Luồng API gọi thành công (client side)

```text
POST /v1/payments/019e6cde-48eb-7018-add5-2e7cdfbd9be3/card-capture
→ HTTP 200 OK

POST /v1/payments/019e6cde-48eb-7018-add5-2e7cdfbd9be3/transitions
Body: { "action": "authorize", "expectedVersion": 2 }
→ HTTP 200 OK  (Payment: AUTHORIZED, version 3)

POST /v1/payments/019e6cde-48eb-7018-add5-2e7cdfbd9be3/transitions
Body: { "action": "capture", "expectedVersion": 3 }
→ HTTP 200 OK  (Payment: CAPTURED, version 4)
```

### Kết quả EDC trả về (giao dịch thẻ)

```json
{
  "merTransId": "019e6cde-48eb-7018-add5-2e7cdfbd9be3",
  "status": "DONE",
  "statusCode": "0",
  "transInfo": {
    "amount": "350000",
    "approvalCode": "313963",
    "cardNo": "5151 XXXX XXXX 4768",
    "cardType": "MASTERCARD BIDV",
    "returnCode": "00",
    "transStatus": "APPROVE",
    "transType": "sale"
  }
}
```

### Triệu chứng

Payment → `CAPTURED` (HTTP 200), nhưng Order liên kết vẫn ở `CONFIRMED` / `PENDING`, không tự chuyển sang `FULFILLED` / `COMPLETED`.

Không có API nào thất bại phía client. Server không phát sinh side-effect cập nhật Order sau khi Payment CAPTURED.

---

## BUG-003 · `POST /v1/pos/vouchers/verify` — Voucher tạo trên Admin bị reject ở POS

> **Mô tả:** Mã voucher đã tồn tại và cấu hình trên Admin. POS gửi đúng mã (đã trim + uppercase) nhưng server trả lỗi `pos.voucher_invalid`. Không có thao tác sai nào từ phía client.

**Ngày:** 03/06/2026

### Request gửi đi

```http
POST /v1/pos/vouchers/verify
Content-Type: application/json
Authorization: Bearer <device_access_token>
```

```json
{
  "code": "KM20"
}
```

> Code đã được client normalize: `trim()` + `toUpperCase()` trước khi gửi.

### Response nhận về (lỗi thực tế)

**HTTP 4xx**

```json
{
  "error": "pos.voucher_invalid",
  "message": "Mã giảm giá không hợp lệ hoặc đã hết hạn."
}
```

### Response mong đợi khi voucher hợp lệ

**HTTP 200 OK**

```json
{
  "code": "KM20",
  "percent": 20,
  "maxDiscountAmount": 50000,
  "applicableVariantIds": []
}
```

| Field                  | Type           | Mô tả                                             |
| ---------------------- | -------------- | ------------------------------------------------- |
| `code`                 | string         | Mã canonical (uppercase)                          |
| `percent`              | number         | Phần trăm giảm                                    |
| `maxDiscountAmount`    | number \| null | Giới hạn số tiền giảm; `null` = không giới hạn    |
| `applicableVariantIds` | string[]       | Danh sách variant áp dụng; `[]` = áp dụng toàn bộ |
