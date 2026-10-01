# Danh mục Tài liệu Đặc tả Kỹ thuật (Technical Specs Index)

Hệ thống **Mobile POS Bán hàng Lưu niệm — Bitexco SkyStore (`Souvenir.Bitexco`)**

---

## 📚 Danh sách Đặc tả Nghiệp vụ Hệ thống (System Business Specs)

| Mã Spec                                                  | Tên Tài liệu Đặc tả                                    | Trách nhiệm Nghiệp vụ                                                        | Mô-đun phụ trách                                 |
| :------------------------------------------------------- | :----------------------------------------------------- | :--------------------------------------------------------------------------- | :----------------------------------------------- |
| **[SPEC-0001](./0001-pos-checkout-sales.md)**            | Bán hàng, Giỏ hàng & Thanh toán Đa phương thức         | Quét mã, quản lý giỏ hàng, áp voucher, thanh toán Tiền mặt / QR / Thẻ EDC    | `src/features/pos`, `src/features/payment`       |
| **[SPEC-0002](./0002-order-refund-exchange.md)**         | Quản lý Đơn hàng, Trả hàng & Đổi hàng mới              | Lịch sử đơn hàng, in lại hóa đơn, trả hàng hoàn tiền, đổi hàng ngang giá     | `src/features/order`                             |
| **[SPEC-0003](./0003-cash-session-shift.md)**            | Quản lý Ca làm việc (Mở ca, Kết ca & Z-Report)         | Mở ca tiền mặt, OCC 3 bước kết ca, kiểm đếm tiền & in phiếu Z-Report         | `src/features/shift`, `src/features/dashboard`   |
| **[SPEC-0004](./0004-offline-sync-engine.md)**           | Động cơ Lưu trữ Cục bộ & Đồng bộ Ngoại tuyến           | SQLite Outbox Pattern, bán hàng khi mất mạng & tự động sync khi có mạng      | `src/shared/lib/database`, `src/core/pos-engine` |
| **[SPEC-0005](./0005-hardware-hal-printer.md)**          | Trừu tượng hóa Phần cứng (HAL iMin D4)                 | Driver máy in nhiệt 80mm, xung mở két tiền RJ11 & Màn hình phụ Vice Screen   | `src/core/hardware`                              |
| **[SPEC-0006](./0006-auth-device-activation.md)**        | Kích hoạt Thiết bị, Xác thực Nhân viên & Quản lý Phiên | Kích hoạt máy POS, đăng nhập thu ngân, Token rotation (ADR-0022) & RBAC      | `src/features/auth`                              |
| **[SPEC-0007](./0007-product-catalog-sync.md)**          | Danh mục Sản phẩm, Tìm kiếm Nhanh & Đồng bộ Delta      | Đồng bộ biến động Delta Sync, WatermelonDB SQLite index, quét Barcode < 10ms | `src/features/product`                           |
| **[SPEC-0008](./0008-customer-partner-invoice.md)**      | Quản lý Khách hàng, Đối tác & Hóa đơn Điện tử VAT      | Gắn đối tác tiếp thị/tour guide & thu thập thông tin xuất HĐĐT VAT           | `src/features/partner`, `src/features/order`     |
| **[SPEC-0009](./0009-dashboard-realtime-monitoring.md)** | Bảng điều khiển Thời gian thực & Giám sát Quầy         | Thống kê doanh thu ca, cơ cấu thanh toán, top món bán chạy & InfoBar         | `src/features/dashboard`                         |
| **[SPEC-0010](./0010-combo-promotions.md)**              | Quản lý Combo & Khuyến mãi Đóng gói                    | Cấu hình combo cố định / tùy chọn, phân bổ VAT & trừ kho linh kiện con       | `src/features/pos`, `src/core/pos-engine`        |
| **[SPEC-0011](./0011-manager-override-security.md)**     | Cơ chế Phê duyệt Quản lý & Bảo mật Thao tác Quầy       | Đánh chặn lỗi 403, modal nhập PIN quản lý (hủy đơn, hoàn tiền, chênh lệch)   | `src/features/order`, `src/features/auth`        |

---

## 🏛️ Danh mục Mô-đun Mã nguồn (Module READMEs)

- [`src/features/pos/README.md`](../../src/features/pos/README.md) — Bán hàng & Giỏ hàng
- [`src/features/order/README.md`](../../src/features/order/README.md) — Quản lý Đơn hàng & Đổi/Trả
- [`src/features/shift/README.md`](../../src/features/shift/README.md) — Quản lý Phiên Ca & Báo cáo Z
- [`src/features/auth/README.md`](../../src/features/auth/README.md) — Xác thực & Phân quyền
- [`src/features/product/README.md`](../../src/features/product/README.md) — Danh mục & Delta Sync
- [`src/features/payment/README.md`](../../src/features/payment/README.md) — Thanh toán Đa phương thức
- [`src/features/partner/README.md`](../../src/features/partner/README.md) — Đối tác Lữ hành & Hóa đơn VAT
- [`src/features/dashboard/README.md`](../../src/features/dashboard/README.md) — Thống kê & Info Bar
- [`src/core/hardware/README.md`](../../src/core/hardware/README.md) — HAL Phần cứng (iMin D4)
- [`src/core/pos-engine/README.md`](../../src/core/pos-engine/README.md) — Động cơ Tính toán Giỏ hàng
- [`src/core/payment-engine/README.md`](../../src/core/payment-engine/README.md) — Động cơ Trạng thái Thanh toán
