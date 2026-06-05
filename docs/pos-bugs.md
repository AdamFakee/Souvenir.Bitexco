# POS Bug Reports

## Đang theo dõi

### [BUG-16] `POST /v1/pos/sync/orders` — Đơn offline sync thành công (200) nhưng `items_snapshot` và `payments_snapshot` bị rỗng trên Backend/Admin

- **Triệu chứng:**
  - Máy POS gửi payload đồng bộ offline chứa đầy đủ `items_snapshot` (danh sách sản phẩm) và `payments_snapshot` (dạng thanh toán) thành công (HTTP 200).
  - Backend lưu được đơn hàng với đúng tổng tiền và thuế, hiển thị lên Admin.
  - Tuy nhiên, phần chi tiết sản phẩm và phương thức thanh toán của đơn hàng này trên Server hoàn toàn trống (`—`).
- **Payload thực tế Client gửi:**
  ```json
  {
    "orders": [
      {
        "id": "766f6361-6c5f-3333-3136-393237303030",
        "shift_id": "e15967f6-02a8-4ea7-bf84-7546876c478b",
        "staff_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
        "status": "COMPLETED",
        "subtotal": 350000,
        "discount": 0,
        "voucher_code": null,
        "voucher_discount": 0,
        "total": 350000,
        "total_tax": 0,
        "note": null,
        "refund_reason": null,
        "original_order_id": null,
        "customer_tax_info": null,
        "items_snapshot": [
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
        "payments_snapshot": [
          {
            "method": "cash",
            "amount": 350000,
            "cashTendered": 350000,
            "cashChange": 0
          }
        ],
        "is_deleted": false,
        "created_at": 1780646400000,
        "updated_at": 1780646400000
      }
    ]
  }
  ```
- **Trạng thái:** ⏳ Chờ Backend fix
