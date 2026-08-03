## Note 17: Bổ sung phương thức thanh toán Công nợ và Khấu trừ tiền hoàn trả Thẻ/QR vào báo cáo kết ca (Z-Report) & Dashboard Overview

> **[Yêu cầu mới]**: Đối với các API lấy báo cáo Z-Report (`GET /v1/cash-sessions/{id}/z-report`) và tổng quan Dashboard (`GET /v1/pos/dashboard/overview`), Backend cần bổ sung phương thức **Công nợ** (`cong_no` hoặc `debt`) và đồng thời thực hiện khấu trừ (trừ bớt) số tiền hoàn trả của các phương thức thanh toán điện tử `card_bidv` và `qr_bidv` tương tự như đang làm với tiền mặt (`cash`).
>
> - **Cấp độ ca (Overall Z-Report & Dashboard Overview):**
>   - Bổ sung phương thức Công nợ (`cong_no` / `debt`) vào `paymentBreakdown` (Z-Report) và `paymentMethods` (Dashboard Overview).
>   - Đối với các đơn hoàn trả hàng (Refund) có phương thức hoàn là `card_bidv` hoặc `qr_bidv`, Backend cần khấu trừ số tiền hoàn này ra khỏi tổng số tiền tương ứng của phương thức đó trong ca làm việc.
> - **Cấp độ nhân viên (Z-Report staffs):** Trong danh sách chi tiết doanh thu theo nhân viên (`staffs`), đối với mỗi nhân viên (`ZReportStaffItem`):
>   - Bổ sung thêm trường số tiền công nợ `debtAmount` do nhân viên đó trực tiếp ghi nhận.
>   - Khấu trừ số tiền hoàn bằng thẻ/QR (`card_bidv`, `qr_bidv`) ra khỏi tổng doanh số của nhân viên tương ứng.

---

## Note 18: Định dạng dữ liệu trả về của API Đổi hàng (`POST /v1/pos/orders/{id}/exchange`)

> **[Yêu cầu mới]**: Khi thực hiện đổi hàng qua API `POST /v1/pos/orders/{id}/exchange`, Backend cần trả về cấu trúc dữ liệu chính xác bao gồm thông tin đơn gốc, thông tin đơn con refund (`return`), thông tin đơn con mới (`newOrder`) và chi tiết receipt tương ứng của đơn mới (`receipt`).
>
> **Lưu ý đặc biệt:** Tất cả tên sản phẩm (`name`, `productName`) trả về trong danh sách dòng (`lines`) của cả phần trả hàng (`return.receipt.lines`) lẫn phần đơn mới (`receipt.lines`) **bắt buộc phải là Tiếng Anh (English)**.

### Cấu trúc Response mẫu:

```json
{
  "originalOrderId": "019fc6a5-8084-7ed1-81ec-ccf4881cbb76",
  "originalOrderCode": "SO-03082026-9W018",
  "return": {
    "returnId": "019fc6a6-b7cb-7a0a-b5b2-b422f711b22d",
    "returnCode": "RT-03082026-Z7008",
    "orderId": "019fc6a5-8084-7ed1-81ec-ccf4881cbb76",
    "orderCode": "SO-03082026-9W018",
    "refundAmount": 549000,
    "status": "COMPLETED",
    "receipt": {
      "orderId": "019fc6a5-8084-7ed1-81ec-ccf4881cbb76",
      "orderCode": "SO-03082026-9W018",
      "returnId": "019fc6a6-b7cb-7a0a-b5b2-b422f711b22d",
      "returnCode": "RT-03082026-Z7008",
      "reason": "",
      "refundedAt": "2026-08-03T08:04:02.666998Z",
      "refundAmount": 549000,
      "lines": [
        {
          "productId": "cddc2a0c-1231-561b-b663-fb9329ce0320",
          "sku": "2140101000151",
          "name": "5-storey Lotus Tower",
          "orderedQty": 1,
          "returnedQty": 0,
          "remainingQty": 1,
          "unitPrice": 1800000,
          "lineRefundAmount": 0,
          "isReturned": false
        },
        {
          "productId": "81fea75c-c533-588a-a80b-222e880c656c",
          "sku": "2010107000023",
          "name": "BFT Model",
          "orderedQty": 1,
          "returnedQty": 1,
          "remainingQty": 0,
          "unitPrice": 549000,
          "lineRefundAmount": 549000,
          "isReturned": true
        }
      ]
    }
  },
  "newOrder": {
    "orderId": "019fc6a6-b80b-7eb6-bc48-5492fc4ea60a",
    "orderCode": "SO-03082026-8J019",
    "orderState": "COMPLETED",
    "subTotal": 508333,
    "discountTotal": 0,
    "taxTotal": 40667,
    "grandTotal": 549000,
    "paidTotal": 549000,
    "roundingTotal": 0,
    "change": 0,
    "payments": [
      {
        "paymentId": "019fc6a6-b82a-73f6-a5f6-b85294f61929",
        "method": "exchange",
        "amount": 549000,
        "state": "CAPTURED"
      }
    ],
    "invoiceId": "019fc6a6-b898-71b2-a11e-3c40bb6728ca",
    "invoiceNo": null,
    "voucherDiscount": null,
    "invoiceRequestToken": null,
    "invoiceRequestUrl": null
  },
  "refundValue": 549000,
  "newOrderTotal": 549000,
  "difference": 0,
  "receipt": {
    "orderId": "019fc6a6-b80b-7eb6-bc48-5492fc4ea60a",
    "orderCode": "SO-03082026-8J019",
    "state": "COMPLETED",
    "createdAt": "2026-08-03T08:04:02.700974Z",
    "completedAt": "2026-08-03T08:04:02.825868Z",
    "customerId": null,
    "cashierUserId": "e1000000-0000-0000-0000-000000000016",
    "cashSessionId": "019fc0a0-cc7a-7271-9c46-6728c0b13161",
    "warehouseId": "c0000000-0000-0000-0000-000000000002",
    "subTotal": 508333,
    "discountTotal": 0,
    "taxTotal": 40667,
    "grandTotal": 549000,
    "paidTotal": 549000,
    "roundingTotal": 0,
    "currency": "VND",
    "lines": [
      {
        "lineId": "019fc6a6-b80f-730e-a786-75c046e83abb",
        "variantId": "b5dbef5d-2235-564e-8608-77439221c0e7",
        "productName": "Ceramic Mug AD",
        "sku": "2010108000044",
        "barcode": null,
        "qty": 1,
        "returnedQty": 0,
        "remainingQty": 1,
        "unitPrice": 549000,
        "discountAmount": 0,
        "taxRate": 8,
        "lineTotal": 549000
      }
    ],
    "payments": [
      {
        "paymentId": "019fc6a6-b82a-73f6-a5f6-b85294f61929",
        "method": "exchange",
        "amount": 549000,
        "state": "CAPTURED",
        "provider": null,
        "createdAt": "2026-08-03T08:04:02.731983Z"
      }
    ],
    "invoice": {
      "id": "019fc6a6-b898-71b2-a11e-3c40bb6728ca",
      "invoiceNo": null,
      "state": "PENDING",
      "issuedAt": null
    }
  }
}
```
