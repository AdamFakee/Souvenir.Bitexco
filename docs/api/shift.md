# Shift API

Tài liệu chi tiết về cấu trúc dữ liệu và các Endpoint đồng bộ cho Ca làm việc.

## 1. Data Interface (Schema)

### ShiftRaw (Bảng shifts)

Cấu trúc dữ liệu Ca làm việc khớp chính xác với `ShiftRaw` interface.

| Trường                 | Kiểu dữ liệu | Bắt buộc | Mô tả                           |
| :--------------------- | :----------- | :------: | :------------------------------ |
| `id`                   | string       |    Có    | UUID ca làm việc                |
| `staff_id`             | string       |    Có    | UUID nhân viên                  |
| `device_id`            | string       |    Có    | UUID thiết bị                   |
| `start_time`           | number       |    Có    | Thời gian mở (Unix timestamp)   |
| `end_time`             | number       |  Không   | Thời gian đóng (Unix timestamp) |
| `starting_cash`        | number       |    Có    | Tiền mặt đầu ca                 |
| `expected_ending_cash` | number       |    Có    | Tiền mặt dự kiến                |
| `actual_ending_cash`   | number       |  Không   | Tiền mặt thực tế                |
| `difference_cash`      | number       |  Không   | Tiền chênh lệch                 |
| `discrepancy_reason`   | string       |  Không   | Lý do chênh lệch                |
| `cash_revenue`         | number       |    Có    | Doanh thu tiền mặt              |
| `qr_revenue`           | number       |    Có    | Doanh thu QR                    |
| `total_orders`         | number       |    Có    | Tổng số đơn hàng                |
| `status`               | ShiftStatus  |    Có    | `OPEN`, `CLOSED`                |
| `is_deleted`           | boolean      |    Có    | Cờ xóa                          |
| `created_at`           | number       |  Không   | Unix timestamp                  |
| `updated_at`           | number       |  Không   | Unix timestamp                  |

---

## 2. API Endpoints

### 2.1 Fetch Changes (Pull)

Lấy danh sách các ca làm việc mới hoặc có thay đổi từ Server về Local.

- **Method**: `GET`
- **Path**: `/api/v1/sync/shifts`

#### Request Query Parameters

| Tham số          | Kiểu dữ liệu | Bắt buộc | Mô tả                                            |
| :--------------- | :----------- | :------: | :----------------------------------------------- |
| `last_pulled_at` | number       |  Không   | Unix timestamp (ms) lần cuối đồng bộ thành công. |

#### Response Data (`IBaseResponse<ShiftSyncChanges>`)

Dữ liệu nằm trong trường `data`:

| Trường   | Kiểu dữ liệu                                                      | Mô tả                        |
| :------- | :---------------------------------------------------------------- | :--------------------------- |
| `shifts` | `{ created: ShiftRaw[], updated: ShiftRaw[], deleted: string[] }` | Các thay đổi của bảng shifts |

**Ví dụ Response:**

```json
{
  "success": true,
  "status_code": 200,
  "message": "Fetch success",
  "data": {
    "shifts": {
      "created": [{ "id": "s1", "staff_id": "u1", "status": "OPEN", "start_time": 1715137347 }],
      "updated": [],
      "deleted": []
    }
  },
  "meta": { "timestamp": 1715137347 },
  "error": null
}
```

### 2.2 Push Changes (Push)

Đẩy dữ liệu ca làm việc (mở ca, đóng ca) từ Local lên Server.

- **Method**: `POST`
- **Path**: `/api/v1/sync/shifts`

#### Request Body (`PushChangesParams`)

| Trường           | Kiểu dữ liệu                                                      | Bắt buộc | Mô tả                                            |
| :--------------- | :---------------------------------------------------------------- | :------: | :----------------------------------------------- |
| `changes`        | object                                                            |    Có    | Đối tượng chứa các thay đổi (`ShiftSyncChanges`) |
| `changes.shifts` | `{ created: ShiftRaw[], updated: ShiftRaw[], deleted: string[] }` |    Có    | Các thay đổi của bảng shifts                     |
| `last_pulled_at` | number                                                            |    Có    | Thời điểm Client thực hiện Pull trước khi Push   |
