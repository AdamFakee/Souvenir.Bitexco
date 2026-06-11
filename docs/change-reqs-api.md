# API POS — Yêu Cầu Bổ Sung Thiết Bị (Backend)

Tài liệu này lưu trữ các yêu cầu thay đổi/bổ sung phía API (Backend) phục vụ cho POS.

---

### API Đăng Nhập Nhân Viên (`POST /v1/device/auth/login`)

Dùng để nhân viên POS đăng nhập bằng mã nhân viên và mã PIN.

- **Request Body:**

```json
{
  "deviceId": "019e437b-1620-71c0-9924-c1df81683180",
  "employeeCode": "NV001",
  "pin": "1111"
}
```

- **Response (200 OK) - Trả về thông tin đăng nhập, trong đó trường `device` lồng đối tượng `DeviceInfo` chứa `warehouseId` mới:**

```json
{
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "abcdef123456...",
  "employee": {
    "id": "019e437b-1620-71c0-9924-c1df81683190",
    "email": "nv001@example.com",
    "employeeCode": "NV001",
    "name": "Nguyễn Văn Thu Ngân",
    "role": "cashier",
    "permissions": ["pos:checkout", "pos:refund"]
  },
  "device": {
    "id": "019e437b-1620-71c0-9924-c1df81683180",
    "deviceCode": "POS-001",
    "name": "Quầy 1",
    "deviceType": "pos",
    "location": "Tầng 1",
    "tenantId": "019e437b-1620-71c0-9924-c1df81683185",
    "warehouseId": "019e437b-1620-71c0-9924-c1df81683186", // <--- 🚀 TRƯỜNG YÊU CẦU BỔ SUNG
    "status": "active"
  }
}
```
