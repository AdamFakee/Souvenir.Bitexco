# POS Bug Reports

### [BUG-21] `POST /v1/pos/orders/{orderId}/refund` — Lỗi DB Constraint `23514: ck_rl_condition` khi thực hiện hoàn tiền (Refund)

- **Triệu chứng:** Khi Client thực hiện gửi yêu cầu hoàn tiền cho đơn hàng qua API `POST /v1/pos/orders/{orderId}/refund`, server trả về lỗi `500 Internal Server Error` với thông tin chi tiết lỗi check constraint cơ sở dữ liệu:
  ```json
  {
    "error": "23514: new row for relation \"return_lines\" violates check constraint \"ck_rl_condition\"\n\nDETAIL: Detail redacted as it may contain sensitive data."
  }
  ```

## Phân loại dữ liệu qua từng API (Data flow per API)

### 1. API Tra cứu thông tin đơn hàng gốc

- **Endpoint:** `GET /v1/orders/lookup?code={orderCodeOrId}`
- **Dữ liệu gửi lên (Request Params):**
  - `code` (string): Mã đơn hàng (VD: `SO-2606120825E3E2`) hoặc UUID của đơn hàng.
- **Dữ liệu nhận về từ Backend (Response Body - 200 OK):**
  ```json
  {
    "order": {
      "id": "019ebaef-4e38-769b-bcab-c1d449a1ff5b",
      "tenantId": "a0000000-0000-0000-0000-000000000001",
      "code": "SO-2606120825E3E2",
      "warehouseId": "c0000000-0000-0000-0000-000000000002",
      "customerId": null,
      "cashierUserId": "e1000000-0000-0000-0000-000000000005",
      "cashSessionId": "019eb0ec-b1c0-7c92-a972-914ee85d60b8",
      "state": "FULFILLED",
      "subTotal": 1525000,
      "discountTotal": 0,
      "taxTotal": 122000,
      "grandTotal": 1647000,
      "paidTotal": 1647000,
      "currency": "VND",
      "notes": null,
      "cancelledReason": null,
      "cancelledAt": null,
      "completedAt": null,
      "version": 7,
      "createdAt": "2026-06-12T08:25:05.848359Z",
      "updatedAt": "2026-06-12T08:25:06.335926Z",
      "clientIdempotencyKey": null,
      "affiliateId": null
    },
    "lines": [
      {
        "id": "019ebaef-4e4b-77ae-8205-6da7ab9c2d4b",
        "tenantId": "a0000000-0000-0000-0000-000000000001",
        "orderId": "019ebaef-4e38-769b-bcab-c1d449a1ff5b",
        "variantId": "019e4eb5-e159-7165-9ae0-25bd355eb007",
        "unitId": "00000000-0000-0000-0000-000000000010",
        "qty": 1,
        "unitPrice": 1525000,
        "discountAmount": 0,
        "taxRate": 8,
        "lineTotal": 1525000,
        "voucherId": null,
        "batchId": null,
        "serialIds": null,
        "notes": null
      }
    ]
  }
  ```

---

### 2. API Yêu cầu hoàn tiền (Refund Order)

- **Endpoint:** `POST /v1/pos/orders/{orderId}/refund`
- **Dữ liệu gửi lên (Request Body):**
  - **Mô tả cấu trúc:**
    - `orderId`: UUID đơn hàng gốc.
    - `idempotencyKey`: Mã UUID chống trùng lặp.
    - `reason`: Lý do hoàn trả.
    - `shiftId`: ID ca làm việc hiện tại.
    - `staffId`: ID nhân viên thực hiện.
    - `lines`: Danh sách mặt hàng hoàn tiền, bao gồm:
      - `variantId` (UUID): ID biến thể sản phẩm nhận từ API Lookup phía trên (Ví dụ: `019e4eb5-e159-7165-9ae0-25bd355eb007`).
      - `qty` (number): Số lượng hoàn trả.
      - _Chú ý: Không chứa trường `condition` theo tài liệu API hiện thời._
  - **Payload thực tế gửi đi:**
    ```json
    {
      "orderId": "019ebaef-4e38-769b-bcab-c1d449a1ff5b",
      "idempotencyKey": "refund-1781265486784-tnhv7cglw7k",
      "reason": "",
      "shiftId": "019ebc32-5fee-7a6b-88e0-432999165ec1",
      "staffId": "e1000000-0000-0000-0000-000000000005",
      "lines": [
        {
          "variantId": "019e4eb5-e159-7165-9ae0-25bd355eb007",
          "qty": 1
        }
      ],
      "managerAuth": null
    }
    ```
