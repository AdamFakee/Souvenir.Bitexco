# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Install dependencies: `npm install`
- Start Expo/Metro: `npm start`
- Start Metro for Android emulator localhost networking: `npx expo start --localhost`
- Build and run Android dev client: `npm run android` or `npx expo run:android`
- Build and run iOS dev client: `npm run ios` or `npx expo run:ios`
- Run web target: `npm run web`
- Lint: `npm run lint`
- Type-check: `npx tsc --noEmit`
- Run Jest in watch mode: `npm test`
- Run Jest once: `npx jest --watchAll=false`
- Run one test file: `npx jest path/to/file.test.tsx --watchAll=false`
- Run tests by name: `npx jest -t "test name" --watchAll=false`

For emulator development after a native build, keep Metro reachable with `adb reverse tcp:8081 tcp:8081`.

## Project overview

This is an Expo React Native POS application using TypeScript, Expo Router, NativeWind, XState, Zustand, TanStack Query, Axios, MMKV, and WatermelonDB. The app targets iOS and Android, with Android-specific native modules for iMin vice screen and portable payment hardware under `modules/`.

## Architecture

### Routing and app boot

- `src/app/` contains Expo Router routes and layout shells. Route files should stay thin and delegate feature logic to `src/shared/features/`.
- `src/app/_layout.tsx` wires the root providers: gesture handler, safe area, keyboard controller, WatermelonDB provider, React Query provider, error boundary, global popup/toast, handover reminder overlay, fonts, app initialization, navigation gate, and vice screen integration.
- `src/shared/hooks/use-app-init.ts` starts the singleton app and POS XState actors and initializes connection listeners.
- `src/shared/hooks/use-app-gate.ts` redirects based on `appMachine` state: device activation, staff login, open shift, or main POS tabs.
- Main authenticated UI lives in `src/app/(tab)/` with a custom sidebar layout for POS, orders, dashboard, and dev control. Auth/open-shift flows live in `src/app/(auth)/`.

### State model

- App/session state is centralized in `src/shared/features/app/machines/app.machine.ts` and hosted by `src/shared/features/app/store/use-app-store.ts`.
- `appMachine` owns device activation, access token, employee, open cash session, payment methods, and tenant config. It persists selected context fields to MMKV under `app-machine-persist`.
- POS cart tabs are modeled with XState in `src/shared/features/pos/machines/pos.machine.ts`; each cart is a spawned `cartMachine` actor. `src/shared/features/pos/store/use-pos-store.ts` hosts the singleton POS actor and persists carts through `src/shared/features/pos/lib/pos-storage.ts`.
- Global UI state such as popups, toasts, connection state, and feature stores uses Zustand under `src/shared/store/` or feature-local `store/` directories.

### Data and APIs

- API clients are feature-scoped under `src/shared/features/<feature>/api/` with `remote/` and `local/` subfolders where relevant.
- The shared Axios wrapper is in `src/shared/lib/axios/`. It sets the API base URL, timeout, JSON headers, bearer token from `appMachine`, and global toast handling for API errors.
- TanStack Query is configured in `src/shared/lib/react-query.ts` and `src/shared/configs/query.config.ts`; mobile online/focus integration is set up from the root layout.
- WatermelonDB is configured in `src/shared/lib/database/` with schema version 6 and models for categories, products, and orders. The SQLite DB name is `gold_pos`.
- Offline sync is in `src/shared/lib/database/sync/sync.service.ts`: products/categories are pulled from remote APIs, while offline orders are pushed in chunks through the order remote API and marked synced locally.

### Features

- Feature modules live under `src/shared/features/<feature>/` and typically expose `api/`, `components/`, `hooks/`, `machines/`, `store/`, `types/`, `validation/`, and an `index.ts` barrel as needed.
- Auth/device/staff/shift flows use `appMachine`; avoid introducing separate auth state unless it is bridged through that machine.
- Payment logic uses strategy registration in `src/shared/features/payment/strategies/registry.ts`. Current strategies include cash, QR, and portable card.
- Payment flows with multiple async stages are XState machines under `src/shared/features/payment/machines/`. Portable card payment coordinates checkout creation, payment state transitions, EDC connection/command handling, manual capture, and printing.
- POS UI components and hooks consume the POS actor and active cart actor instead of duplicating cart state in React component state.
- Handover notes are feature-local in `src/shared/features/note/` and are surfaced in the root/tab overlays.

### Native and hardware integration

- `modules/imin-vice-screen/` is a local Expo native module for the secondary/customer-facing iMin screen.
- `modules/payment-portable/` is a local Expo native module for portable payment hardware.
- `src/screens/` contains the React UI and service/store bridge for the vice screen.
- `src/shared/services/printer-service.ts` wraps printer behavior; payment/order flows call this instead of using printer libraries directly.

### Styling and aliases

- Use the `@/` alias for `src/`; it is configured in `tsconfig.json`, `babel.config.js`, and Jest `moduleNameMapper`.
- NativeWind is configured through `tailwind.config.js`, `metro.config.js`, `babel.config.js`, and `src/app/global.css`.
- Shared reusable UI primitives live in `src/shared/components/ui/`; common cross-feature components live in `src/shared/components/common/`.
- Formatting uses Prettier with no semicolons, single quotes, 2 spaces, 100-column print width, trailing commas, LF endings, and Tailwind class sorting.

## Repository docs to consult

- [README.md](README.md): stack, basic architecture, setup, and script summary.
- [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md): naming, function organization, constants placement, strict typing, and comment expectations.
- [docs/api/README.md](docs/api/README.md): API sync model and links to feature API docs.
- [docs/db_local.md](docs/db_local.md): local DB/offline-first design notes; verify against the current WatermelonDB schema before acting because some documented tables are design notes rather than implemented schema.
- [docs/pos_architecture_state_machine_guide.md](docs/pos_architecture_state_machine_guide.md): POS/XState architecture background; verify examples against current code because parts are historical guidance.
- [docs/rule_commit_msg.md](docs/rule_commit_msg.md): conventional commit prefixes; commitlint extends `@commitlint/config-conventional`.

## Notes for future agents

- Prefer current source code over older docs when they conflict. For example, current API code uses Axios even though some architecture docs mention Ky.
- Do not bypass `appMachine` or `posMachine` persistence by adding parallel MMKV/Zustand state for the same concepts.
- When adding payment methods, add a strategy and register it in `PAYMENT_REGISTRY`; use a machine when the flow has async state transitions or retry/cancel/manual-complete paths.
- When changing UI behavior, run the app/dev client and verify the affected POS flow manually when possible; this app integrates native hardware paths that tests/type-checks cannot fully cover.
