## 10. Lỗi API Bulk Sync Đơn Hàng Offline (`POST /v1/pos/sync/orders`) trả về `order.lines_required` khi gửi đúng payload spec `items_snapshot`

- **Hành vi gặp lỗi (Real Behavior):**
  - Khi client POS gọi API `POST /v1/pos/sync/orders` để đồng bộ các đơn hàng offline lên Server theo đúng định dạng Request Body:
    ```json
    {
      "orders": [
        {
          "order_code": "SO-12082026-VC001", // mã code thân thiện với người dùng
          "shift_id": "019feae5-af67-79a9-8b34-2618e690dce3",
          "staff_id": "e1000000-0000-0000-0000-000000000016",
          "status": "COMPLETED",
          "subtotal": 380000,
          "discount": 0,
          "voucher_code": null,
          "voucher_discount": 0,
          "total_tax": 28148,
          "total": 380000,
          "note": null,
          "refund_reason": null,
          "original_order_id": null,
          "customer_tax_info": null,
          "partner_id": null,
          "affiliate_id": null,
          "is_deleted": false,
          "created_at": 1786524143881,
          "updated_at": 1786524143881,
          "items_snapshot": [
            {
              "productId": "82878e1e-9733-59d5-9bfa-1bb6d5a9a5c5",
              "sku": "2130101000024",
              "barcode": "2130101000024",
              "name": "Laughing Buddha 12cm",
              "price": 380000,
              "quantity": 1,
              "subtotal": 380000,
              "taxRate": 8,
              "taxAmount": 28148,
              "discountAmount": 0,
              "note": null
            }
          ],
          "payments_snapshot": [
            {
              "method": "cash",
              "amount": 380000,
              "cashTendered": 380000,
              "cashChange": 0,
              "referenceCode": null
            }
          ]
        }
      ]
    }
    ```
  - Backend trả về kết quả HTTP Status 200 nhưng mảng `failed` có lỗi `order.lines_required`:
    ```json
    {
      "synced": 0,
      "failed": [
        {
          "id": "534f2d31-3230-3832-3032-362d56433030",
          "error": "order.lines_required"
        }
      ]
    }
    ```
  - **Nguyên nhân:** Logic kiểm tra/validation phía Backend đang bắt buộc phải có thuộc tính `lines` thay vì đọc và xử lý danh sách sản phẩm từ mảng `items_snapshot` theo mô tả API Spec trong `Note 21`.

- **Kỳ vọng từ Backend (Expected Behavior):**
  - Backend tiếp nhận và đọc trực tiếp danh sách sản phẩm từ mảng `items_snapshot` (và thông tin thanh toán từ `payments_snapshot`) từ payload gửi lên để lưu thông tin chi tiết đơn hàng offline.
  - Phản hồi đúng khi đồng bộ thành công:
    ```json
    {
      "synced": 1,
      "failed": []
    }
    ```
