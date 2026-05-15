# Staff API

Tài liệu về các Endpoint xác thực và quản lý Nhân viên.

> **Lưu ý kiến trúc**: Nhân viên hoạt động theo mô hình **Remote-Only** — không lưu local, không sync qua WatermelonDB.  
> Thông tin nhân viên sau khi đăng nhập được giữ trong bộ nhớ tạm (Zustand Store) cho đến khi đăng xuất.

---

## 1. Data Interface

### Staff

| Trường      | Kiểu dữ liệu | Bắt buộc | Mô tả                         |
| :---------- | :----------- | :------: | :---------------------------- |
| `id`        | string       |    Có    | UUID nhân viên                |
| `username`  | string       |    Có    | Tên đăng nhập                 |
| `fullname`  | string       |    Có    | Họ và tên                     |
| `role`      | StaffRole    |    Có    | `ADMIN`, `MANAGER`, `CASHIER` |
| `password`  | string       |    Có    | Mật khẩu (đã hash)            |
| `isActive`  | boolean      |    Có    | Trạng thái hoạt động          |
| `isDeleted` | boolean      |    Có    | Cờ xóa                        |

### AuthTokens

| Trường         | Kiểu dữ liệu | Mô tả                                  |
| :------------- | :----------- | :------------------------------------- |
| `accessToken`  | string       | JWT dùng cho các request sau đăng nhập |
| `refreshToken` | string       | Token dùng để làm mới accessToken      |

---

## 2. API Endpoints

### 2.1 Đăng nhập — Login

- **Method**: `POST`
- **Path**: `/api/v1/auth/login`

#### Request Body (`LoginPayload`)

| Trường     | Kiểu dữ liệu | Bắt buộc | Mô tả         |
| :--------- | :----------- | :------: | :------------ |
| `username` | string       |    Có    | Tên đăng nhập |
| `password` | string       |    Có    | Mật khẩu      |

#### Response (`IBaseResponse<LoginResponse>`)

```json
{
  "success": true,
  "status_code": 200,
  "message": "Đăng nhập thành công",
  "data": {
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ..."
    },
    "staff": {
      "id": "staff-uuid",
      "username": "cashier01",
      "fullname": "Nguyễn Văn A",
      "role": "CASHIER",
      "isActive": true,
      "isDeleted": false
    },
    "currentShiftId": null
  },
  "meta": { "timestamp": 1715137347000 },
  "error": null
}
```

> `currentShiftId` sẽ có giá trị nếu backend xác nhận nhân viên đang trong ca còn mở.

---

### 2.2 Làm mới Token — Refresh Token

- **Method**: `POST`
- **Path**: `/api/v1/auth/refresh`

#### Request Body (`RefreshTokenPayload`)

| Trường         | Kiểu dữ liệu | Bắt buộc | Mô tả         |
| :------------- | :----------- | :------: | :------------ |
| `refreshToken` | string       |    Có    | Token làm mới |

#### Response (`IBaseResponse<AuthTokens>`)

```json
{
  "success": true,
  "status_code": 200,
  "message": "Làm mới token thành công",
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  },
  "meta": { "timestamp": 1715137347000 },
  "error": null
}
```