- **Dữ liệu nhận về (Response Body - 500 Internal Server Error):**
  ```json
  {
    "error": "23514: new row for relation \"return_lines\" violates check constraint \"ck_rl_condition\"\n\nDETAIL: Detail redacted as it may contain sensitive data. Specify 'Include Error Detail' in the connection string to include this information.",
    "stack": "   at Npgsql.Internal.NpgsqlConnector.ReadMessageLong..."
  }
  ```

---

## Yêu cầu đề xuất cho Backend:

1. Backend kiểm tra lại định nghĩa của check constraint `ck_rl_condition` trên bảng `return_lines`.
2. Bổ sung giá trị mặc định hợp lệ cho cột này ở backend (ví dụ: `'GOOD'` hoặc `'good'`), hoặc cho phép giá trị null nếu điều kiện đó không bắt buộc.
3. Hoặc nếu API yêu cầu Client phải gửi thêm trường `condition` trong mảng `lines` (ví dụ: `[{"variantId": "...", "qty": 1, "condition": "GOOD"}]`), vui lòng cập nhật tài liệu API để Client bổ sung.

- **Trạng thái:** ⏳ Đang chờ Backend

---

### [REQUEST] Phân quyền xem Dashboard ca làm việc cho Thu ngân (Cashier)

- **Các API liên quan:**
  - `GET /v1/dashboard/overview` (Lấy tổng quan báo cáo doanh thu ca)
  - `GET /v1/dashboard/product-revenue` (Lấy chi tiết doanh thu theo sản phẩm)
- **Mô tả:** Khi Cashier truy cập dashboard ca của chính mình, Client gọi hai API trên kèm theo tham số `shiftId`. Cashier xem báo cáo trong ca làm việc của mình thì không cần quyền truy cập dashboard/báo cáo chung của hệ thống.
- **Yêu cầu đề xuất cho Backend:**
  - Xem xét cơ chế phân quyền đối với hai endpoint này: Nếu có tham số `shiftId` truyền lên, cho phép Cashier xem báo cáo của ca đó mà không cần yêu cầu quyền quản lý/admin.
  - Đảm bảo Cashier truy cập thành công hai API này mà không bị chặn phân quyền (403).

---

### [BUG] Tiền mặt dự kiến (expectedCash) của ca vẫn tính tiền từ đơn hàng đã huỷ hoặc thất bại

- **API liên quan:** `GET /v1/cash-sessions/{shiftId}`
- **Vấn đề:** Khi lấy thông tin thống kê ca làm việc để đối soát trước khi đóng ca, số tiền mặt dự kiến (`session.expectedCash`) trả về từ backend vẫn đang tính thêm cả tiền mặt đã thực hiện thanh toán (captured) ở các đơn hàng sau đó bị hủy (`CANCELLED`) hoặc thất bại.
- **Yêu cầu đề xuất cho Backend:** Loại trừ các giao dịch tiền mặt của đơn hàng đã hủy/thất bại khỏi tổng `expectedCash` của ca làm việc để dữ liệu đối soát chính xác.

---

### [BUG/PERMISSION] Lỗi phân quyền khi tra cứu đơn hàng gốc để hoàn tiền (Order Lookup)

- **API:** `GET /v1/orders/lookup?code={orderCodeOrId}`
- **Triệu chứng:** Khi Thu ngân (`wms_cashier`) thực hiện tra cứu hóa đơn, API trả về:
  ```json
  {
    "error": "forbidden: sales:order:read"
  }
  ```
