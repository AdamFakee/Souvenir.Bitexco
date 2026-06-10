# POS Bug Reports

### [BUG-18] `GET /v1/orders/lookup?code=...` — Lỗi 404 order.not_found khi tra cứu đơn hàng bằng UUID

- **Triệu chứng:** Khi Client gọi API tra cứu đơn hàng `GET /v1/orders/lookup?code={uuid}` bằng UUID của đơn hàng (ví dụ: `e3843854-7957-4ba5-b127-a4e04908f551`), Backend trả về lỗi `404 order.not_found`.

- **Trạng thái:** ⏳ Đang chờ Backend
