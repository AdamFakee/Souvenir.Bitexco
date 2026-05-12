# Product API

Tài liệu chi tiết về cấu trúc dữ liệu và các Endpoint đồng bộ cho Sản phẩm.

## 1. Data Interface (Schema)

### ProductRaw (Bảng products)

Cấu trúc dữ liệu Sản phẩm khớp chính xác với `ProductRaw` interface.

| Trường        | Kiểu dữ liệu | Bắt buộc | Mô tả                |
| :------------ | :----------- | :------: | :------------------- |
| `id`          | string       |    Có    | UUID của sản phẩm    |
| `category_id` | string       |    Có    | UUID danh mục        |
| `sku`         | string       |    Có    | Mã SKU sản phẩm      |
| `name_en`     | string       |    Có    | Tên tiếng Anh        |
| `name_vi`     | string       |    Có    | Tên tiếng Việt       |
| `unit`        | string       |    Có    | Đơn vị tính          |
| `price`       | number       |    Có    | Giá bán              |
| `tax_rate`    | number       |    Có    | Thuế suất            |
| `cost_price`  | number       |    Có    | Giá vốn              |
| `stock`       | number       |    Có    | Số lượng tồn kho     |
| `image`       | string       |  Không   | URL hình ảnh         |
| `supplier`    | string       |    Có    | Nhà cung cấp         |
| `is_active`   | boolean      |    Có    | Trạng thái hoạt động |
| `is_deleted`  | boolean      |    Có    | Cờ xóa               |
| `created_at`  | number       |  Không   | Unix timestamp       |
| `updated_at`  | number       |  Không   | Unix timestamp       |

---

## 2. API Endpoints

### 2.1 Fetch Changes (Pull)

Lấy danh sách sản phẩm mới hoặc có thay đổi từ Server về Local.

- **Method**: `GET`
- **Path**: `/api/v1/sync/products`

#### Request Query Parameters

| Tham số          | Kiểu dữ liệu | Bắt buộc | Mô tả                                            |
| :--------------- | :----------- | :------: | :----------------------------------------------- |
| `last_pulled_at` | number       |  Không   | Unix timestamp (ms) lần cuối đồng bộ thành công. |

#### Response Data (`IBaseResponse<ProductSyncChanges>`)

Dữ liệu nằm trong trường `data`:

| Trường     | Kiểu dữ liệu                                                          | Mô tả                          |
| :--------- | :-------------------------------------------------------------------- | :----------------------------- |
| `products` | `{ created: ProductRaw[], updated: ProductRaw[], deleted: string[] }` | Các thay đổi của bảng products |

**Ví dụ Response:**

```json
{
  "success": true,
  "status_code": 200,
  "message": "Fetch success",
  "data": {
    "products": {
      "created": [
        { "id": "p1", "name_vi": "Cà phê sữa", "price": 35000, "stock": 100, "is_active": true }
      ],
      "updated": [],
      "deleted": []
    }
  },
  "meta": { "timestamp": 1715137347 },
  "error": null
}
```

### 2.2 Push Changes (Push)

Đẩy dữ liệu sản phẩm thay đổi từ Local lên Server (Thường dùng để cập nhật tồn kho từ máy POS).

- **Method**: `POST`
- **Path**: `/api/v1/sync/products`

#### Request Body (`PushChangesParams`)

| Trường             | Kiểu dữ liệu                                                          | Bắt buộc | Mô tả                                              |
| :----------------- | :-------------------------------------------------------------------- | :------: | :------------------------------------------------- |
| `changes`          | object                                                                |    Có    | Đối tượng chứa các thay đổi (`ProductSyncChanges`) |
| `changes.products` | `{ created: ProductRaw[], updated: ProductRaw[], deleted: string[] }` |    Có    | Các thay đổi của bảng products                     |
| `last_pulled_at`   | number                                                                |    Có    | Thời điểm Client thực hiện Pull trước khi Push     |