- **Token context:**
  - Roles: `["wms_store_mgr", "wms_cashier", "wms_sales"]`
  - Permissions:
    ```json
    [
      "pos.refund",
      "pos.void",
      "pos:cashier:checkout",
      "pos.reprint",
      "pos:cash:adjust",
      "pos.cashflow.out",
      "pos.cashflow.in",
      "pos:cashflow:read",
      "pos:cashflow:write",
      "pos.shift.close.discrepancy",
      "print:shift",
      "print:so",
      "print:gi",
      "print:st",
      "print:adj",
      "print:label",
      "print:rt",
      "product:read",
      "product:write",
      "product:batches:manage",
      "product:variants:manage",
      "product:barcodes:manage",
      "inventory:read",
      "inventory:write",
      "inventory:adjust:read",
      "inventory:adjust:create",
      "inventory:adjust:post",
      "inventory:adjust:approve",
      "damage_report:read",
      "damage_report:write",
      "damage_report:post",
      "damage_report:approve",
      "supplier_return:read",
      "supplier_return:write",
      "supplier_return:approve",
      "supplier_return:cancel",
      "transfer:read",
      "transfer:write",
      "transfer:receive",
      "transfer:cancel",
      "transfer:request:read",
      "transfer:request:write",
      "ctv:affiliates:read",
      "sales.ctv.read",
      "treasury:read",
      "finance.debt.read",
      "users.read",
      "devices.read",
      "activity.view",
      "agentic:chat"
    ]
    ```
  - Note: trên admin web đã cho quyền hoàn và cancle rồi ( Backend cần check lại ).

---

### [BUG/PERMISSION] Lỗi phân quyền khi đóng ca (Transition Shift)

- **API:** `POST /v1/cash-sessions/{shiftId}/transitions`
- **Triệu chứng:** Khi gọi API chuyển trạng thái đóng ca (`transitions`), API trả về lỗi `403 Forbidden` mặc dù token của Cashier/Store Manager đã được phân các quyền kết ca/tiền mặt POS.
  - Note: trên admin web đã cho quyền duyệt đóng ca rồi ( Backend cần check lại ).

---

### [BUG] Đồng bộ sản phẩm (Product Sync) trả về sai danh sách/số lượng theo kho

- **API:** `GET /v1/pos/products/sync?warehouseId=c0000000-0000-0000-0000-000000000002`
- **Triệu chứng:** Khi Client gọi đồng bộ kèm tham số `warehouseId` (Mã kho gửi lên: `c0000000-0000-0000-0000-000000000002`), API trả về 6 sản phẩm/biến thể, trong khi thực tế kho này chỉ quản lý 4 sản phẩm/biến thể. Backend trả về dư thừa cả các mặt hàng thuộc kho khác hoặc sai lệch danh sách thực tế của kho được truyền.

---

### [BUG] API Hoàn tiền tính toán sai giá trị khi hoàn một phần

- **API:** `POST /v1/pos/orders/{orderId}/refund`
- **Triệu chứng:** Khi Thu ngân thực hiện hoàn tiền một phần (chỉ chọn trả lại sản phẩm có giá trị thấp dưới 500,000đ), API vẫn tính toán tổng số tiền hoàn là giá trị của **cả đơn hàng gốc** (Ví dụ: 1,735,000đ), dẫn đến kích hoạt lỗi vượt hạn mức Thu ngân (`refund.cashier_threshold`) và chặn giao dịch.
- **Yêu cầu đối với Backend:**
  - Khi gặp lỗi về quyền hạn/vượt hạn mức Thu ngân, API cần trả về mã lỗi **`403 Forbidden`** (thay vì 400 Bad Request).
  - Xử lý tính toán hạn mức và hoàn một phần dựa trên dữ liệu các mặt hàng thực tế gửi lên (`lines`), không lấy toàn bộ đơn hàng gốc để so khớp hạn mức.
