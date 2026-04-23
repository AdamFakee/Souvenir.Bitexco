# 📱 Expo Base — React Native Starter

A production-ready React Native boilerplate built with **Expo** and **Feature-Based Architecture**. Designed for scalability, maintainability, and a premium developer experience.

---

## 🧰 Tech Stack

| Category             | Library                        | Version          |
| -------------------- | ------------------------------ | ---------------- |
| **Framework**        | Expo                           | ~54.0.30         |
| **UI Framework**     | React Native                   | 0.81.5           |
| **Language**         | TypeScript                     | ~5.9.2           |
| **Navigation**       | Expo Router (file-based)       | ~6.0.21          |
| **Styling**          | NativeWind (Tailwind for RN)   | ^4.0.1           |
| **State Management** | Zustand                        | ^5.0.9           |
| **Server State**     | TanStack React Query           | ^5.90.16         |
| **Forms**            | React Hook Form + Valibot      | ^7.69.0 / ^1.2.0 |
| **HTTP Client**      | ky                             | ^1.14.3          |
| **Animations**       | React Native Reanimated        | ~4.1.1           |
| **Icons**            | Lucide React Native            | ^0.577.0         |
| **Fonts**            | Be Vietnam Pro (via expo-font) | ~14.0.10         |
| **Storage**          | React Native MMKV              | ^4.1.0           |
| **i18n**             | i18next + react-i18next        | ^25.8.13         |
| **Performance**      | Nitro Modules + Flash List     | ^0.33.9 / 2.0.2  |
| **Dev Build**        | Expo Dev Client                | ~6.0.20          |

---

## 🏗️ Feature-Based Architecture

```
src/
├── app/                        # File-based routing (Expo Router)
│   ├── (auth)/                 # Auth flow screens
│   ├── (tab)/                  # Tab navigator screens
│   ├── _layout.tsx             # Root layout (providers, fonts)
│   └── index.tsx               # Entry screen
│
└── shared/                     # Shared cross-feature code
    ├── components/
    │   ├── common/             # Common components (error fallback...)
    │   └── ui/                 # Reusable UI component library
    │       ├── app-header.tsx  # Header (gradient / white variant)
    │       ├── button.tsx      # Button (primary / outline / secondary)
    │       ├── container.tsx   # Layout container (shadow, safeArea)
    │       ├── loading.tsx     # ActivityIndicator wrapper
    │       ├── option.tsx      # Selectable option card
    │       ├── placeholder.tsx # Placeholder view
    │       └── form/           # Form components (Input, ControlledInput)
    ├── configs/                # App-level configs (React Query...)
    ├── constants/              # App constants (colors, sizes, API...)
    ├── features/               # Feature modules (see below)
    ├── hooks/                  # Custom hooks (useAppQuery...)
    ├── lib/                    # 3rd party lib setup (i18n, storage...)
    ├── locales/                # i18n translation files
    ├── store/                  # Zustand stores
    ├── types/                  # Shared TypeScript types
    └── utils/                  # Utility functions
```

### Feature Module Structure

Each feature lives in `src/shared/features/<feature-name>/` with the following structure:

```
features/
└── auth/
    ├── api/             # API calls for this feature
    ├── components/      # Feature-specific components
    ├── hooks/           # Feature-specific hooks
    ├── screens/         # Screen components
    └── index.ts         # Public API (barrel export)
```

---

## 🎨 Design System

The design system is configured in `tailwind.config.js` and `src/shared/constants/`.

### Colors (`COLORS`)

| Token                | Value                 |
| -------------------- | --------------------- |
| `primary`            | `#9B0000` (brand red) |
| `text.primary.red`   | `#9B0000`             |
| `text.primary.black` | `#000000`             |
| `text.primary.white` | `#FFFFFF`             |
| `text.secondary`     | `#707070`             |
| `background.white`   | `#FFFFFF`             |
| `background.overlay` | `rgba(0,0,0,0.5)`     |

### Typography

| Class     | Size | Font     |
| --------- | ---- | -------- |
| `title`   | 30px | SemiBold |
| `heading` | 24px | Bold     |
| `body`    | 20px | Regular  |
| `desc`    | 18px | Regular  |
| `button`  | 18px | Medium   |
| `blog`    | 16px | Regular  |
| `note-1`  | 15px | Regular  |
| `note-2`  | 12px | Regular  |

