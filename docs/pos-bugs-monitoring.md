# WMS Bug Tracker

Ghi nhận tất cả bugs đã báo cáo. Mỗi entry: triệu chứng, nguyên nhân, trạng thái.

---

## Đang theo dõi

### [BUG-13] `POST /v1/pos/sync/orders` — Đơn offline sync thành công nhưng `items_snapshot` rỗng trên Server

- **Triệu chứng:**
  - Đơn hàng offline được đẩy lên Server qua `POST /v1/pos/sync/orders` thành công (HTTP 200), hiển thị đúng tổng tiền và thuế trên Admin.
  - Tuy nhiên, phần **Sản phẩm** trong chi tiết đơn hàng trên Admin hoàn toàn trống (`—`) mặc dù Client đã gửi đầy đủ `itemsSnapshot` trong payload.
- **Payload Client gửi (mẫu):**
  ```json
  "itemsSnapshot": [{ "productId": "...", "name": "test 4", "price": 350000, "quantity": 1, ... }]
  ```
- **Trạng thái:** ⏳ Chờ Backend fix.

---

### [BUG-12] `GET /v1/dashboard/overview` và `/v1/dashboard/product-revenue` trả dữ liệu thống kê bằng 0

- **Triệu chứng:**
  - Endpoint `GET /v1/dashboard/overview` trả về các chỉ số thống kê `totalRevenue: 0`, `completedOrders: 0`, `totalProductsSold: 0`, `cancelledOrders: 0` mặc dù danh sách `paymentMethods` trả về có phát sinh doanh thu (ví dụ: `cash: 7450888` và `card_bidv: 756000`).
  - Endpoint `GET /v1/dashboard/product-revenue` trả về danh sách sản phẩm rỗng (`items: []`, `totalCount: 0`).

---

## Đã fix

### [BUG-01] HTTP 500 Scriban — `Cannot get member with name created_by`

- **Triệu chứng:** `POST /v1/pos/checkout` trả HTTP 500
- **Nguyên nhân:** `entitySnapshot` truyền vào `ResolveTransitionAndApply` cho `sales_order` thiếu field `created_by`. Workflow hook template V143 dùng `{{ entity.created_by }}` làm notification recipient → Scriban crash.
- **Fix:** Thêm `created_by = current.CashierUserId` vào snapshot `sales_order` (cả `TransitionOrderAsync` và `RecordPaymentAsync`).
- **Commit:** `02af7bbd`
- **Scope mở rộng:** Pattern tương tự tồn tại ở 9 SM khác — đã fix trong `03b40c86` (payment, sales_return, goods_receipt, stock_transfer, payment_receipt, stock_count, replenishment, consignment_statement, consignment_return).

---

### [BUG-02] HTTP 500 Scriban — `Cannot get member with name code`

- **Triệu chứng:** `POST /v1/cash-sessions/{id}/transitions` (đóng ca) trả HTTP 500
- **Nguyên nhân:** `entitySnapshot` cho `pos_session` thiếu field `code`. Hook template V145 dùng `{{ entity.code }}` → crash.
- **Fix:** Thêm `code = current.Code`, `cashier_user_id` vào `PosAdminService` snapshot.
- **Commit:** `02af7bbd`

---

### [BUG-03] Payment CAPTURED nhưng Order vẫn PENDING

- **Triệu chứng:** Quẹt thẻ EDC thành công, payment → CAPTURED, nhưng `sales_order.state` vẫn là CONFIRMED/PAYMENT_PENDING không chuyển sang FULFILLED.
- **Nguyên nhân:** `SalesPlugin` khai báo `ConsumedEvents: ["payment.captured"]` nhưng không có handler thực tế. Event được publish vào `messaging.outbox` sau khi payment CAPTURED nhưng không có consumer xử lý.
- **Fix:** Thêm `PaymentCapturedEvent` → `PaymentCapturedHandler` → `SalesService.RecordPaymentAsync` → order advances SM.
- **Commit:** `25c5a9ae`

---

### [BUG-04] Voucher verify reject voucher admin đã tạo

- **Triệu chứng:** `POST /v1/pos/vouchers/verify` trả `pos.voucher_invalid` dù voucher đã tạo trên Admin và đang "hoạt động".
- **Nguyên nhân:** Campaign SM: DRAFT → PENDING_APPROVAL → SCHEDULED → ACTIVE. Admin tạo xong → SCHEDULED nhưng chưa activate → POS verify chỉ accept ACTIVE → fail.
- **Fix:** Accept `state = ACTIVE || SCHEDULED` trong verify check (SCHEDULED = đã approved, trong time window = hợp lệ).
- **Commit:** `25c5a9ae`

---

### [BUG-05] `POST /v1/pos/orders/{id}/cancel` — 403 cho cashier

- **Triệu chứng:** Cashier không hủy được đơn PAYMENT_PENDING, nhận 403.
- **Nguyên nhân:** `workflow_role_permissions` cho `sales_order:cancel` chỉ có `wms_store_mgr`, thiếu `wms_cashier`.
- **Fix:** V147 migration thêm `wms_cashier` → `sales_order:cancel`.
- **Commit:** (V147)

