# Bổ sung API: Hủy Đơn Hàng

Tài liệu này bổ sung endpoint hủy đơn hàng phục vụ cho việc hủy đơn hàng trực tiếp khi thu ngân thoát hoặc hủy giao dịch thanh toán (ví dụ như trong luồng thanh toán hỗn hợp - Mix Payment).

---

## 1. Hủy đơn hàng

> **Luồng hoạt động:** Máy POS gửi request hủy đơn hàng khi thu ngân chọn hủy thanh toán trong quá trình chờ giao dịch không tiền mặt (QR/Card). Request cần gửi kèm ca làm việc và nhân viên để backend ghi audit trail.

- **Endpoint:** `POST /v1/pos/orders/{id}/cancel`
- **Xác thực:** Yêu cầu `Authorization: Bearer <accessToken>` (Device JWT)
- **Quyền hạn (Permission):** `pos:checkout`

### Path Parameters

| Tham số | Kiểu dữ liệu | Bắt buộc | Mô tả                     |
| ------- | ------------ | -------- | ------------------------- |
| `id`    | string       | Có       | UUID của đơn hàng cần hủy |

### Request Body

```json
{
  "shift_id": "uuid-ca-lam-viec",
  "staff_id": "uuid-nhan-vien",
  "reason": "cashier_cancelled_payment"
}
```

### Body Fields

| Trường     | Kiểu dữ liệu | Bắt buộc | Mô tả                                                                |
| ---------- | ------------ | -------- | -------------------------------------------------------------------- |
| `shift_id` | string       | Có       | UUID ca làm việc/cash session hiện tại.                              |
| `staff_id` | string       | Có       | UUID nhân viên thực hiện hủy đơn.                                    |
| `reason`   | string       | Không    | Lý do hủy để audit/log. Có thể dùng code ngắn thay vì text hiển thị. |

---

## 2. Business Rules

| Mã   | Rule                                                                                                                                                                                                                 |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR01 | Chỉ cho phép hủy đơn ở trạng thái có thể hủy, ví dụ `PENDING` hoặc trạng thái backend cho phép.                                                                                                                      |
| BR02 | Không cho phép hủy đơn đã `COMPLETED`, đã bị hủy, hoặc trạng thái không hợp lệ.                                                                                                                                      |
| BR03 | Backend phải ghi nhận `staff_id`, `shift_id`, thời gian hủy và lý do hủy nếu có.                                                                                                                                     |
| BR04 | Nếu đơn đã reserve/trừ tồn kho lúc tạo, backend phải hoàn tồn kho khi hủy.                                                                                                                                           |
| BR05 | Nếu đơn chưa reserve/trừ tồn kho, backend không cần restock khi hủy.                                                                                                                                                 |
| BR06 | Với mixed payment/cash đã thu một phần, tiền hoàn thực tế do thu ngân tự xử lý trực tiếp tại quầy; backend chỉ ghi nhận trạng thái hủy và số tiền liên quan nếu cần audit, không cần xử lý settlement/chi tiền thật. |
| BR07 | Nếu có payment không tiền mặt đang pending, backend cần cancel/void payment theo khả năng của provider hoặc đánh dấu order/payment ở trạng thái phù hợp để không capture tiếp.                                       |

---

## 3. Định dạng Response

> Không có global envelope wrapper. Response body là raw JSON của object — **không** có `{ success, data }` bọc ngoài.

### Success — Object đơn (200 OK)

Trả trực tiếp data object mới để FE update UI:

```json
{
  "orderId": "uuid-don-hang",
  "orderCode": "SO-20260602-001",
  "status": "CANCELLED",
  "cancelledAt": "2026-06-02T10:30:00Z"
}
```

### Response Fields

| Trường        | Kiểu dữ liệu | Mô tả                                          |
| ------------- | ------------ | ---------------------------------------------- |
| `orderId`     | string       | UUID đơn hàng đã hủy.                          |
| `orderCode`   | string       | Mã đơn hàng hiển thị.                          |
| `status`      | string       | Trạng thái mới sau hủy, thường là `CANCELLED`. |
| `cancelledAt` | string       | Thời điểm backend ghi nhận hủy đơn.            |

---

## 4. Error Response

### Business lỗi (400 / 409)

```json
{ "error": "order.invalid_state" }
```

`error` là code string theo dạng `module.reason` (không phải message hiển thị). FE translate sang tiếng Việt theo error map.

| HTTP  | Error Code                | Trường hợp / Hướng xử lý                                                |
| ----- | ------------------------- | ----------------------------------------------------------------------- |
| `400` | `pos.session_not_found`   | Không tìm thấy ca làm việc hiện tại.                                    |
| `400` | `order.invalid_state`     | Đơn hàng không ở trạng thái cho phép hủy.                               |
| `401` | `auth.unauthorized`       | Token hết hạn hoặc không hợp lệ.                                        |
| `403` | `auth.forbidden`          | Không có quyền `pos:checkout`.                                          |
| `404` | `order.not_found`         | Không tìm thấy đơn hàng.                                                |
| `409` | `order.version_conflict`  | OCC conflict — dữ liệu đã thay đổi, FE cần tải lại đơn.                 |
| `422` | `request.invalid_payload` | Dữ liệu request không hợp lệ ở tầng validation.                         |
| `429` | `rate_limit.exceeded`     | Rate limit.                                                             |
| `500` | `Internal server error`   | Server error — `{ "error": "Internal server error", "traceId": "..." }` |

## 5. Ghi chú tích hợp FE

1. FE gửi `shift_id` và `staff_id` để backend audit.
2. FE dùng `status` trong response để update UI, không suy luận từ `{ success: true }`.
3. FE không tự restock local; nếu cần restock, backend xử lý theo rule reserve/trừ tồn.
4. Nếu cashier đã thu tiền mặt/mixed payment trước khi hủy, tiền hoàn thực tế do cashier tự xử lý trực tiếp với khách tại quầy.
