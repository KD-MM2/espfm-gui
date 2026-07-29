# Stores

Purpose: Zustand state stores for shared global state across the React application.

## Key files

| Path | Purpose |
| --- | --- |
| `src/stores/deviceStore.ts` | Active device ID, saved device list, connection status. |
| `src/stores/chartStore.ts` | Real-time chart data buffer, event bus subscription lifecycle. |
| `src/stores/toastStore.ts` | Toast notification queue with auto-dismiss. |

## Entry points

Every store exports a `use{Name}Store` hook consumed by page and layout components via `useStore(selector)`.

## Data flow

Components call store actions -> `set()` updates state -> Zustand notifies subscribers -> components re-render via selector.

`chartStore` has an external data source: it subscribes to `eventBus` from `../lib/events` and pushes `FanSample` data into its buffer.

## Integration points

- `deviceStore` is read by nearly every page component for `activeDeviceId`.
- `chartStore` imports `eventBus` from `../lib/events` and `FanSample` from `../lib/fanSample`.
- `toastStore` is used via the `useToast()` convenience wrapper exported from the same file.

## Patterns

- `create<Interface>((set, get) => ({ ... }))` factory pattern.
- Interface defines state fields + action methods.
- Actions are inline in the `create` callback.
- `set()` updater form for derived state: `set((state) => ({ ... }))`.
- Module-level lifecycle functions (`startChartStore`, `stopChartStore`) when the store manages subscriptions.
- No persistence middleware (`persist`, `devtools`).
- Discriminated unions for status fields (e.g. `"connected" | "reconnecting" | "disconnected"`).
- `setTimeout` for auto-dismiss in `toastStore`.
