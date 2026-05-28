# ĐỀ XUẤT CẢI TIẾN API BULK SYNC CHO OFFLINE ORDERS

**Ngày đề xuất:** 28/05/2026  
**Mục tiêu:** Cung cấp cơ chế lưu trữ hàng loạt các đơn hàng tạo ra khi Offline mà không đi qua các luồng validation phức tạp (do tiền đã thu dưới local).

---

## 1. LÝ DO ĐỀ XUẤT (BACKGROUND)

- Khi máy POS mất mạng, các đơn hàng tiền mặt vẫn được tạo cục bộ (local) và lưu vào SQLite.
- Nếu đẩy những đơn hàng này qua endpoint `POST /v1/pos/checkout`, backend sẽ chạy lại toàn bộ business logic (kiểm tra tồn kho, giá cả, voucher...). Điều này gây rủi ro vì nếu validation fail (ví dụ âm kho), đơn hàng sẽ bị từ chối lưu.
- Tuy nhiên, trong thực tế, **khách hàng đã trả tiền mặt và cầm bill rời đi**. Do đó, hệ thống buộc phải ghi nhận đơn hàng này bất chấp các ràng buộc để đảm bảo khớp dòng tiền của thu ngân, thay vì reject đơn.

---

## 2. CHI TIẾT ENDPOINT MỚI (API SPECIFICATION)

### API Bulk Sync Đơn Hàng Offline (`POST /v1/pos/sync/orders`)

- **Mục đích:** Nhanh chóng insert một loạt các Order thô (raw) từ Local Database của máy POS lên Server Database.
- **Header:** `Authorization: Bearer <token>`
- **Logic Backend cần xử lý:**
  1. KHÔNG check tồn kho chặn đơn (có thể ghi nhận âm kho hoặc cảnh báo sau).
  2. KHÔNG check lại voucher.
  3. Lấy trực tiếp thông tin `total`, `subtotal`, `items_snapshot`, `payments_snapshot` từ body để lưu đè lên DB (Data Replication).
  4. Nếu `id` (guid) đã tồn tại, tiến hành update (Upsert) để tránh trùng lặp khi retry.

### Yêu cầu Request Body

```json
{
  "orders": [
    {
      "id": "uuid",
      "shift_id": "uuid",
      "staff_id": "uuid",
      "status": "COMPLETED",
      "subtotal": 150000,
      "discount": 0,
      "voucher_code": null,
      "voucher_discount": 0,
      "total": 150000,
      "total_tax": 13636,
      "note": "Offline Order",
      "refund_reason": null,
      "original_order_id": null,
      "customer_tax_info": null,
      "items_snapshot": [
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
      "payments_snapshot": [
        {
          "method": "cash",
          "amount": 150000,
          "cashTendered": 200000,
          "cashChange": 50000
        }
      ],
      "is_deleted": false,
      "created_at": 1716867600000,
      "updated_at": 1716867600000
    }
  ]
}
```

### Response Body thành công (200 OK)

```json
{}
```

---

## 3. LỢI ÍCH ĐẠT ĐƯỢC

1. Đảm bảo toàn vẹn dữ liệu kế toán và dòng tiền ca làm việc của thu ngân. Tiền đã thu không bao giờ bị reject.
2. Quản lý trạng thái dễ dàng từ phía Mobile POS nhờ cơ chế Outbox Pattern và cờ `is_synced`.
3. Có thể Retry nhiều lần mà không sợ sinh ra nhiều đơn rác nhờ cơ chế Upsert theo `id` đơn hàng.