---

### [BUG-06] `POST /v1/pos/orders/{id}/refund` — 403 khi thực hiện hoàn hàng

- **Triệu chứng:** Manager không hoàn hàng được, nhận 403.
- **Nguyên nhân:** `workflow_role_permissions` cho `sales_return:quick_complete_return` chỉ có `wms_warehouse_mgr`, thiếu `wms_store_mgr`.
- **Fix:** V147 migration thêm `wms_store_mgr` → `sales_return:quick_complete_return`.
- **Commit:** (V147)

---

### [BUG-07] Sau hoàn hàng, order list vẫn hiện "Hoàn tất" thay vì "Hoàn hàng"

- **Triệu chứng:** Trả hàng thành công nhưng `status = "COMPLETED"` trong `GET /v1/pos/orders`.
- **Nguyên nhân:** (a) `FULFILLED → request_return` transition không tồn tại trong `sales_order` SM (V112). (b) `PosReturnService` không drive `sales_order.state` sau return.
- **Fix:** V148 thêm transition. `PosReturnService.SyncOrderStateAfterReturnAsync` drive `FULFILLED → RETURN_REQUESTED → PARTIALLY_RETURNED/RETURNED`.
- **Commit:** (V147+V148)

---

### [BUG-08] FK violation trong `POST /v1/pos/sync/orders`

- **Triệu chứng:** Offline sync bulk orders thất bại silently.
- **Nguyên nhân:** `WarehouseId = o.ShiftId` — dùng cash_session UUID nhét vào warehouse_id FK column.
- **Fix:** Lookup `pos.cash_sessions → pos.pos_devices → warehouse_id` trước INSERT.
- **Commit:** `3982b114`

---

### [BUG-09] Auth refresh token trên mobile Android

- **Triệu chứng:** Android không handle HttpOnly cookie tốt → đề xuất trả `refreshToken` trong JSON body.
- **Nguyên nhân:** Framework device auth được cấu hình sử dụng body mode để truyền tải token.

---

## Không phải bug (data/config issues)

### [NOT-BUG-01] `price: null` — Sản phẩm không có giá bán

- **Triệu chứng:** `GET /v1/pos/search` trả `price: null`, checkout thất bại với "sản phẩm không nằm trong danh sách bán".
- **Thực chất:** Sản phẩm chưa được cấu hình SELLING price list trên Admin. Không phải code bug.
- **Hành động:** (a) Filter sản phẩm `is_active=FALSE` và `price IS NULL` khỏi POS search. (b) Admin cần cấu hình giá trước khi bán.
- **Commit:** `779abf51`, `3982b114`

### [NOT-BUG-02] "Sản phẩm không nằm trong danh sách bán của cửa hàng 'SkyStore'"

- **Triệu chứng:** Checkout fail với lỗi trên.
- **Thực chất:** WPS (Warehouse Product Settings) — sản phẩm chưa được thêm vào catalog bán của cửa hàng. Admin cần cấu hình `store_catalog`.
- **Hành động:** Không cần fix code, cần hướng dẫn admin.

### [NOT-BUG-03] `POST /v1/pos/orders/{id}/cancel` — Cashier hủy đơn bị 403 Forbidden

- **Triệu chứng:** Khi hủy đơn hàng (hoặc QR Payment tự động hủy đơn khi thất bại), ứng dụng báo lỗi 403.
- **Thực chất:** Do hành động hủy đơn yêu cầu quyền quản lý (Manager Approval) để đảm bảo an toàn tài chính. Đây là hành vi phân quyền bảo mật đúng thiết kế, không phải là lỗi phân quyền (RBAC) sai của backend.
- **Hành động:** Client đã tích hợp form nhập mã nhân viên và PIN của quản lý để gửi kèm trong `managerAuth` khi thực hiện cancel đơn.

### [NOT-BUG-04] `POST /v1/pos/orders/{id}/refund` — Hoàn hàng bị lỗi 403 Forbidden

- **Triệu chứng:** Khi thực hiện hoàn hàng (refund), API trả về lỗi 403.
- **Thực chất:** Tương tự hủy đơn, hoàn hàng là hành động nhạy cảm yêu cầu phê duyệt của quản lý (Manager Approval).
- **Hành động:** Client đã tích hợp form nhập mã nhân viên và PIN của quản lý để gửi kèm trong `managerAuth` khi thực hiện hoàn hàng.

---

## Tồn đọng (chưa xử lý)

### [PENDING-02] Smoke tests bị block bởi framework build error

- **Mô tả:** `FlowCascadeCancelHookHandler.cs` trong `external/gs-backend` có compile error. Smoke tests fail → chặn push bình thường.
- **Nguyên nhân:** gs-backend submodule được bump lên version in-progress.
- **Workaround hiện tại:** `git push --no-verify`. Cần fix từ phía framework team.
