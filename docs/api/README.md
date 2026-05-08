# Tài liệu API POS System

Tất cả các API trong hệ thống đều sử dụng cấu trúc đồng nhất để đảm bảo tính nhất quán giữa Front-end và Backend.

## Cấu trúc Response chung (IBaseResponse)

Mọi phản hồi từ Server đều được bọc trong một "Envelope JSON":

```json
{
  "success": true,
  "status_code": 200,
  "message": "Thông báo thành công/thất bại",
  "data": null, // Dữ liệu trả về (Object hoặc Array)
  "meta": {
    "timestamp": 1715137347 // Unix timestamp tại server
  },
  "error": null // Chi tiết lỗi nếu success = false
}
```

## Cấu trúc Gói tin Đồng bộ (Sync Packets)

Tất cả các API Sync (Pull/Push) đều tuân theo cấu trúc của WatermelonDB Sync Protocol.

### 1. Pull Changes (Lấy dữ liệu từ Server)

Dùng để lấy các thay đổi của một hoặc nhiều bảng kể từ thời điểm `last_pulled_at`.

- **Response (`data` field)**: Trả về Object chứa danh sách thay đổi của các bảng (Table Schema).

```json
{
  "success": true,
  "data": {
    "table_name_1": {
      "created": [], // Mảng các bản ghi mới
      "updated": [], // Mảng các bản ghi đã sửa
      "deleted": []  // Mảng các ID (string) đã xóa
    },
    "table_name_2": { ... }
  },
  "meta": {
    "timestamp": 1715137347 // Dùng làm last_pulled_at cho lần Pull sau
  }
}
```

### 2. Push Changes (Đẩy dữ liệu lên Server)

Dùng để đẩy các thay đổi từ Local lên Server.

- **Request Body**:

```json
{
  "changes": {
    "table_name_1": {
      "created": [],
      "updated": [],
      "deleted": []
    },
    "table_name_2": { ... }
  },
  "last_pulled_at": 1715137347
}
```

## Danh mục API theo Feature

- [Order & Payments Sync](order.md)
- [QR Payment Flow (Online)](payment.md)
- [Product & Catalog](product.md)
- [Category](category.md)
- [Shift Management](shift.md)
- [Staff Management](staff.md)
- [Voucher Verification (Online)](voucher.md)
