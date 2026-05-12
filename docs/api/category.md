# Category API

Tài liệu chi tiết về cấu trúc dữ liệu và các Endpoint đồng bộ cho Danh mục.

## 1. Data Interface (Schema)

### CategoryRaw (Bảng categories)

Cấu trúc dữ liệu Danh mục khớp chính xác với `CategoryRaw` interface.

| Trường          | Kiểu dữ liệu | Bắt buộc | Mô tả           |
| :-------------- | :----------- | :------: | :-------------- |
| `id`            | string       |    Có    | UUID danh mục   |
| `name`          | string       |    Có    | Tên danh mục    |
| `color`         | string       |  Không   | Mã màu Hex      |
| `display_order` | number       |    Có    | Thứ tự hiển thị |
| `is_deleted`    | boolean      |    Có    | Cờ xóa          |
| `created_at`    | number       |  Không   | Unix timestamp  |
| `updated_at`    | number       |  Không   | Unix timestamp  |

---

## 2. API Endpoints

### 2.1 Fetch Changes (Pull)

Lấy danh sách danh mục mới hoặc có thay đổi từ Server về Local.

- **Method**: `GET`
- **Path**: `/api/v1/sync/categories`

#### Request Query Parameters

| Tham số          | Kiểu dữ liệu | Bắt buộc | Mô tả                                            |
| :--------------- | :----------- | :------: | :----------------------------------------------- |
| `last_pulled_at` | number       |  Không   | Unix timestamp (ms) lần cuối đồng bộ thành công. |

#### Response Data (`IBaseResponse<CategorySyncChanges>`)

Dữ liệu nằm trong trường `data`:

| Trường               | Kiểu dữ liệu  | Mô tả                                             |
| :------------------- | :------------ | :------------------------------------------------ |
| `categories`         | object        | Object chứa các thay đổi của bảng categories      |
| `categories.created` | CategoryRaw[] | Mảng các danh mục mới được tạo trên Server        |
| `categories.updated` | CategoryRaw[] | Mảng các danh mục đã được cập nhật trên Server    |
| `categories.deleted` | string[]      | Mảng các ID (UUID) danh mục đã bị xóa trên Server |

**Ví dụ Response:**

```json
{
  "success": true,
  "status_code": 200,
  "message": "Fetch success",
  "data": {
    "categories": {
      "created": [{ "id": "c1", "name": "Đồ uống", "color": "#FF0000", "display_order": 1 }],
      "updated": [],
      "deleted": []
    }
  },
  "meta": { "timestamp": 1715137347 },
  "error": null
}
```

### 2.2 Push Changes (Push)

_Ghi chú: Danh mục hiện là Read-only trên Client._
