# POS Bug Reports

## Đang theo dõi

### [BUG-15] `GET /v1/dashboard/overview` — Lệch dữ liệu giữa `totalRevenue` và chi tiết `paymentMethods`

- **Triệu chứng:**
  - Dữ liệu trả về từ API `/v1/dashboard/overview` của ca làm việc hiện tại bị không khớp (lệch số liệu doanh thu).
  - Tổng doanh thu `totalRevenue` trả về nhỏ hơn rất nhiều so với tổng số tiền thu được từ các phương thức thanh toán cộng lại.
- **Dữ liệu log thực tế (mẫu):**
  ```json
  {
    "employeeName": "Dev Cashier",
    "employeeCode": "NV001",
    "shiftTime": "14:00-22:00",
    "shiftStart": "21:25",
    "totalRevenue": 5420520, // <-- Doanh thu tổng ghi nhận: 5.420.520
    "completedOrders": 7,
    "totalProductsSold": 11,
    "cancelledOrders": 0,
    "paymentMethods": [
      {
        "name": "cash",
        "value": 11797888 // <-- Tiền mặt: 11.797.888
      },
      {
        "name": "card_bidv",
        "value": 756000 // <-- Thẻ BIDV: 756.000
      }
    ]
  }
  ```
  _Tổng các phương thức thanh toán: 11.797.888 + 756.000 = 12.553.888 VNĐ (lệch so với 5.420.520 VNĐ)._
- **Trạng thái:** ⏳ Chờ Backend đồng bộ lại công thức tính doanh thu ca (Aggregate Logic).

---

### [BUG-16] `POST /v1/pos/sync/orders` — Đơn offline sync thành công (200) nhưng `itemsSnapshot` và `paymentsSnapshot` bị rỗng trên Backend/Admin

- **Triệu chứng:**
  - Máy POS gửi payload đồng bộ offline chứa đầy đủ `itemsSnapshot` (danh sách sản phẩm) và `paymentsSnapshot` (dạng thanh toán) thành công (HTTP 200).
  - Backend lưu được đơn hàng với đúng tổng tiền và thuế, hiển thị lên Admin.
  - Tuy nhiên, phần chi tiết sản phẩm và phương thức thanh toán của đơn hàng này trên Server hoàn toàn trống (`—`).
- **Payload thực tế Client gửi:**
  ```json
  [
    {
      "id": "766f6361-6c5f-3333-3136-393237303030",
      "shiftId": "e15967f6-02a8-4ea7-bf84-7546876c478b",
      "staffId": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "status": "COMPLETED",
      "subtotal": 350000,
      "discount": 0,
      "voucherCode": null,
      "voucherDiscount": 0,
      "total": 350000,
      "totalTax": 0,
      "note": null,
      "refundReason": null,
      "originalOrderId": null,
      "customerTaxInfo": null,
      "itemsSnapshot": [
        {
          "productId": "422501a3-28f0-466d-aba3-d4de768bc203",
          "sku": "SP-001",
          "name": "Sản phẩm A",
          "price": 350000,
          "quantity": 1,
          "subtotal": 350000,
          "taxRate": 0,
          "taxAmount": 0,
          "discountAmount": 0
        }
      ],
      "paymentsSnapshot": [
        {
          "method": "cash",
          "amount": 350000,
          "cashTendered": 350000,
          "cashChange": 0
        }
      ],
      "isDeleted": false,
      "createdAt": "2026-06-05T02:40:00.000Z",
      "updatedAt": "2026-06-05T02:40:00.000Z"
    }
  ]
  ```
- **Trạng thái:** ⏳ Chờ Backend fix
