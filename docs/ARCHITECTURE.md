# React Native Modern Architecture Documentation

**Version:** 1.0.0
**Stack:** Expo SDK 52+, NativeWind v4, Zustand, TanStack Query, Valibot, Ky, MMKV.

## 1. Tổng quan Kiến trúc

Dự án sử dụng mô hình **Feature-based Architecture** kết hợp với **File-based Routing** của Expo Router.

- **App Directory (`/app`)**: Chỉ chứa logic điều hướng (Routing), Layouts, và Screens. Không chứa business logic phức tạp.
- **Source Directory (`/shared`)**: Chứa toàn bộ source code cốt lõi.

### Separation of Concerns:

- **UI**: Sử dụng NativeWind v4 & Primitives (Reusables).
- **Logic**: Tách biệt hoàn toàn trong Custom Hooks và Stores.
- **Data**: Quản lý bởi TanStack Query (Server state) và Zustand (Client state).

## 2. Cấu trúc Thư mục (Directory Structure)

```
src/
├── app/                        # Expo Router (File-based routing)
│   ├── (auth)/                 # Route group cho Authentication (Login, Register)
│   │   ├── _layout.tsx
│   │   └── login.tsx
│   ├── (tabs)/                 # Route group cho Main App (Bottom Tabs)
│   │   ├── _layout.tsx
│   │   ├── index.tsx           # Home Screen
│   │   └── profile.tsx
│   ├── _layout.tsx             # Root Layout (Providers, Fonts, Splash Screen)
│   ├── +not-found.tsx          # 404 Page
│   └── global.css              # Entry point cho NativeWind CSS
├── assets/                     # Images, Fonts, Icons
├── shared/                     # MAIN SOURCE CODE
│   ├── components/             # Shared Components
│   │   ├── ui/                 # "Reusables" - Các nguyên tử UI (Button, Input, Card)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   └── typography.tsx
│   │   └── common/             # Các component phức tạp dùng chung (Header, Footer)
│   ├── constants/              # Biến hằng số (Colors, Config, API Endpoints)
│   ├── features/               # FEATURE MODULES (Quan trọng nhất)
│   │   ├── auth/               # Module xác thực
│   │   │   ├── api/            # API calls (Ky)
│   │   │   ├── components/     # Component riêng của Auth (LoginForm)
│   │   │   ├── hooks/          # Hooks riêng (useLogin, useAuth)
│   │   │   └── schemas/        # Valibot schemas (LoginSchema)
│   │   └── product/            # Module sản phẩm
│   ├── hooks/                  # Global Hooks (useOnlineStatus, useTheme)
│   ├── lib/                    # Cấu hình thư viện bên thứ 3
│   │   ├── api-client.ts       # Cấu hình Ky instance (Interceptors)
│   │   ├── query-client.ts     # Cấu hình React Query
│   │   ├── storage.ts          # Cấu hình MMKV
│   │   └── utils.ts            # Hàm tiện ích (cn helper cho Tailwind)
│   ├── store/                  # Global Client State (Zustand)
│   │   └── use-app-store.ts
│   └── types/                  # Global TypeScript Definitions
├── .eslintrc.js
├── babel.config.js
├── tailwind.config.ts          # Cấu hình Tailwind v4 & NativeWind
├── tsconfig.json
└── package.json
```

## 3. Chi tiết triển khai các lớp (Layer Implementation)

### 3.1. Lớp Network & API (Sử dụng Ky)

Thay thế Axios bằng Ky để tận dụng Fetch API nhẹ nhàng.
File: `src/lib/api-client.ts`

