---
name: store
description: >
  Create or modify a Zustand state store in this repo. Covers the interface shape, create<T> call,
  inline actions, set/get usage, optional module-level lifecycle functions, and file/hook naming
  conventions. ACTIVATE when adding or editing files under src/stores/.
---

# Zustand Store

Location: `src/stores/{name}Store.ts`.
State manager: Zustand (`create` from `"zustand"`).
Middleware: none (no `persist`, no `devtools`).

## Definitions

| Term | Definition |
| --- | --- |
| store shape | A TypeScript `interface` describing every state field and every action method the store exposes. |
| state field | A property on the store shape that holds data (not a function). |
| action method | A property on the store shape whose type is a function; it calls `set()` to update state. |
| `set` updater | The function form of `set`: `set((state) => ({ ... }))`. Use when the new value depends on the current state. |
| `get` accessor | The second argument to the `create` callback: `(set, get) => ({ ... })`. Use sparingly, only when an action must read current state. |
| lifecycle function | A module-level exported function (`start{Name}Store`, `stop{Name}Store`) that subscribes/unsubscribes to an external event source. |

## Prerequisites

- `zustand` is installed as a dependency (present in `package.json`).

## Steps

### 1. Create the store file

Create `src/stores/{name}Store.ts` with the following structure. The file name is camelCase with a `Store` suffix.

```ts
import { create } from "zustand";

// --- Domain types (if the store manages custom entities) ---
interface {Entity} {
  {field}: {Type};
}

// --- Store shape ---
interface {Name}Store {
  // state fields
  {field}: {Type};
  // action methods
  set{Name}: ({param}: {Type}) => void;
}

// --- Store hook ---
export const use{Name}Store = create<{Name}Store>((set) => ({
  {field}: {defaultValue},
  set{Name}: ({param}) => set({ {field}: {param} }),
}));
```

**Naming rules:**
- The store shape interface is `{Name}Store` (PascalCase + `Store`).
- The exported hook is `use{Name}Store` (`use` prefix + PascalCase + `Store`).
- The file is `{name}Store.ts` (camelCase + `Store`).

**PASS:** `src/stores/deviceStore.ts` exports `useDeviceStore` with interface `DeviceStore`.
**FAIL:** `src/stores/Device.ts` exports `useDevice` with interface `DeviceState`.

### 2. Define state fields with defaults

Every state field declared in the interface MUST have a default value in the `create` call.

| Type | Default |
| --- | --- |
| `string` | `""` |
| `number` | `0` |
| `boolean` | `false` |
| `T \| null` | `null` |
| `T[]` | `[]` |
| discriminated union | First variant string, e.g. `"disconnected"` |

**PASS:**
```ts
connectionStatus: "disconnected",
activeDeviceId: null,
devices: [],
```
**FAIL:**
```ts
connectionStatus: undefined,
activeDeviceId: undefined,
devices: undefined,
```

### 3. Define actions inline

Actions are methods defined directly in the `create` callback object. Do NOT define actions as separate standalone functions and then reference them.

For simple field updates, use the shorthand `set` form.

**PASS:**
```ts
setDevices: (devices) => set({ devices }),
setActiveDevice: (id) => set({ activeDeviceId: id }),
```
**FAIL:**
```ts
// action defined outside create
const setDevices = (devices: Device[]) => { ... };
// then referenced inside create
setDevices,
```

### 4. Use `set` updater for derived state

When the new value depends on the current state (e.g., appending to an array, removing by id, toggling), use the updater form: `set((state) => ({ ... }))`.

**PASS:**
```ts
addDevice: (device) =>
  set((state) => ({ devices: [...state.devices, device] })),
removeDevice: (id) =>
  set((state) => ({
    devices: state.devices.filter((d) => d.id !== id),
    activeDeviceId: state.activeDeviceId === id ? null : state.activeDeviceId,
  })),
```
**FAIL:**
```ts
addDevice: (device) => set({ devices: [...get().devices, device] }),
```

### 5. Use `get()` only when an action must read current state

Destructure `get` from the `create` callback parameters. Use it only when the action cannot be expressed with `set` updater alone (e.g., calling another action or accessing state for a computation that feeds into a method call).

**PASS:**
```ts
export const useChartStore = create<ChartStore>((set, get) => ({
  setTimeRange: (range) => {
    set({ timeRange: range });
    get().updateChart();
  },
  updateChart: () => {
    const { buffer, timeRange } = get();
    const chartData = buffer.toChartData(timeRange);
    set({ chartData });
  },
}));
```
**FAIL:**
```ts
export const useChartStore = create<ChartStore>((set, get) => ({
  setDevices: (devices) => set({ devices: get().devices.concat(devices) }),
  // get() used when set updater would suffice
}));
```

### 6. Add auto-dismiss pattern (when needed)

For transient items (toasts, notifications), use `setTimeout` inside the action to remove the item after a delay. Use a module-level counter for IDs.

```ts
let nextId = 0;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  showToast: (message, type) => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 5000);
  },
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
```

### 7. Add lifecycle functions (when the store subscribes to external events)

When the store must react to an external event source (e.g., an event bus), add module-level `start{Name}Store` and `stop{Name}Store` functions. Manage the subscription with a module-level `unsubscribe` variable.

```ts
let unsubscribe: (() => void) | null = null;

export function start{Name}Store(): void {
  if (unsubscribe) return;
  unsubscribe = eventBus.subscribe((event) => {
    const store = use{Name}Store.getState();
    // update store based on event
  });
}

export function stop{Name}Store(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
```

The `start` function is idempotent (early return if already subscribed). The `stop` function cleans up and resets the variable to `null`.

### 8. Add convenience wrapper hooks (optional)

When a consumer needs only a subset of the store, export a convenience hook that selects specific fields.

```ts
export function useToast() {
  const showToast = useToastStore((s) => s.showToast);
  return { showToast };
}
```

Place convenience hooks after the `create` call, at module level.

## Type rules

- Use `interface` for the store shape. Do NOT use `type`.
- Use `interface` for domain entities managed by the store.
- Export shared type aliases (e.g., `ToastType`) when they appear in the store shape or are needed by consumers.
- Use discriminated unions for status fields: `"connected" | "reconnecting" | "disconnected"`. Do NOT use `any`.
- Export domain types and type aliases at the top of the file, before the store shape interface.

**PASS:**
```ts
export type ToastType = "success" | "warning" | "error";
interface ToastStore {
  toasts: Toast[];
}
```
**FAIL:**
```ts
type ToastStore = {
  toasts: any[];
}
```

## Checklist

- [ ] File at `src/stores/{name}Store.ts`, named with camelCase + `Store` suffix.
- [ ] Imports `create` from `"zustand"`.
- [ ] Store shape defined as `interface {Name}Store` (not `type`).
- [ ] Hook exported as `use{Name}Store = create<{Name}Store>(...)`.
- [ ] Every state field has an inline default in the `create` call.
- [ ] Actions defined inline in the `create` callback, not as standalone functions.
- [ ] `set` updater form used when new value depends on current state.
- [ ] `get()` used only when an action must read current state (not for simple updates).
- [ ] No `any` types. Discriminated unions for status fields.
- [ ] No persistence middleware (`persist`, `devtools`).
- [ ] Lifecycle functions (`start`/`stop`) use module-level `unsubscribe` variable, `start` is idempotent.
- [ ] Convenience wrapper hooks placed after `create` call at module level.
- [ ] Follows `convention` skill.
