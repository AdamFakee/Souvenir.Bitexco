# POS Bug Reports

### [BUG-18] `GET /v1/orders/lookup?code=...` — Lỗi 404 order.not_found khi tra cứu đơn hàng bằng UUID

- **Triệu chứng:** Khi Client gọi API tra cứu đơn hàng `GET /v1/orders/lookup?code={uuid}` bằng UUID của đơn hàng (ví dụ: `e3843854-7957-4ba5-b127-a4e04908f551`), Backend trả về lỗi `404 order.not_found`.

- **Trạng thái:** ⏳ Đang chờ Backend

### [BUG-19] `GET /v1/dashboard/overview` — Sai lệch doanh thu phương thức thanh toán (Tính cả đơn hủy & thanh toán chưa xác nhận)

- **Triệu chứng:** Khi Client gọi API lấy báo cáo doanh thu ca `GET /v1/dashboard/overview?shiftId={shiftId}`:
  - Tiền mặt (Cash) của các đơn hàng đã bị hủy (`CANCELLED`) vẫn bị cộng vào báo cáo của phương thức thanh toán tiền mặt. Trạng thái của tiền mặt trong các đơn hủy là captured, không phải void,
  - Tiền thanh toán QR/Card của các đơn hàng" có trạng thái hiển thị trên admin là "đã xác nhận" (các đơn thanh toán chỉ tiền mặt là hiển thị trạng thái "đã giao") vẫn bị cộng vào báo cáo của phương thức thanh toán tương ứng.
  - Tuy nhiên, các khoản tiền này lại **không** được tính vào doanh thu tổng (total revenue) của ca, dẫn đến việc tổng doanh thu của các phương thức thanh toán bị lệch so với doanh thu tổng.

- **Yêu cầu:** Backend cần kiểm tra và cập nhật lại logic tính toán.

- **Trạng thái:** ⏳ Đang chờ Backend

### [BUG-20] `GET /v1/cash-sessions/{id}` — Trường `expectedCash` trả về `null`

- **Triệu chứng:** Khi Client gọi API lấy thông tin chi tiết/thống kê ca làm việc `GET /v1/cash-sessions/{id}`, thông tin session trả về có trường `expectedCash` (tiền mặt kì vọng) bằng `null`.
  - Response thực tế nhận được:
    ```json
    {
      "flows": [],
      "session": {
        "id": "019eb0ec-b1c0-7c92-a972-914ee85d60b8",
        "code": "CS-26061009469F99",
        "openingCash": 2,
        "expectedCash": null, // <--- Bị null
        "countedCash": null,
        "diffCash": null,
        "state": "OPEN",
        "cashierUserId": "e1000000-0000-0000-0000-000000000005",
        "posDeviceId": "019e437b-1620-71c0-9924-c1df81683181",
        "tenantId": "a0000000-0000-0000-0000-000000000001",
        ...
      }
    }
    ```

- **Yêu cầu:** Backend cần tính toán số tiền mặt kì vọng trong ca và trả về trong trường `expectedCash` (thường bằng `openingCash` + tiền mặt từ doanh thu các đơn hàng thành công trong ca - các khoản chi/rút tiền mặt).

- **Trạng thái:** ⏳ Đang chờ Backend
