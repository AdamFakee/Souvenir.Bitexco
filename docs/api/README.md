# Tài liệu API POS System

Tất cả các API trong hệ thống đều sử dụng cấu trúc đồng nhất để đảm bảo tính nhất quán giữa Front-end và Backend.

## Cấu trúc Response chung (IBaseResponse)

Mọi phản hồi từ Server đều được bọc trong một "Envelope JSON":

```json
{
  "success": true,
  "status_code": 200,
  "message": "Thông báo thành công/thất bại",
  "data": null,
  "meta": {
    "timestamp": 1715137347000
  },
  "error": null
}
```

---

## Kiến trúc Sync

Mỗi feature có chiến lược sync khác nhau:

| Feature      | Pull (server → client) | Push (client → server) | Ghi chú                              |
| :----------- | :--------------------: | :--------------------: | :----------------------------------- |
| **Product**  |           ✅           |           ❌           | Backend quản lý, client chỉ đọc      |
| **Category** |           ✅           |           ❌           | Backend quản lý, client chỉ đọc      |
| **Order**    |           ❌           |           ✅           | Client tạo offline, push khi có mạng |
| **Staff**    |           ❌           |           ❌           | Remote-Only: Login qua API           |
| **Shift**    |           ❌           |           ❌           | Remote-Only: Open/Close qua API      |

### Cấu trúc gói tin Pull (Product & Category)

- **Request**: `GET /api/v1/sync/<feature>?last_pulled_at=<timestamp>`
- **Response `data`**:

```json
{
  "table_name": {
    "created": [],
    "updated": [],
    "deleted": []
  }
}
```

### Cấu trúc gói tin Push (Order)

- **Request**: `POST /api/v1/sync/orders`
- **Body**:

```json
{
  "changes": {
    "orders": {
      "created": [],
      "updated": [],
      "deleted": []
    }
  },
  "last_pulled_at": 1715137347000
}
```

---

## Danh mục API theo Feature

- [Order — Push Only](order.md)
- [QR Payment Flow (Online)](payment.md)
- [Product & Catalog — Pull Only](product.md)
- [Category — Pull Only](category.md)
- [Shift Management — Remote Only](shift.md)
- [Staff / Auth — Remote Only](staff.md)
- [Voucher Verification (Online)](voucher.md)