```typescript
import ky from 'ky'
import { tokenStorage } from './storage' // MMKV storage

// Tạo instance dùng chung
export const apiClient = ky.create({
  prefixUrl: 'https://api.your-domain.com/v1',
  retry: 2, // Tự động retry khi lỗi mạng
  timeout: 10000,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = tokenStorage.getString('access_token')
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`)
        }
      },
    ],
    afterResponse: [
      async (request, options, response) => {
        if (response.status === 401) {
          // Xử lý logout hoặc refresh token logic tại đây
        }
      },
    ],
  },
})
```

### 3.2. Lớp Validation (Sử dụng Valibot)

Tối ưu bundle size thay vì Zod.
File: `src/features/auth/schemas/login.schema.ts`

```typescript
import * as v from 'valibot'

export const LoginSchema = v.object({
  email: v.pipe(v.string(), v.email('Email không hợp lệ')),
  password: v.pipe(v.string(), v.minLength(6, 'Mật khẩu tối thiểu 6 ký tự')),
})

export type LoginInput = v.InferInput<typeof LoginSchema>
```

### 3.3. Lớp UI & Styling (NativeWind v4 + Reusables)

Sử dụng pattern `cn` (classnames) giống Shadcn UI.
File: `src/lib/utils.ts`

```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

File Component mẫu: `src/components/ui/button.tsx`

```typescript
import { Text, TouchableOpacity, View } from 'react-native';
import { cn } from '@/src/lib/utils';

// Styled Component với Tailwind classes
export const Button = ({ className, title, variant = 'default', ...props }) => {
  const baseStyles = "h-12 rounded-lg items-center justify-center flex-row px-4";
  const variants = {
    default: "bg-primary-600",
    outline: "border border-primary-600 bg-transparent",
    ghost: "bg-transparent"
  };

  const textStyles = variant === 'outline' || variant === 'ghost'
    ? "text-primary-600 font-semibold"
    : "text-white font-semibold";

  return (
    <TouchableOpacity
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    >
      <Text className={textStyles}>{title}</Text>
    </TouchableOpacity>
  );
};
```

### 3.4. Lớp Data & Storage (React Query + MMKV)

Lưu trữ cache server vĩnh viễn và state local siêu tốc.
File: `src/lib/storage.ts`

```typescript
import { MMKV } from 'react-native-mmkv'
import { StateStorage } from 'zustand/middleware'

export const storage = new MMKV()

// Adapter cho Zustand persist
export const zustandStorage: StateStorage = {
  setItem: (name, value) => storage.set(name, value),
  getItem: (name) => storage.getString(name) ?? null,
  removeItem: (name) => storage.delete(name),
}
```

## 4. Quy tắc phát triển (Development Guidelines)

1.  **Strict Typing**: Mọi API response đều phải được define type rõ ràng. Không dùng `any`.
2.  **Component Atoms**: Các UI component nhỏ (Button, Input) phải nằm trong `src/components/ui`. Không hardcode style, luôn dùng Tailwind classes.
3.  **Feature Isolation**: Khi tạo tính năng mới (ví dụ: Chat), hãy tạo folder `src/features/chat`. Tránh phân tán file logic khắp nơi.
4.  **FlashList First**: Luôn ưu tiên dùng FlashList thay vì FlatList cho các danh sách dài để đảm bảo 60fps.
5.  **Performance**:
    - Hạn chế render inline arrow function trong props của list item.
    - Sử dụng `useCallback` và `useMemo` cho các logic tính toán nặng hoặc handler truyền xuống component con.

## 5. Quy trình thêm tính năng mới (Workflow)

1.  **Bước 1 (Schema)**: Định nghĩa cấu trúc dữ liệu Input/Output bằng Valibot trong `features/xxx/schemas`.
2.  **Bước 2 (API)**: Viết hàm fetch data sử dụng `apiClient` (Ky) trong `features/xxx/api`.
3.  **Bước 3 (Hook)**: Tạo custom hook `useQuery` hoặc `useMutation` trong `features/xxx/hooks`.
4.  **Bước 4 (UI)**: Dựng giao diện trong `features/xxx/components` sử dụng các component từ `src/components/ui`.
5.  **Bước 5 (Integration)**: Ghép vào `app/(tabs)/xxx.tsx`.
