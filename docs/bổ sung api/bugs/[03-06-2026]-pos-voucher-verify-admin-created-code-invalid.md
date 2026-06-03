# BÁO CÁO BUG: POS KHÔNG VERIFY ĐƯỢC VOUCHER ĐÃ TẠO TRÊN ADMIN

**Ngày ghi nhận:** 03/06/2026  
**Người phát hiện:** Mobile POS Team  
**Mức độ nghiêm trọng:** Cao — cashier không áp được mã giảm giá đã cấu hình trên Admin, ảnh hưởng trực tiếp checkout tại quầy.

---

## 1. TỔNG QUAN LỖI (SUMMARY)

- **API gặp lỗi:** `POST /v1/pos/vouchers/verify`
- **Ngữ cảnh:** Voucher/campaign đã được tạo trên Admin nhưng khi nhập mã ở màn POS checkout thì không áp dụng được.

  ```json
  {
    "code": "KM20",
    "percent": 20,
    "maxDiscountAmount": 50000,
    "applicableVariantIds": []
  }
  ```

- **Hành vi thực tế:**
  - Voucher đã có trên Admin nhưng POS verify bị fail.
  - User thấy lỗi kiểu `Mã giảm giá không hợp lệ hoặc đã hết hạn.`
  - Không có voucher nào được apply vào cart.

---

## 2. API CONTRACT POS ĐANG GỌI

POS gọi đúng theo tài liệu API:

```http
POST /v1/pos/vouchers/verify
Content-Type: application/json
Authorization: Bearer <device_access_token>
```

**Request body:**

```json
{
  "code": "<VOUCHER_CODE>"
}
```

Client đã normalize code trước khi gửi:

- `trim()`
- `toUpperCase()`

Ví dụ nếu cashier nhập `km20` thì POS gửi `KM20`.

---

## 3. CHỨNG CỨ / TRIỆU CHỨNG KỸ THUẬT

### A. Voucher được tạo trên Admin

Voucher/campaign đã được tạo từ Admin

### B. POS verify vẫn bị reject

Khi POS gọi verify, backend trả lỗi invalid/expired thay vì trả config giảm giá:

```json
{
  "error": "pos.voucher_invalid",
  "message": "Mã giảm giá không hợp lệ hoặc đã hết hạn."
}
```

Điều này khiến app không thể apply voucher, dù voucher đã được cấu hình trên Admin.

---

## 6. KẾT QUẢ MONG MUỐN

Với voucher hợp lệ đã tạo trên Admin, endpoint POS verify cần trả `200`:

```json
{
  "code": "KM20",
  "percent": 20,
  "maxDiscountAmount": 50000,
  "applicableVariantIds": []
}
```

Trong đó:

- `code`: mã canonical uppercase.
- `percent`: phần trăm giảm giá.
- `maxDiscountAmount`: số tiền giảm tối đa hoặc `null` nếu không giới hạn.
- `applicableVariantIds`: mảng variant áp dụng; mảng rỗng nghĩa là áp dụng toàn bộ.

---
