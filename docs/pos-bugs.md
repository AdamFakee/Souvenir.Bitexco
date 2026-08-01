## 9. Lỗi Backend không tự động trừ tồn kho của sản phẩm khi đồng bộ đơn hàng offline lên hệ thống (Backend does not deduct product stock when syncing offline orders)

- **Hành vi gặp lỗi (Real Behavior):**
  - Khi client POS đồng bộ thành công các đơn hàng được tạo lúc offline lên hệ thống thông qua API `POST /v1/pos/sync/orders` (đơn hàng hiển thị đầy đủ trên hệ thống Admin), backend không thực hiện trừ số lượng tồn kho (inventory/stock) của các sản phẩm tương ứng trong đơn hàng đó.

- **Kỳ vọng từ Backend (Expected Behavior):**
  - Khi nhận dữ liệu đồng bộ và lưu đơn hàng offline thành công qua API `POST /v1/pos/sync/orders`, backend cần tự động cập nhật trừ số lượng tồn kho tương ứng của các sản phẩm/variant nằm trong các đơn hàng này trên hệ thống.
