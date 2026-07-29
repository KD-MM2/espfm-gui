# Lib

Purpose: Shared TypeScript modules providing the API client, event bus, type definitions, and data utilities. No UI code lives here.

## Key files

| Path | Purpose |
| --- | --- |
| `src/lib/api.ts` | Tauri IPC API client. Single `api` object with methods wrapping `invoke<T>()`. All domain interfaces defined here. |
| `src/lib/events.ts` | `EventBus` singleton for pub/sub between lib modules and stores. |
| `src/lib/fanSample.ts` | Type-only file: `FanSample`, `FanData`, `TemperatureData`, `SystemData`, `ChartDataPoint` interfaces. |
| `src/lib/timeSeriesBuffer.ts` | Ring buffer with time-range filtering and chart data transformation. |
| `src/lib/collectors.ts` | Collector class with `setInterval` polling for event data (class-based event subscriber variant). |
| `src/lib/activityDetector.ts` | Event subscriber: detects user activity from fan sample data. |
| `src/lib/sqliteWriter.ts` | Event subscriber: persists fan samples to SQLite via Tauri IPC. |

## Entry points

- `api` object: imported by pages, domain components, and event subscribers for all Tauri IPC calls.
- `eventBus` singleton: imported by stores (`chartStore`) and event subscribers.
- `TimeSeriesBuffer` class: imported by `chartStore`.
- Type interfaces: imported by all modules needing domain types.

## Data flow

Tauri backend -> `invoke()` in `api.ts` -> page/store calls `api.method()` -> data flows to components via props or Zustand state.

Event flow: Tauri backend pushes events -> `eventBus.publish()` -> subscribers (`activityDetector`, `sqliteWriter`, `collectors`) process data -> `api.method()` for side effects or `chartStore` for UI updates.

## Integration points

- `api.ts` wraps `@tauri-apps/api/core` `invoke()`.
- `events.ts` is consumed by `chartStore`, `activityDetector`, `sqliteWriter`, `collectors`.
- All domain types are defined in `api.ts` and `fanSample.ts`.

## Patterns

- `api.ts`: `const api = { method: (deviceId, params) => invoke<T>("command_name", { params }) }`. No error handling at this layer. Snake_case field names matching Rust serialization.
- Event subscribers: module-level `activeDeviceId` + `unsubscribe`, exported `start/stop/setDevice` functions, fire-and-forget API calls with `.catch(() => {})`.
- Utility classes: private state, explicit return types, no external dependencies.
- Type files: only `export interface` declarations, zero runtime code.
