# Hướng dẫn sử dụng Màn hình phụ (Secondary Screen) - iMin Swan 2

Tài liệu này hướng dẫn cách triển khai và điều khiển màn hình phụ (Customer Display) trên thiết bị iMin Swan 2 sử dụng Module `imin-vice-screen`.

---

## 1. Kiến trúc hệ thống

Hệ thống hoạt động theo cơ chế **Multi-Root**:

- **Main App**: Chạy trên màn hình chính (Thu ngân).
- **Vice App**: Một React Component độc lập chạy trên màn hình phụ (Khách hàng).

Cả hai chia sẻ cùng một JS Bundle nhưng chạy ở hai Window khác nhau. Chúng giao tiếp với nhau thông qua **Native Events**.

---

## 2. Khai báo (Registration)

Để màn hình phụ có thể hiển thị, bạn phải đăng ký Component trong `index.js` (Root của dự án):

```javascript
import { AppRegistry } from 'react-native'
import ViceApp from './src/screens/ViceApp'

// Đăng ký với tên định danh 'ViceScreen'
AppRegistry.registerComponent('ViceScreen', () => ViceApp)
```

---

## 3. Các Method trong Module `IminViceScreen`

| Method                                | Tham số            | Mô tả                                                                                                                                                              |
| :------------------------------------ | :----------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isSupportDoubleScreen()`             | Không              | Kiểm tra thiết bị có hỗ trợ màn hình phụ không.                                                                                                                    |
| `checkOverlayPermission()`            | Không              | Kiểm tra quyền "Draw over other apps" (cần thiết để mở cửa sổ).                                                                                                    |
| `requestOverlayPermission()`          | Không              | Mở cài đặt hệ thống để người dùng cấp quyền Overlay.                                                                                                               |
| `open(moduleName)`                    | `string`           | Khởi tạo và hiển thị Component đã đăng ký lên màn hình phụ.                                                                                                        |
| `close()`                             | Không              | Đóng màn hình phụ.                                                                                                                                                 |
| `sendMsgToViceScreen(method, params)` | `string`, `object` | Gửi dữ liệu/lệnh từ màn hình chính sang màn hình phụ. (method, params) được truyền nguyên vẹn từ Main App -> Native -> Vice App nên cần ràng buộc method và params |

---

- `setCustomerName(name)` / `setOrderId(id)`: Cập nhật thông tin khách hàng/đơn hàng.

> [!IMPORTANT]
> **Tính biệt lập của bộ nhớ (Store Isolation):**
> Dù cùng một ứng dụng, nhưng Màn hình chính và Màn hình phụ chạy trên **2 máy ảo JavaScript (JS Runtime) riêng biệt**. Do đó, Store của 2 màn hình **KHÔNG dùng chung bộ nhớ**. Mọi thay đổi ở màn hình chính sẽ không tự động cập nhật sang màn hình phụ trừ khi được gửi qua Native.

---

## 5. Luồng giao tiếp (Communication Flow)

### Bước 1: Mở màn hình phụ (Chỉ gọi 1 lần khi vào App)

```typescript
IminViceScreen.open('ViceScreen')
```

### Bước 2: Gửi dữ liệu từ Màn hình chính

```typescript
IminViceScreen.sendMsgToViceScreen('updateCart', {
  items: [{ id: '1', name: 'Coffee', price: 2.5, quantity: 1 }],
  total: 2.5,
})
```

### Bước 3: Nhận dữ liệu tại Màn hình phụ (`ViceApp.tsx`)

```typescript
useEffect(() => {
  const sub = IminViceScreen.addListener('onDataReceived', (event) => {
    const { method, params } = event
    // Gọi action tương ứng trong Zustand store
    if (method === 'updateCart') viceStore.updateCart(params.items, params.total)
  })
  return () => sub.remove()
}, [])
```

---

## 6. Điều hướng (Navigation)

**LƯU Ý QUAN TRỌNG:**
Không nên dùng `@react-navigation/native-stack` trên màn hình phụ vì nó yêu cầu một `Activity` host (màn hình phụ chỉ là một `Presentation` window).

**Giải pháp:** Sử dụng **State-based Navigation** (Chuyển đổi màn hình bằng biến `currentScreen` trong Zustand).

- `currentScreen: 'Home'`: Xem giỏ hàng.
- `currentScreen: 'Payment'`: Xem QR thanh toán.
- `currentScreen: 'Promotion'`: Xem ảnh quảng cáo.

---

## 7. Kinh nghiệm tối ưu (Best Practices)

1. **Tránh gọi `open()` liên tục**: Mỗi lần gọi `open()`, Native sẽ giết View cũ và nạp lại JS Bundle (mất 0.3s - 0.5s và bị chớp màn hình). Chỉ nên gọi 1 lần duy nhất.
2. **Dùng Event để cập nhật**: Sau khi đã `open`, hãy dùng `sendMsgToViceScreen` để thay đổi giao diện. Tốc độ cập nhật qua Event là gần như tức thì (< 0.01s).
