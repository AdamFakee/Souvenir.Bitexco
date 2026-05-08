# Staff API

Tài liệu chi tiết về cấu trúc dữ liệu và các Endpoint đồng bộ cho Nhân viên.

## 1. Data Interface (Schema)

### Staff (Bảng staff)

Cấu trúc dữ liệu Nhân viên khớp chính xác với `StaffModel` và Schema.

| Trường       | Kiểu dữ liệu | Bắt buộc | Mô tả                         |
| :----------- | :----------- | :------: | :---------------------------- |
| `id`         | string       |    Có    | UUID nhân viên                |
| `username`   | string       |    Có    | Tên đăng nhập                 |
| `fullname`   | string       |    Có    | Họ và tên                     |
| `role`       | StaffRole    |    Có    | `ADMIN`, `MANAGER`, `CASHIER` |
| `password`   | string       |    Có    | Mật khẩu (đã hash)            |
| `is_active`  | boolean      |    Có    | Trạng thái hoạt động          |
| `is_deleted` | boolean      |    Có    | Cờ xóa                        |
| `created_at` | number       |    Có    | Unix timestamp                |
| `updated_at` | number       |    Có    | Unix timestamp                |

---

## 2. API Endpoints

### 2.1 Fetch Changes (Pull)

Lấy danh sách nhân viên mới hoặc có thay đổi từ Server về Local.

- **Method**: `GET`
- **Path**: `/api/v1/sync/staff`

#### Request Query Parameters

| Tham số          | Kiểu dữ liệu | Bắt buộc | Mô tả                                            |
| :--------------- | :----------- | :------: | :----------------------------------------------- |
| `last_pulled_at` | number       |  Không   | Unix timestamp (ms) lần cuối đồng bộ thành công. |

#### Response Data (`IBaseResponse<StaffSyncChanges>`)

Dữ liệu nằm trong trường `data`:

| Trường  | Kiểu dữ liệu                                                      | Mô tả                       |
| :------ | :---------------------------------------------------------------- | :-------------------------- |
| `staff` | `{ created: StaffRaw[], updated: StaffRaw[], deleted: string[] }` | Các thay đổi của bảng staff |

**Ví dụ Response:**

```json
{
  "success": true,
  "status_code": 200,
  "message": "Fetch success",
  "data": {
    "staff": {
      "created": [
        { "id": "u1", "username": "admin", "fullname": "Admin", "role": "ADMIN", "is_active": true }
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

Đẩy dữ liệu nhân viên thay đổi từ Local lên Server (Thường là Read-only trên Client).

- **Method**: `POST`
- **Path**: `/api/v1/sync/staff`

#### Request Body (`PushChangesParams`)

| Trường           | Kiểu dữ liệu                                                      | Bắt buộc | Mô tả                                            |
| :--------------- | :---------------------------------------------------------------- | :------: | :----------------------------------------------- |
| `changes`        | object                                                            |    Có    | Đối tượng chứa các thay đổi (`StaffSyncChanges`) |
| `changes.staff`  | `{ created: StaffRaw[], updated: StaffRaw[], deleted: string[] }` |    Có    | Các thay đổi của bảng staff                      |
| `last_pulled_at` | number                                                            |    Có    | Thời điểm Client thực hiện Pull trước khi Push   |

### 2.3 Get All Staffs

Lấy toàn bộ danh sách nhân viên (thường dùng cho lần đầu khởi tạo ứng dụng).

- **Method**: `GET`
- **Path**: `/api/v1/staffs/all`

#### Response Structure (`IBaseResponse<StaffRaw[]>`)

| Trường | Kiểu dữ liệu | Mô tả                       |
| :----- | :----------- | :-------------------------- |
| `data` | `StaffRaw[]` | Danh sách toàn bộ nhân viên |
