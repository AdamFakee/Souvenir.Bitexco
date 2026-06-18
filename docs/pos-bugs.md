# POS Bug Reports

### [BUG] API Hoàn tiền xử lý sai logic hoàn tiền một phần và xác thực Quản lý (`managerAuth`)

- **API:** `POST /v1/pos/orders/{orderId}/refund`
- **Vấn đề cụ thể:**
  1. **Vẫn hoàn cả đơn hàng dù gửi yêu cầu hoàn một phần:** Khi Client gửi payload chỉ hoàn một phần mặt hàng (ví dụ: chỉ hoàn 1 sản phẩm trong đơn hàng 6 sản phẩm), API phản hồi hoàn tiền thành công nhưng thực tế ghi nhận hoàn lại **toàn bộ đơn hàng gốc** (cả số lượng lẫn tổng tiền).
  2. **Cơ chế xác thực Quản lý (`managerAuth`) bị lỗi:**
     - Đang bị lỗi nhận diện tài khoản Quản lý (báo sai thông tin tài khoản mặc dù đã nhập đúng `employeeCode` và `pin` của Quản lý — thông tin tài khoản test gửi lên là `MGR` hoặc `ADMIN` với PIN đều là `1234`).
       _Ví dụ 2 payloads thực tế gửi lên đều báo không có quyền (unauthorized/no permission):_

       **Payload với ADMIN:**

       ```json
       {
         "orderId": "019e8dde-8686-7a3b-a259-59fc2c24b753",
         "idempotencyKey": "refund-1781663047380-w6hmjng5f1n",
         "reason": "",
         "shiftId": "019ebc32-5fee-7a6b-88e0-432999165ec1",
         "staffId": "e1000000-0000-0000-0000-000000000005",
         "lines": [
           {
             "variantId": "019e4eb6-43e8-7d8f-a34c-7fde4dcf94bc",
             "qty": 4
           }
         ],
         "managerAuth": {
           "employeeCode": "ADMIN",
           "pin": "1234"
         }
       }
       ```

       **Payload với MGR:**

       ```json
       {
         "orderId": "019e8dde-8686-7a3b-a259-59fc2c24b753",
         "idempotencyKey": "refund-1781663047380-w6hmjng5f1n",
         "reason": "",
         "shiftId": "019ebc32-5fee-7a6b-88e0-432999165ec1",
         "staffId": "e1000000-0000-0000-0000-000000000005",
         "lines": [
           {
             "variantId": "019e4eb6-43e8-7d8f-a34c-7fde4dcf94bc",
             "qty": 4
           }
         ],
         "managerAuth": {
           "employeeCode": "MGR",
           "pin": "1234"
         }
       }
       ```

     - Hoặc hệ thống chưa thực sự kiểm tra và đối chiếu quyền hạn của tài khoản Quản lý được gửi lên trong payload `managerAuth`

  3. Ở Pos báo thành công nhưng trên admin lại không hiển thị đơn hoàn 1 phần.

- **Yêu cầu đối với Backend:**
  - Đảm bảo API chỉ xử lý hoàn tiền cho các mặt hàng và số lượng cụ thể được truyền trong mảng `lines` của yêu cầu, không tự động áp dụng cho toàn bộ đơn hàng gốc.
  - Sửa lại cơ chế kiểm tra và đối chiếu thông tin tài khoản Quản lý (`employeeCode` và `pin`) trong object `managerAuth` khi thực hiện phê duyệt giao dịch hoàn tiền vượt hạn mức.
