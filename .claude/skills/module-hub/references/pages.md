# Pages

Purpose: Route-level page components that compose domain lists and forms, plus the React Router configuration and application entry point.

## Key files

| Path | Purpose |
| --- | --- |
| `src/App.tsx` | Router configuration (`BrowserRouter`, `Routes`, `Route`). Only component using `export default`. |
| `src/main.tsx` | Application entry point. `ReactDOM.createRoot` + `StrictMode`. |
| `src/pages/FansPage.tsx` | Fans CRUD page (exemplar for all domain pages). |
| `src/pages/SourcesPage.tsx` | Sources CRUD page. |
| `src/pages/CurvesPage.tsx` | Curves CRUD page. |
| `src/pages/SchedulesPage.tsx` | Schedules CRUD page. |
| `src/pages/DevicesPage.tsx` | Device discovery and connection management. |
| `src/pages/WifiPage.tsx` | WiFi scanning and connection. |
| `src/pages/SystemPage.tsx` | System info and hostname configuration. |
| `src/pages/LogsPage.tsx` | Log viewer. |

## Entry points

Each `{Entity}Page` is a route-level component registered in `App.tsx`. Routes: `/` (dashboard), `/fans`, `/sources`, `/curves`, `/schedules`, `/wifi`, `/system`, `/logs`, `/devices`.

## Data flow

`App.tsx` -> `Layout` wrapper -> `{Entity}Page` -> `useDeviceStore` for `activeDeviceId` -> `api.{method}(deviceId)` via `useCallback` + `useEffect` -> local `useState` array -> renders `{Entity}List` + `{Entity}Form`.

## Integration points

- Imports `api` and domain types from `../lib/api` (Tauri IPC).
- Imports `useDeviceStore` from `../stores/deviceStore`.
- Imports `useToast` from `../stores/toastStore`.
- Composes domain-components (`{Entity}List`, `{Entity}Form`).
- Uses `Layout` from `../components/layout/Layout`.

## Patterns

- Named function export (`export function {Name}Page()`).
- `activeDeviceId == null` guard on every async handler (loose equality).
- Error handling: `try/catch` with `showToast(\`Failed to ...: ${String(err)}\`, "error")`.
- Slot-based limits: `const MAX_{ENTITY}_SLOTS = 8` (or 16 for curves).
- Header: `h1` with `text-xl font-semibold text-[#171717]` + subtitle with `text-xs text-[#60646c]`.
- Primary button: `rounded-md bg-[#171717] px-3.5 py-2 text-sm font-medium text-white`.
- Confirm dialog before destructive actions.
