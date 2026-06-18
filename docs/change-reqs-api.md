# API POS — Yêu Cầu Bổ Sung Thiết Bị (Backend)

Tài liệu này lưu trữ các yêu cầu thay đổi/bổ sung phía API (Backend) phục vụ cho POS.

# Bổ sung yêu cầu: Cung cấp và lọc theo Trạng thái đơn hàng của Backend

Yêu cầu Backend cung cấp thông tin trạng thái chi tiết của đơn hàng và đồng bộ tham số lọc để Client gọi API chính xác.

## 1. Yêu cầu chi tiết

- **Trạng thái trả về (Response status):** API cần trả về chính xác chuỗi trạng thái đơn hàng (order status) được định nghĩa trên hệ thống Backend/Database thay vì ép Client tự map hoặc dùng enum `OrderStatus` giới hạn của Client.
- **Tham số lọc (Query parameter `status`):** Endpoint lấy danh sách đơn hàng `GET /v1/pos/orders` chỉ chấp nhận tham số `status` là các giá trị trạng thái thực tế do Backend định nghĩa (không query theo enum Client `OrderStatus` cũ gồm `PENDING`, `COMPLETED`, `REFUNDED`, `FAILED`).
- **Tài liệu bàn giao:** Backend cần cung cấp đầy đủ danh sách các status khả dụng và mô tả ý nghĩa chi tiết của từng status để FE đối chiếu hiển thị ( tài liệu yêu cầu thêm cả label cho từng status).
