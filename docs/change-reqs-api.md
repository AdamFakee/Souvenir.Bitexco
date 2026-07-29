## Note 2: Ràng buộc quyền đổi/trả + `managerAuth` (TODO BACKEND — chưa triển khai)

> **[Hiện trạng]**: API `POST /v1/pos/orders/{id}/refund` và `POST /v1/pos/orders/{id}/exchange` **chưa triển khai** kiểm tra quyền (permission) và luồng `managerAuth`. BE cần bổ sung.

### Request body (FE gửi khi retry)

```json
{
  "idempotencyKey": "refund-…",
  "reason": "Sản phẩm lỗi",
  "shiftId": "uuid-ca",
  "staffId": "uuid-nv-thu-ngan",
  "managerAuth": {
    "employeeCode": "MGR001",
    "pin": "123456"
  }
}
```

| Field                      | Bắt buộc        | Mô tả                       |
| -------------------------- | --------------- | --------------------------- |
| `managerAuth`              | Không (lần đầu) | Gửi kèm khi retry sau `403` |
| `managerAuth.employeeCode` | Có\*            | Mã nhân viên quản lý        |
| `managerAuth.pin`          | Có\*            | PIN của quản lý             |

### Error codes BE phải trả về

| HTTP  | Code                               | Mô tả                                         |
| ----- | ---------------------------------- | --------------------------------------------- |
| `403` | `order.manager_approval_required`  | NV thu ngân không có quyền, cần QL xác nhận   |
| `403` | `refund.cashier_threshold`         | Vượt ngưỡng giá trị cho phép, cần QL xác nhận |
| `401` | `auth.invalid_manager_credentials` | PIN QL sai hoặc QL không có quyền             |

### BE rules

| Mã     | Rule                                                                                                  |
| ------ | ----------------------------------------------------------------------------------------------------- |
| AUTH01 | Kiểm tra `staffId` có quyền `pos.refund` / `pos.exchange` không.                                      |
| AUTH02 | Nếu không có quyền hoặc giá trị vượt ngưỡng → `403` với code tương ứng **trước khi** xử lý nghiệp vụ. |
| AUTH03 | Khi có `managerAuth`: xác thực `employeeCode` + `pin`; kiểm tra QL có đủ quyền approve.               |
| AUTH04 | PIN sai hoặc QL không đủ quyền → `401` `auth.invalid_manager_credentials`.                            |
| AUTH05 | PIN đúng + QL có quyền → tiếp tục xử lý refund/exchange bình thường.                                  |
| AUTH06 | `managerAuth` null/omit mà NV không có quyền → chỉ trả `403`, **không** tự bỏ qua.                    |

### Áp dụng cho cả hai endpoint

- `POST /v1/pos/orders/{id}/refund`
- `POST /v1/pos/orders/{id}/exchange`

### FE notes (đã xử lý sẵn — chờ BE triển khai)

FE đã có Manager Overlay và logic retry với `managerAuth`. Khi BE ship, FE hoạt động ngay không cần sửa thêm.

## Note 7: Hỗ trợ bộ lọc cho danh sách Nhân Viên (API `GET /v1/pos/employees`)

# chưa filter theo paramse truyền lên

> **[Bối cảnh]**: Cần hỗ trợ lọc nâng cao cho danh sách nhân viên để phục vụ đối soát, thống kê và giới hạn quyền truy cập trên POS.

### Các tham số lọc cần hỗ trợ:

1. **Lọc theo quyền hoạt động POS:**
   - **Tham số:** `isPos` (boolean).
   - **Lỗi hiện tại:** BE chưa hoạt động đúng hoặc chưa lọc theo tham số này.
   - **Mô tả:** `true` = chỉ lấy nhân viên có quyền truy cập và thực hiện bán hàng tại POS. Tránh trả về các tài khoản Admin/HQ không liên quan; `false` = lấy tất cả các nhân viên.

2. **Lọc theo lịch sử giao dịch:**
   - **Tham số:** `hasTransaction` (boolean).
   - **Mô tả:** `true` = chỉ lấy các nhân viên đã từng phát sinh ít nhất một giao dịch/bán hàng/kết ca thành công; `false` = hiển thị các nhân viên chưa từng phát sinh giao dịch nào.

