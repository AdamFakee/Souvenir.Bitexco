# Mô-đun Xác thực & Phiên làm việc (Auth & Session Lifecycle)

Mô-đun quản lý Kích hoạt thiết bị POS (Device Activation), Đăng nhập nhân viên thu ngân, Quản lý Token xoay vòng (Token Rotation) và Đăng xuất phiên làm việc tại Bitexco SkyStore.

---

> ⚠️ **Đoạn Cảnh báo & Phân biệt:**
>
> - Mô-đun **Auth** chỉ xử lý danh tính nhân viên và thiết bị, **KHÔNG quản lý số tiền ca làm việc** (nghiệp vụ số tiền ca do `src/features/shift` đảm nhiệm).
> - Bắt buộc gửi header `X-Token-Delivery: body` khi gọi login/refresh theo chuẩn ADR-0022.

---

## 🔗 Danh sách Tham chiếu (Reference Links)

- Spec Xác thực & Kích hoạt: [docs/specs/0006-auth-device-activation.md](../../../docs/specs/0006-auth-device-activation.md)
- Route Đăng nhập: `src/app/(auth)/login.tsx`

---

## 1. Đang có gì (Bảng danh mục tệp)

| Tệp                             | Trách nhiệm                                            | Chạm Vào/Ra (I/O)                             |
| :------------------------------ | :----------------------------------------------------- | :-------------------------------------------- |
| `api/remote/activate-device.ts` | Kích hoạt máy POS bằng mã kích hoạt                    | 🌐 REST API (`POST /v1/pos-devices/activate`) |
| `api/remote/login.ts`           | Đăng nhập nhân viên thu ngân                           | 🌐 REST API (`POST /v1/device/auth/login`)    |
| `api/remote/refresh-token.ts`   | Tự động làm mới cặp token khi hết hạn                  | 🌐 REST API (`POST /v1/device/auth/refresh`)  |
| `api/remote/logout.ts`          | Đăng xuất và thu hồi token server-side                 | 🌐 REST API (`POST /v1/device/auth/logout`)   |
| `api/remote/get-me.ts`          | Lấy thông tin chi tiết nhân viên đang đăng nhập        | 🌐 REST API (`GET /v1/device/auth/me`)        |
| `store/auth.store.ts`           | Zustand store lưu trữ trạng thái nhân viên & quyền hạn | ❌ In-memory Store                            |

---

## 2. Các quyết định đã chốt & Lý giải kỹ thuật (HOW & WHY)

1. **Header `X-Token-Delivery: body` (ADR-0022):**
   - **Quyết định**: Mọi request login và refresh token đều gửi kèm header này để nhận token qua JSON body thay vì cookie.
   - **Lý giải**: React Native không hỗ trợ cơ chế cookie trình duyệt tự động, việc nhận token qua body giúp lưu trữ an toàn trong SecureStore.
2. **Tự động refresh token ngầm:**
   - **Quyết định**: Sử dụng Axios Interceptor để bắt lỗi 401, gọi refresh token và thực thi lại request ban đầu một cách liền mạch.
   - **Lý giải**: Đảm bảo trải nghiệm thu ngân không bị ngắt quãng khi đang phục vụ khách hàng.

---

## 3. Hướng dẫn kiểm thử & Chạy lệnh

```bash
# Kiểm tra TypeScript strict mode
npm run check-type

# Kiểm tra Linter
npm run lint
```