### Spacing

| Token    | Value |
| -------- | ----- |
| `xs`     | 5px   |
| `sm`     | 10px  |
| `md`     | 16px  |
| `header` | 64px  |

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- Android Studio + Emulator (for Android)
- Xcode (for iOS, macOS only)
- Expo CLI: `npm install -g expo-cli`

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/AdamFakee/EXPO-BASE.git
cd EXPO-BASE

# 2. Install dependencies
npm install
```

### Running the App

#### First time (or after adding new native dependencies)

```bash
# Build and install native app on Android emulator
npx expo run:android

# After build, run adb reverse so emulator can reach Metro
adb reverse tcp:8081 tcp:8081
```

#### Day-to-day development

```bash
# Start Metro bundler (localhost mode for emulator)
npx expo start --localhost

# In another terminal, keep adb reverse active
adb reverse tcp:8081 tcp:8081
```

### Available Scripts

| Script                       | Description                                  |
| ---------------------------- | -------------------------------------------- |
| `npm start`                  | Start Expo (via LAN IP, for physical device) |
| `npx expo start --localhost` | Start Expo (localhost, for emulator)         |
| `npx expo run:android`       | Build & run on Android                       |
| `npx expo run:ios`           | Build & run on iOS                           |
| `npm run lint`               | Run ESLint                                   |
| `npm test`                   | Run Jest tests                               |

---

## 📦 Key Libraries Explained

### React Query + Custom `useAppQuery`

All API calls use `useAppQuery` hook with smart retry logic:

- **4xx errors** → **No retry** (client mistake, retrying won't help)
- **5xx errors** → **Retry up to 3 times** with exponential backoff

### NativeWind (Tailwind CSS for RN)

Write styles using Tailwind utility classes directly on React Native components:

```tsx
<View className="flex-1 bg-background-white px-md">
  <Text className="text-heading font-bold text-primary">Hello</Text>
</View>
```

### React Hook Form + Valibot

Type-safe form handling with schema validation:

```tsx
const schema = v.object({ email: v.string() })
const { control, handleSubmit } = useForm({ resolver: valibotResolver(schema) })
```

---

## 🏛️ Feature Implementation Guide

Ví dụ triển khai đầy đủ một feature `auth` theo kiến trúc đã định nghĩa.

### 1. Tạo cấu trúc thư mục

```
src/shared/features/auth/
├── api/
│   └── auth.api.ts         # Axios/ky API calls
├── components/
│   └── login-form.tsx      # Feature UI components
├── hooks/
│   └── use-login.ts        # Feature business logic hook
├── schemas/
│   └── login.schema.ts     # Valibot validation schemas
├── stores/
│   └── auth.store.ts       # Zustand local state
└── index.ts                # Public barrel export
```

---

### 2. API Layer — `api/auth.api.ts`

Định nghĩa các hàm gọi API, tách biệt khỏi UI:

```typescript
import { httpClient } from '@/shared/lib/http-client'

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  user: { id: string; name: string; email: string }
}

export const authApi = {
  login: (payload: LoginPayload) =>
    httpClient.post('auth/login', { json: payload }).json<LoginResponse>(),

  logout: () => httpClient.post('auth/logout').json<void>(),

  getProfile: () => httpClient.get('auth/profile').json<LoginResponse['user']>(),
}
```

---

### 3. Schema Validation — `schemas/login.schema.ts`

Dùng Valibot để validate form trước khi gửi lên server:

```typescript
import * as v from 'valibot'

export const loginSchema = v.object({
  email: v.pipe(
    v.string(),
    v.email('Email không hợp lệ'),
    v.minLength(1, 'Email không được để trống'),
  ),
  password: v.pipe(v.string(), v.minLength(6, 'Mật khẩu phải có ít nhất 6 ký tự')),
})

export type LoginFormValues = v.InferOutput<typeof loginSchema>
```

---

### 4. Store — `stores/auth.store.ts`

Zustand store cho global auth state:

```typescript
import { create } from 'zustand'

interface User {
  id: string
  name: string
  email: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,