3. **Lọc trạng thái hoạt động:**
   - **Tham số:** `status` (string).
   - **Mô tả:** Lọc theo trạng thái hoạt động: `active` hoặc `inactive`.

### Ví dụ Request từ Client:

- Lọc nhân viên POS đang hoạt động và đã phát sinh giao dịch:
  `GET /v1/pos/employees?isPos=true&hasTransaction=true&status=active`

---

## Note 9: Chưa lưu trữ ghi chú (notes) của đơn hàng khi checkout

> **[Vấn đề]**: Khi thực hiện thanh toán qua API `POST /v1/pos/checkout`, phía Client có gửi kèm ghi chú trong trường `notes` (kiểu dữ liệu `string | null`):
>
> ```json
> {
>   "cashSessionId": "...",
>   "notes": "Ghi chú đơn hàng ví dụ...",
>   "lines": [...],
>   "payments": [...]
> }
> ```
>
> Tuy nhiên, hiện tại Backend chưa lưu trữ ghi chú này vào cơ sở dữ liệu. Khi truy vấn chi tiết hoặc lịch sử đơn hàng (`GET /v1/pos/orders` / `GET /v1/pos/orders/{id}`), thông tin ghi chú không được trả về hoặc trả về rỗng, dẫn đến việc không hiển thị được ghi chú lịch sử đơn trên POS.

### Yêu cầu BE:

- Lưu trữ trường `notes` từ payload checkout vào trường tương ứng của đơn hàng (ví dụ: `note` hoặc `notes`).
- Trả về trường này trong response của các API lấy chi tiết và danh sách đơn hàng.

---

## Note 10: [Chú ý] Kiểm tra luồng gán Session và Token cho Account hoặc Ca làm việc (Shift)

> **[Lưu ý từ Frontend/Client]**: Hiện tại thỉnh thoảng có các lỗi vặt (lỗi chập chờn/không ổn định) liên quan đến việc xác thực ca làm việc và tài khoản. Backend cần kiểm tra lại toàn bộ luồng (flow) gán session (ca làm việc) và gán token (session token/JWT):
>
> - Xác thực xem token (bao gồm cả cơ chế và luồng refresh token) đang được gán/liên kết chặt chẽ với tài khoản nhân viên (account/staff) hay gắn với ca làm việc cụ thể (`shift`/`cashSession`).
> - Đảm bảo khi thực hiện refresh token hoặc khi nhân viên đổi ca, đổi tài khoản, hoặc ca làm việc đóng/kết thúc, token/session hoạt động độc lập và không xảy ra xung đột quyền hoặc ghi nhận sai lệch thông tin ca làm việc của tài khoản khác hoặc 404

---

## Note 11: Bổ sung phương thức thanh toán công nợ cho đơn hàng công nợ trong API danh sách đơn hàng (`GET /v1/pos/orders` / `GET /v1/pos/orders/{id}`)

> **[Yêu cầu mới]**: Khi truy vấn danh sách đơn hàng qua API `GET /v1/pos/orders` hoặc lấy chi tiết đơn hàng `GET /v1/pos/orders/{id}`, đối với các đơn hàng mua bằng hình thức công nợ (đại lý ghi nợ), Backend cần trả về phương thức thanh toán công nợ trong danh sách thanh toán (`payments_snapshot`).

### Chi tiết yêu cầu:

- **Hiện trạng:** Đối với đơn hàng công nợ, Backend chưa trả về phương thức thanh toán công nợ (ví dụ: `method = "cong_no"`) trong mảng thanh toán. Dẫn đến Client hiển thị phương thức thanh toán là trống (`—`).
- **Yêu cầu:**
  - Trong mảng thanh toán (`paymentsSnapshot`) trả về của đơn hàng, nếu là đơn công nợ, Backend cần bổ sung/trả về đối tượng thanh toán với:
    - `method`: `"cong_no"` (hoặc giá trị tương ứng để Client map đúng với phương thức công nợ).
    - `amount`: Số tiền ghi nợ/công nợ của đơn hàng.
  - Đảm bảo trả về đầy đủ ở cả API danh sách (`GET /v1/pos/orders`) và chi tiết đơn hàng (`GET /v1/pos/orders/{id}`).
