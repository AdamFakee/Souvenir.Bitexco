# Shift API

Tài liệu về các Endpoint quản lý Ca làm việc.

> **Lưu ý kiến trúc**: Ca làm việc hoạt động theo mô hình **Remote-Only** — không lưu local, không sync qua WatermelonDB.  
> Thông tin phiên làm việc sau khi mở ca được giữ trong bộ nhớ tạm (Zustand Store) cho đến khi đóng ca.

---

## 2. API Endpoints

### 2.1 Mở ca — Open Shift

- **Method**: `POST`
- **Path**: `/api/v1/shifts/open`

#### Request Body

| Trường         | Kiểu dữ liệu | Bắt buộc | Mô tả                    |
| :------------- | :----------- | :------: | :----------------------- |
| `staffId`      | string       |    Có    | UUID nhân viên đăng nhập |
| `startingCash` | number       |    Có    | Số tiền mặt đầu ca       |
| `deviceId`     | string       |  Không   | UUID thiết bị (gắn sau)  |

#### Response (`IBaseResponse<{ shiftId: string }>`)

```json
{
  "success": true,
  "status_code": 200,
  "message": "Mở ca thành công",
  "data": {
    "shiftId": "shift-uuid"
  },
  "meta": { "timestamp": 1715137347000 },
  "error": null
}
```

> Client chỉ cần lưu `shiftId` vào session store. Không cần thông tin nào khác.

---

### 2.2 Lấy thống kê ca — Get Shift Statistics

Dùng để lấy số tiền mặt dự kiến trước khi đóng ca (để thu ngân đối soát).

- **Method**: `GET`
- **Path**: `/api/v1/shifts/:shiftId/statistics`

#### Response (`IBaseResponse<ShiftStatistics>`)

| Trường               | Kiểu dữ liệu | Mô tả                                          |
| :------------------- | :----------- | :--------------------------------------------- |
| `expectedEndingCash` | number       | Tổng tiền mặt dự kiến cuối ca (tính từ server) |

```json
{
  "success": true,
  "status_code": 200,
  "message": "Lấy số tiền dự kiến thành công",
  "data": {
    "expectedEndingCash": 1750000
  },
  "meta": { "timestamp": 1715137347000 },
  "error": null
}
```

---

### 2.3 Đóng ca — Close Shift

- **Method**: `POST`
- **Path**: `/api/v1/shifts/close`

#### Request Body

| Trường              | Kiểu dữ liệu | Bắt buộc | Mô tả                         |
| :------------------ | :----------- | :------: | :---------------------------- |
| `shiftId`           | string       |    Có    | UUID ca cần đóng              |
| `actualEndingCash`  | number       |    Có    | Tiền mặt thực tế thu ngân đếm |
| `discrepancyReason` | string       |  Không   | Lý do nếu có chênh lệch       |

#### Response (`IBaseResponse<null>`)

```json
{
  "success": true,
  "status_code": 200,
  "message": "Đóng ca thành công",
  "data": null,
  "meta": { "timestamp": 1715180000000 },
  "error": null
}
```