  setAuth: (user, accessToken) => set({ user, accessToken }),
  clearAuth: () => set({ user: null, accessToken: null }),
  isAuthenticated: () => !!get().accessToken,
}))
```

---

### 5. Business Logic Hook — `hooks/use-login.ts`

Tách logic khỏi UI, dễ test và tái sử dụng:

```typescript
import { useMutation } from '@tanstack/react-query'
import { authApi, LoginPayload } from '../api/auth.api'
import { useAuthStore } from '../stores/auth.store'

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth)

  const {
    mutate: login,
    isPending,
    error,
  } = useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken)
      // Navigate to home, e.g.: router.replace('/(tab)/')
    },
    onError: (err) => {
      console.error('Login failed:', err)
    },
  })

  return { login, isPending, error }
}
```

---

### 6. Fetch Data với `useAppQuery` — `hooks/use-profile.ts`

Dùng hook tùy chỉnh `useAppQuery` để lấy dữ liệu với retry thông minh:

```typescript
import { useAppQuery } from '@/shared/hooks'
import { QUERY_PRESETS } from '@/shared/configs'
import { authApi } from '../api/auth.api'

export function useProfile(userId: string) {
  return useAppQuery({
    queryKey: ['auth', 'profile', userId],
    queryFn: () => authApi.getProfile(),

    // Dùng preset phù hợp với loại data:
    // STATIC  → data ít thay đổi (danh sách tỉnh, cấu hình app)
    // DEFAULT → data thông thường (newsfeed, profile)
    // REALTIME → data thay đổi liên tục (chat, giá cổ phiếu)
    ...QUERY_PRESETS.DEFAULT,
  })
}
```

---

### 7. UI Component — `components/login-form.tsx`

Kết hợp React Hook Form + ControlledInput + Button:

```tsx
import { valibotResolver } from '@hookform/resolvers/valibot'
import { useForm } from 'react-hook-form'
import { View } from 'react-native'
import { Button, ControlledInput } from '@/shared/components/ui'
import { loginSchema, LoginFormValues } from '../schemas/login.schema'
import { useLogin } from '../hooks/use-login'

export const LoginForm = () => {
  const { login, isPending } = useLogin()

  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: valibotResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = (values: LoginFormValues) => login(values)

  return (
    <View className="gap-sm">
      <ControlledInput
        control={control}
        name="email"
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <ControlledInput control={control} name="password" placeholder="Mật khẩu" secureTextEntry />
      <Button
        label="Đăng nhập"
        variant="primary"
        onPress={handleSubmit(onSubmit)}
        loading={isPending}
      />
    </View>
  )
}
```

---

### 8. Screen — (trong `app/(auth)/login.tsx`)

Screen chỉ làm nhiệm vụ layout, không chứa logic:

```tsx
import { AppHeader, Container } from '@/shared/components/ui'
import { LoginForm } from '@/shared/features/auth'
import { View } from 'react-native'

export default function LoginScreen() {
  return (
    <View className="flex-1 bg-background-white">
      <AppHeader title="Đăng nhập" variant="gradient" showLeftButton={false} />
      <Container className="mx-md mt-md flex-1 justify-center">
        <LoginForm />
      </Container>
    </View>
  )
}
```

---

### 9. i18n — Thêm translation

Thêm key vào `src/shared/locales/vi/auth.json`:

```json
{
  "login": {
    "title": "Đăng nhập",
    "email": "Email",
    "password": "Mật khẩu",
    "submit": "Đăng nhập",
    "error": "Email hoặc mật khẩu không đúng"
  }
}
```

Sử dụng trong component:

```tsx
import { useTranslation } from 'react-i18next'

const { t } = useTranslation('auth')
;<Button label={t('login.submit')} variant="primary" />
```

---

### 10. Barrel Export — `index.ts`

Chỉ export những gì cần cho bên ngoài:

```typescript
// src/shared/features/auth/index.ts
export { LoginForm } from './components/login-form'
export { useLogin } from './hooks/use-login'
export { useProfile } from './hooks/use-profile'
export { useAuthStore } from './stores/auth.store'
```

---

## 🤝 Contributing

```bash
# Create a feature branch
git checkout -b feat/your-feature

# Commit using conventional commits
git commit -m "feat: add your feature"

# Push and open PR
git push origin feat/your-feature
```

Commit message format follows [Conventional Commits](https://www.conventionalcommits.org/).
