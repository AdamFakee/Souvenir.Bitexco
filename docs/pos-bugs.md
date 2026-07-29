## 3. Lỗi lọc sản phẩm đồng bộ theo thời gian (Sync Products Filtering Issue by lastSyncedAt)

- **API:** `GET /v1/pos/products/sync`
- **Request Parameters từ FE (Gửi yêu cầu đồng bộ sản phẩm thay đổi):**

  ```json
  {
    "lastSyncedAt": "2026-07-24T09:03:52.165Z",
    "page": 0,
    "limit": 200,
    "warehouseId": "c0000000-0000-0000-0000-000000000002"
  }
  ```

- **Hành vi gặp lỗi (Real Behavior):**
  - Khi FE gửi tham số `lastSyncedAt` (thời điểm đồng bộ lần cuối cục bộ của thiết bị), Backend không thực hiện lọc hoặc lọc không chính xác các sản phẩm đã thay đổi.
  - Kết quả là Backend trả về danh sách trống (`items: []`) mặc dù thực tế trên server có những sản phẩm vừa được cập nhật hoặc thêm mới (có `updatedAt` hoặc `createdAt` lớn hơn `lastSyncedAt`), làm cho thiết bị thu ngân không thể cập nhật thông tin sản phẩm mới nhất khi chạy đồng bộ incremental.

- **Kỳ vọng từ Backend (Expected Behavior):**
  - Backend cần so sánh thời điểm `lastSyncedAt` gửi lên với thuộc tính thời gian cập nhật/tạo của sản phẩm trên server (`updatedAt > lastSyncedAt` hoặc `createdAt > lastSyncedAt`).
  - Chỉ trả về các sản phẩm đã được thay đổi hoặc tạo mới kể từ thời điểm `lastSyncedAt` để giảm thiểu tải băng thông và cập nhật chính xác dữ liệu dưới client.

---

---

## 6. Lỗi API Checkout trả về 500 Internal Server Error nhưng thực tế đã xử lý thành công (Checkout API 500 error on successful transaction)

- **API:** `POST /v1/pos/checkout`
- **Request Payload mẫu:**

  ```json
  {
    "cashSessionId": "019fa8d2-921c-7f43-960c-218699ac3175",
    "customerId": null,
    "currency": "VND",
    "notes": null,
    "lines": [
      {
        "variantId": "75d68103-e416-5182-9124-beabc3dd7349",
        "unitId": "00000000-0000-0000-0000-000000000010",
        "qty": 1,
        "unitPrice": 495000,
        "discountAmount": 0,
        "taxRate": 8
      }
    ],
    "payments": [
      {
        "method": "cash",
        "amount": 495000,
        "provider": null,
        "cardTerminalId": null,
        "cashTendered": 495000,
        "cashChange": 0
      }
    ],
    "voucherCode": null,
    "issueInvoice": false,
    "customerName": null,
    "customerTaxId": null,
    "customerAddress": null,
    "affiliateId": null,
    "partnerId": null,
    "clientIdempotencyKey": "checkout-1785296198642-ec0vk9cby45",
    "agentType": null
  }
  ```

- **Hành vi gặp lỗi (Real Behavior):**
  - Lần đầu gọi checkout, Backend xử lý và trả về lỗi `500 Internal server error` với body `{ "Error": "Internal server error" }`.
  - Khi Client gọi lại (retry) đúng request đó với **cùng** giá trị `clientIdempotencyKey` (`checkout-1785296198642-ec0vk9cby45`), lại phản hồi thành công `200 OK`
