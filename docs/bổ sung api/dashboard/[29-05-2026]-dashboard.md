# Dashboard & Reporting API

Tài liệu về các Endpoint phục vụ Báo cáo Doanh thu, Thống kê Hiệu suất Ca của máy POS.

> **Lưu ý kiến trúc**: Để tránh quá tải cho API chính (như Bán hàng / Checkout), các Endpoint báo cáo của Dashboard được thiết kế tách biệt và tối ưu hóa cho các lượt truy xuất không đồng bộ qua TanStack Query.
> Các API này bắt buộc truyền `shiftId` và hoạt động dưới cơ chế **Remote-Only** (không đồng bộ ngoại tuyến).

## 2. API Endpoints

### 2.1 Tổng quan ca làm việc — Dashboard Overview

Lấy tổng quan báo cáo doanh thu ca (Aggregate), số lượng đơn hàng, sản phẩm đã bán và cơ cấu hình thức thanh toán.

- **Method**: `GET`
- **Path**: `/api/v1/dashboard/overview`
- **Authentication**: `Authorization: Bearer <accessToken>`

#### Query Parameters

| Tham số   | Kiểu dữ liệu | Bắt buộc | Mô tả                         |
| :-------- | :----------- | :------: | :---------------------------- |
| `shiftId` | string       |    Có    | UUID ca làm việc cần thống kê |

#### Response (200 OK — Raw JSON)

##### Properties

| Trường              | Kiểu dữ liệu | Mô tả                                            |
| :------------------ | :----------- | :----------------------------------------------- |
| `employeeName`      | string       | Tên nhân viên thu ngân của ca                    |
| `employeeCode`      | string       | Mã số nhân viên                                  |
| `shiftTime`         | string       | Khung giờ ca làm việc (Ví dụ: `06:00-14:00`)     |
| `shiftStart`        | string       | Giờ vào ca thực tế (Ví dụ: `06:00`)              |
| `totalRevenue`      | number       | Tổng doanh thu của ca (VND)                      |
| `completedOrders`   | number       | Số đơn hàng hoàn tất                             |
| `totalProductsSold` | number       | Tổng số sản phẩm đã bán                          |
| `cancelledOrders`   | number       | Số đơn hàng đã huỷ                               |
| `paymentMethods`    | array        | Cơ cấu doanh thu theo các phương thức thanh toán |

##### `paymentMethods` Item Properties

| Trường  | Kiểu dữ liệu | Mô tả                                              |
| :------ | :----------- | :------------------------------------------------- |
| `name`  | string       | Tên phương thức thanh toán (Tiền mặt, QR, Thẻ,...) |
| `value` | number       | Số tiền thu được từ phương thức tương ứng (VND)    |

##### Example Response (200 OK)

```json
{
  "employeeName": "Quốc Hoàng",
  "employeeCode": "129129",
  "shiftTime": "06:00-14:00",
  "shiftStart": "06:00",
  "totalRevenue": 94507777000,
  "completedOrders": 120,
  "totalProductsSold": 249,
  "cancelledOrders": 12,
  "paymentMethods": [
    {
      "name": "Thẻ tín dụng",
      "value": 3450000
    },
    {
      "name": "Tiền mặt",
      "value": 3000000
    },
    {
      "name": "QR",
      "value": 3000000
    }
  ]
}
```

---

### 2.2 Doanh thu chi tiết theo sản phẩm — Product Revenue Report

Lấy danh sách các sản phẩm có phát sinh doanh thu trong ca, trả về dạng Paged List phục vụ Infinite Scroll tải cuộn mượt mà trên máy POS.

- **Method**: `GET`
- **Path**: `/api/v1/dashboard/product-revenue`
- **Authentication**: `Authorization: Bearer <accessToken>`

#### Query Parameters

| Tham số   | Kiểu dữ liệu | Bắt buộc | Mô tả                                                |
| :-------- | :----------- | :------: | :--------------------------------------------------- |
| `shiftId` | string       |    Có    | UUID ca làm việc cần thống kê                        |
| `page`    | number       |  Không   | Chỉ số trang cần lấy (Bắt đầu từ `0`, mặc định: `0`) |
| `limit`   | number       |  Không   | Số lượng sản phẩm trên mỗi trang (Mặc định: `10`)    |

#### Response (200 OK — Paged List JSON)

##### Properties

| Trường       | Kiểu dữ liệu | Mô tả                                        |
| :----------- | :----------- | :------------------------------------------- |
| `items`      | array        | Danh sách sản phẩm có phát sinh doanh thu    |
| `totalCount` | number       | Tổng số lượng sản phẩm có doanh thu trong ca |
| `page`       | number       | Chỉ số trang hiện tại                        |
| `pageSize`   | number       | Số lượng bản ghi tối đa mỗi trang            |

##### `items` (ProductRevenueItem) Properties

| Trường  | Kiểu dữ liệu | Mô tả                          |
| :------ | :----------- | :----------------------------- |
| `name`  | string       | Tên sản phẩm                   |
| `qty`   | number       | Số lượng bán ra trong ca       |
| `price` | number       | Đơn giá sản phẩm (VND)         |
| `total` | number       | Tổng tiền thu của sản phẩm này |

##### Example Response (200 OK)

```json
{
  "items": [
    {
      "name": "Cà phê sữa đá",
      "qty": 120,
      "price": 35000,
      "total": 4200000
    },
    {
      "name": "Trà đào cam sả",
      "qty": 75,
      "price": 40000,
      "total": 3000000
    }
  ],
  "totalCount": 20,
  "page": 0,
  "pageSize": 10
}
```

---

## 3. Quy tắc Tích hợp Front-end

### 3.1 Ràng buộc bắt buộc (Conditional Lock)

- Do các Endpoint này lấy dữ liệu theo ca, Client **bắt buộc** phải có giá trị `shiftId` hợp lệ trước khi thực hiện gọi API.
- Trên Front-end (React Native / Expo), sử dụng thuộc tính `enabled: !!shiftId` trong cấu hình TanStack Query.

### 3.2 Tự động làm mới (Auto Reactive Refetching)

- Khi có sự kiện thanh toán đơn hàng thành công (ở màn hình checkout POS), Client phải phát ra lệnh invalidate cache:
  ```typescript
  queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  ```
- Cơ chế này giúp các widget thông tin ca tự động kéo dữ liệu mới nhất mà thu ngân không cần thực hiện thao tác tải lại thủ công.
