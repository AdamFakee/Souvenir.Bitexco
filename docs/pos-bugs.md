### [BUG] Lỗi Đồng bộ Trạng thái Đơn hàng (vẫn hiển thị "Chờ thanh toán") và Không ghi nhận VAT/Voucher khi thanh toán qua BIDV EDC thẻ di động

- **Chuỗi API FE gọi tuần tự thành công:**
  1. `POST /v1/pos/checkout` -> Tạo đơn hàng, trả về Payment `INITIATED` (Version 1).
  2. `POST /v1/payments/{paymentId}/transitions` (action: `"process"`, expectedVersion: 1) -> Payment chuyển sang `PROCESSING` (Version 2).
  3. `POST /v1/payments/{paymentId}/card-capture` -> Ghi nhận thông tin giao dịch từ máy EDC thành công.
  4. `POST /v1/payments/{paymentId}/transitions` (action: `"authorize"`, expectedVersion: 2) -> Payment chuyển sang `AUTHORIZED` (Version 3).
  5. `POST /v1/payments/{paymentId}/transitions` (action: `"capture"`, expectedVersion: 3) -> Payment chuyển sang `CAPTURED` (Version 4).

- **Các vấn đề lỗi phát hiện:**
  1. **Trạng thái đơn hàng không đổi:** Dù Payment đã đi đến trạng thái cuối cùng là `CAPTURED` (đã trừ tiền thành công), nhưng trạng thái đơn hàng trên hệ thống Admin quản trị vẫn ở trạng thái **"Chờ thanh toán"** (chưa chuyển sang đã hoàn thành).
  2. **Hóa đơn chưa ghi nhận VAT:** Đơn hàng / hóa đơn trả về không hiển thị thông tin thuế suất (VAT).
  3. **Voucher không được áp dụng:** Không giảm trừ hoặc không ghi nhận voucher giảm giá vào đơn hàng.

- **Dữ liệu Log Test Thực Tế:**
  - **Request Payload checkout (`POST /v1/pos/checkout`):**

    ```json
    {
      "cashSessionId": "019f4629-9a2c-73d6-b8b0-ac1f6b40f1d5",
      "customerId": null,
      "currency": "VND",
      "notes": null,
      "lines": [
        {
          "variantId": "019ef30c-fc08-7d47-926f-81f3653c4deb",
          "unitId": "00000000-0000-0000-0000-000000000010",
          "qty": 1,
          "unitPrice": 100000,
          "discountAmount": 0,
          "taxRate": 0
        }
      ],
      "payments": [
        {
          "method": "card_bidv",
          "amount": 108000,
          "provider": "card-bidv",
          "cardTerminalId": null
        }
      ],
      "voucherCode": null,
      "issueInvoice": false,
      "customerName": null,
      "customerTaxId": null,
      "customerAddress": null,
      "affiliateId": null,
      "agentType": null
    }
    ```

  - **Response checkout:**

    ```json
    {
      "orderId": "019f6518-bd5e-70ba-b38e-5adf7412431c",
      "orderCode": "SO-2607150925F17F",
      "orderState": "CONFIRMED",
      "subTotal": 100000,
      "discountTotal": 0,
      "taxTotal": 0,
      "grandTotal": 100000,
      "paidTotal": 0,
      "roundingTotal": 0,
      "change": 0,
      "payments": [
        {
          "paymentId": "019f6518-be1c-7e45-8602-489d1d04923b",
          "method": "card_bidv",
          "amount": 108000,
          "state": "INITIATED"
        }
      ],
      "invoiceId": null,
      "invoiceNo": null,
      "voucherDiscount": null,
      "invoiceRequestToken": null,
      "invoiceRequestUrl": null
    }
    ```

  - **API transition `"process"` (expectedVersion: 1) Response:**

    ```json
    {
      "id": "019f6518-be1c-7e45-8602-489d1d04923b",
      "tenantId": "a0000000-0000-0000-0000-000000000001",
      "code": "PAY-2607150925724E",
      "orderId": "019f6518-bd5e-70ba-b38e-5adf7412431c",
      "method": "card_bidv",
      "amount": 108000,
      "currency": "VND",
      "state": "PROCESSING",
      "provider": "card-bidv",
      "providerRef": null,
      "cashSessionId": "019f4629-9a2c-73d6-b8b0-ac1f6b40f1d5",
      "cardTerminalId": null,
      "initiatedBy": "e1000000-0000-0000-0000-000000000005",
      "capturedAt": null,
      "refundedAmount": 0,
      "failedReason": null,
      "version": 2,
      "createdAt": "2026-07-15T09:25:48.18925Z",
      "updatedAt": "2026-07-15T09:25:48.18925Z"
    }
    ```

  - **API `card-capture` Response:**

    ```json
    {
      "id": "019f6519-1d03-7d4a-9b6a-890a3a3891f7",
      "tenantId": "a0000000-0000-0000-0000-000000000001",
      "paymentId": "019f6518-be1c-7e45-8602-489d1d04923b",
      "terminalId": "01684838",
      "merchantId": "000000925126645",
      "maskedPan": "5151 XXXX XXXX 4768",
      "authCode": "314171",
      "rrn": "619601164021",
      "responseCode": "00",
      "capturedAt": "2026-07-15T09:26:12.4834746Z",
      "createdAt": "2026-07-15T09:26:12.4834751Z"
    }
    ```

  - **API transition `"authorize"` (expectedVersion: 2) Response:**

    ```json
    {
      "id": "019f6518-be1c-7e45-8602-489d1d04923b",
      "tenantId": "a0000000-0000-0000-0000-000000000001",
      "code": "PAY-2607150925724E",
      "orderId": "019f6518-bd5e-70ba-b38e-5adf7412431c",
      "method": "card_bidv",
      "amount": 108000,
      "currency": "VND",
      "state": "AUTHORIZED",
      "provider": "card-bidv",
      "providerRef": null,
      "cashSessionId": "019f4629-9a2c-73d6-b8b0-ac1f6b40f1d5",
      "cardTerminalId": null,
      "initiatedBy": "e1000000-0000-0000-0000-000000000005",
      "capturedAt": null,
      "refundedAmount": 0,
      "failedReason": null,
      "version": 3,
      "createdAt": "2026-07-15T09:25:48.18925Z",
      "updatedAt": "2026-07-15T09:25:48.605505Z"
    }
    ```

  - **API transition `"capture"` (expectedVersion: 3) Response:**
    ```json
    {
      "id": "019f6518-be1c-7e45-8602-489d1d04923b",
      "tenantId": "a0000000-0000-0000-0000-000000000001",
      "code": "PAY-2607150925724E",
      "orderId": "019f6518-bd5e-70ba-b38e-5adf7412431c",
      "method": "card_bidv",
      "amount": 108000,
      "currency": "VND",
      "state": "CAPTURED",
      "provider": "card-bidv",
      "providerRef": null,
      "cashSessionId": "019f4629-9a2c-73d6-b8b0-ac1f6b40f1d5",
      "cardTerminalId": null,
      "initiatedBy": "e1000000-0000-0000-0000-000000000005",
      "capturedAt": null,
      "refundedAmount": 0,
      "failedReason": null,
      "version": 4,
      "createdAt": "2026-07-15T09:25:48.18925Z",
      "updatedAt": "2026-07-15T09:26:12.763838Z"
    }
    ```
