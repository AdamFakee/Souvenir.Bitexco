# Bổ sung API: Hủy Đơn Hàng

Tài liệu này bổ sung endpoint hủy đơn hàng phục vụ cho việc hủy đơn hàng trực tiếp khi thu ngân thoát hoặc hủy giao dịch thanh toán (ví dụ như trong luồng thanh toán hỗn hợp - Mix Payment).

---

## 1. Hủy đơn hàng

> **Luồng hoạt động:** Máy POS gửi request hủy đơn hàng khi thu ngân chọn hủy thanh toán trong quá trình chờ giao dịch không tiền mặt (QR/Card).

- **Endpoint:** `POST /v1/pos/orders/{id}/cancel`
- **Xác thực:** Yêu cầu `Authorization: Bearer <accessToken>` (Device JWT)
- **Quyền hạn (Permission):** `pos:checkout`

### Path Parameters

| Tham số | Kiểu dữ liệu | Bắt buộc | Mô tả                     |
| ------- | ------------ | -------- | ------------------------- |
| `id`    | string       | Có       | UUID của đơn hàng cần hủy |

---

## Định dạng Response

> Không có global envelope wrapper. Response body là raw JSON của object — **không** có `{ success, data }` bọc ngoài.

### Success — Object đơn (200 OK)

Trả trực tiếp data object:

```json
{
  "success": true
}
```

### Error — Business lỗi (400 / 409)

```json
{ "error": "order.invalid_state" }
```

`error` là code string theo dạng `module.reason` (không phải message hiển thị). FE translate sang tiếng Việt theo error map.

| HTTP  | Trường hợp                                                                    |
| ----- | ----------------------------------------------------------------------------- |
| `400` | Lỗi nghiệp vụ — thiếu field, đơn hàng không ở trạng thái PENDING để hủy, v.v. |
| `401` | Token hết hạn hoặc không hợp lệ                                               |
| `403` | Không có quyền                                                                |
| `404` | Resource không tồn tại                                                        |
| `409` | OCC conflict — version không khớp (dùng `ToStateIResult`)                     |
| `422` | Dữ liệu không hợp lệ ở tầng request                                           |
| `429` | Rate limit                                                                    |
| `500` | Server error — `{ "error": "Internal server error", "traceId": "..." }`       |
