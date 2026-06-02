# BÁO CÁO BUG: POS KHÔNG VERIFY ĐƯỢC VOUCHER ĐÃ TẠO TRÊN ADMIN

**Ngày ghi nhận:** 03/06/2026  
**Người phát hiện:** Mobile POS Team  
**Mức độ nghiêm trọng:** Cao — cashier không áp được mã giảm giá đã cấu hình trên Admin, ảnh hưởng trực tiếp checkout tại quầy.

---

## 1. TỔNG QUAN LỖI (SUMMARY)

- **API gặp lỗi:** `POST /v1/pos/vouchers/verify`
- **Ngữ cảnh:** Voucher/campaign đã được tạo trên Admin nhưng khi nhập mã ở màn POS checkout thì không áp dụng được.
- **Hành vi kỳ vọng:**
  - POS gửi mã voucher lên endpoint verify.
  - Backend tìm được voucher/campaign hoặc voucher code tương ứng.
  - Backend trả về cấu hình giảm giá để POS preview discount local:

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

## 4. CLIENT IMPLEMENTATION HIỆN TẠI

Client POS chỉ làm đúng vai trò preview:

1. Gọi `POST /v1/pos/vouchers/verify` với `{ code }`.
2. Nếu backend trả success, POS lưu response vào cart:
   - `code`
   - `percent`
   - `maxDiscountAmount`
   - `applicableVariantIds`
3. POS tự tính discount local để preview.
4. Khi checkout thật, POS chỉ gửi `voucherCode` vào `/v1/pos/checkout`; redemption thực tế vẫn do backend xử lý.

Vì vậy lỗi không nằm ở checkout redemption, mà xảy ra ngay tại bước verify voucher.

---

## 5. NGUYÊN NHÂN BACKEND CẦN KIỂM TRA

Backend vui lòng kiểm tra các khả năng sau:

1. **Endpoint POS verify chưa lookup đúng nguồn code từ Admin**
   - Có thể chỉ lookup `campaigns.code` nhưng không lookup `voucher_codes.code`, hoặc ngược lại.

2. **Sai điều kiện state/status giữa Admin và POS**
   - Admin hiển thị voucher active nhưng POS verify yêu cầu field khác, ví dụ:
     - `campaign.state = ACTIVE`
     - `voucher_code.is_active = TRUE`
     - campaign chưa start / đã end
     - voucher code hết hạn theo `expires_at`

3. **Sai type voucher được POS support**
   - POS verify endpoint chỉ support voucher phần trăm:
     - `PERCENTAGE`
     - `PERCENTAGE_DISCOUNT`
     - `CASHBACK`
   - Nếu Admin tạo type khác, backend nên trả message rõ hơn cho admin/dev hoặc đảm bảo Admin không cho gán loại không support cho POS verify.

4. **Sai tenant/store/device scope**
   - Voucher tạo trên Admin có thể không cùng tenant/store với device POS đang dùng.
   - Cần kiểm tra filter theo tenant, store, branch hoặc channel.

5. **Sai normalize code**
   - POS gửi code uppercase.
   - Backend cần compare case-insensitive hoặc normalize UPPER như tài liệu đã mô tả.

6. **Sai cấu trúc rules**
   - Backend cần đảm bảo đọc được:
     - `campaigns.rules->>maxDiscountAmount`
     - `campaigns.rules->>applicableVariantIds`
   - Nếu field thiếu, vẫn nên trả default hợp lệ:
     - `maxDiscountAmount: null`
     - `applicableVariantIds: []`

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

## 7. GỢI Ý DEBUG BACKEND

Backend có thể log thêm ở endpoint `POST /v1/pos/vouchers/verify`:

- normalized code nhận được
- tenant/store/device scope dùng để query
- matched source: `campaigns.code` hay `voucher_codes.code`
- campaign state
- start/end time
- voucher type
- voucher code active/expired
- lý do cụ thể bị reject trước khi map ra `pos.voucher_invalid`

Lưu ý: Public response vẫn có thể giữ chung `pos.voucher_invalid` để tránh leak voucher existence, nhưng log nội bộ cần đủ chi tiết để debug.
