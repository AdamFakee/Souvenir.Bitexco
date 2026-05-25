# BÁO CÁO LỖI DỮ LIỆU NGHIỆP VỤ POS (BACKEND DATA BUG REPORT)

Tài liệu này ghi nhận chi tiết lỗi dữ liệu từ hệ thống Backend khi thực hiện Tìm kiếm sản phẩm (`/v1/pos/search`) và Thanh toán (`/v1/pos/checkout`) trên môi trường cửa hàng **'SkyStore'**.

---

## 1. TỔNG QUAN LỖI (SUMMARY)

- **API gặp lỗi:** `POST /v1/pos/checkout`
- **Mã lỗi HTTP:** `400 Bad Request`
- **Thông báo lỗi từ Server:**
  ```json
  {
    "error": "Sản phẩm không nằm trong danh sách bán của cửa hàng 'SkyStore'."
  }
  ```
- **Nguyên nhân gốc rễ (Root Cause):**
  Toàn bộ sản phẩm được trả về từ API tìm kiếm (`/v1/pos/search`) đều đang **thiếu thông tin giá bán lẻ (`"price": null`)**. Do sản phẩm không có đơn giá hợp lệ, hệ thống Backend tự động chặn thanh toán và báo lỗi không thuộc danh sách bán để tránh thất thoát doanh thu (xuất hóa đơn giá trị 0đ).

  _(Lưu ý: Trường `unitId: "00000000-0000-0000-0000-000000000010"` đi kèm `unitCode: "PCS"` được trả về đầy đủ và chính xác từ server, không phải lỗi)._

---

## 2. CHỨNG CỨ KỸ THUẬT (TECHNICAL EVIDENCE)

### A. Dữ liệu gốc trả về từ API Tìm Kiếm (`GET /v1/pos/search`)

Khi tìm kiếm sản phẩm trên app, API trả về danh sách sản phẩm với trường `price` bị **null** (trong khi các trường định danh khác như `variantId`, `unitId` đều đầy đủ):

```json
[
  {
    "variantId": "019e434b-10cf-70a1-89e2-a5c6c28c8417",
    "productId": "019e434b-10b4-7452-983f-259651c863c1",
    "sku": "0002893323",
    "productName": "PRODUCT TEST 1",
    "variantName": "PRODUCT TEST 1",
    "unitId": "00000000-0000-0000-0000-000000000010", // <--- Hợp lệ (PCS)
    "unitCode": "PCS",
    "price": null, // <--- Lỗi: Không có giá bán lẻ
    "onHand": 0,
    "available": 0
  },
  {
    "variantId": "019e4eb6-43e8-7d8f-a34c-7fde4dcf94bc",
    "productId": "019e4eb6-43db-7571-bb05-0ff6f0a760a3",
    "sku": "0002893329",
    "productName": "test 4",
    "variantName": "test 4",
    "unitId": "00000000-0000-0000-0000-000000000010", // <--- Hợp lệ (PCS)
    "unitCode": "PCS",
    "price": null, // <--- Lỗi: Không có giá bán lẻ
    "onHand": 0,
    "available": 0
  }
]
```

### B. Payload gửi lên khi Thanh toán (`POST /v1/pos/checkout`)

App React Native thu thập chính xác thông tin từ API search gửi lên để thanh toán:

```json
{
  "cashSessionId": "019e4eaf-2063-7e97-afab-023a8f3d01e1", // Ca làm việc hợp lệ của SkyStore
  "customerId": null,
  "currency": "VND",
  "notes": null,
  "lines": [
    {
      "variantId": "019e4eb6-43e8-7d8f-a34c-7fde4dcf94bc", // test 4
      "unitId": "00000000-0000-0000-0000-000000000010",
      "qty": 1,
      "unitPrice": 0, // Fallback về 0 vì giá trên server bị null
      "discountAmount": 0,
      "taxRate": 0
    },
    {
      "variantId": "019e434b-10cf-70a1-89e2-a5c6c28c8417", // PRODUCT TEST 1
      "unitId": "00000000-0000-0000-0000-000000000010",
      "qty": 1,
      "unitPrice": 0, // Fallback về 0 vì giá trên server bị null
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

### C. Phản hồi lỗi từ Server (HTTP 400 Response)

```json
{
  "error": "Sản phẩm không nằm trong danh sách bán của cửa hàng 'SkyStore'."
}
```

---
