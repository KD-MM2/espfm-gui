---
name: event-subscriber
description: >
  Create or modify an event-subscriber module in src/lib/. Covers eventBus subscription lifecycle,
  device-scoped start/stop, fire-and-forget API calls, and module-level mutable state.
  ACTIVATE when adding a new subscriber that reacts to FanSample events published on the event bus.
---

# Event Subscriber

Location: `src/lib/{module}.ts`.
Base / interface: none — plain module with exported functions.
Event bus: `eventBus` singleton from `./events`, typed as `EventBus` with `subscribe(handler): unsubscribe_fn` and `publish(sample): void`.
Sample type: `FanSample` from `./fanSample`.

## Definitions

| Term | Definition |
| --- | --- |
| `eventBus` | Singleton `EventBus` instance exported from `./events`. Provides `subscribe(handler)` returning an unsubscribe function, and `publish(sample)` to broadcast a `FanSample` to all subscribers. |
| `FanSample` | Interface from `./fanSample` with fields `timestamp`, `fans`, `temperatures`, `system`. |
| `activeDeviceId` | Module-level `number | null` variable tracking which device this subscriber is scoped to. `null` means no device connected — handler returns early. |
| `unsubscribe` | Module-level `(() => void) | null` variable holding the unsubscribe function returned by `eventBus.subscribe()`. `null` means subscriber is not started. |
| fire-and-forget | API call pattern: `api.someMethod(...).catch(() => {})` — errors are silently swallowed because the subscriber is a side-effect pipeline, not a request/response flow. |

## Steps

### 1. Create the module file

Create `src/lib/{module}.ts` with the following structure. Replace `{Module}` with PascalCase module name and `{module}` with camelCase.

```typescript
import { eventBus } from "./events";
import { api } from "./api";
import type { FanSample } from "./fanSample";

let activeDeviceId: number | null = null;

export function set{Module}Device(deviceId: number | null): void {
  activeDeviceId = deviceId;
}

function handleSample(sample: FanSample): void {
  if (activeDeviceId == null) return;
  // Process sample.fans / sample.temperatures / sample.system
  // Call api.* methods with .catch(() => {}) for fire-and-forget
}

let unsubscribe: (() => void) | null = null;

export function start{Module}(): void {
  if (unsubscribe) return;
  unsubscribe = eventBus.subscribe(handleSample);
}

export function stop{Module}(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
```

### 2. Implement the handleSample function

Write the handler body inside `handleSample`. The handler receives a `FanSample` and must:

1. Guard with `if (activeDeviceId == null) return;` as the first line.
2. Iterate over the sample data relevant to this subscriber's purpose.
3. Call `api.*` methods using `activeDeviceId` as the first argument.
4. Chain `.catch(() => {})` on every API call — this is fire-and-forget.

PASS — iterating fans and calling an API method:
```typescript
for (const fan of sample.fans) {
  api.saveFanSample(activeDeviceId, fan.id, fan.rpm, fan.duty).catch(() => {});
}
```

FAIL — missing `.catch(() => {})`:
```typescript
for (const fan of sample.fans) {
  api.saveFanSample(activeDeviceId, fan.id, fan.rpm, fan.duty);
}
```

FAIL — missing null guard:
```typescript
function handleSample(sample: FanSample): void {
  for (const fan of sample.fans) {
    api.saveFanSample(activeDeviceId!, fan.id, fan.rpm, fan.duty).catch(() => {});
  }
}
```

### 3. Add module-specific state (if needed)

If the subscriber needs to track state across samples (e.g. previous values for change detection), declare additional module-level variables ABOVE `handleSample`.

PASS — tracking previous values for change detection:
```typescript
let activeDeviceId: number | null = null;
const prevDuties = new Map<number, number>();

export function setDetectorDevice(deviceId: number | null): void {
  activeDeviceId = deviceId;
  prevDuties.clear();
}
```

If the setter resets module-specific state, clear it in `set{Module}Device` as shown above.

### 4. Wire the subscriber into the app lifecycle

Call `set{Module}Device`, `start{Module}`, and `stop{Module}` at the appropriate connection lifecycle points in the application. The caller is responsible for:

1. Calling `set{Module}Device(deviceId)` when a device connects.
2. Calling `start{Module}()` after setting the device.
3. Calling `stop{Module}()` when the device disconnects.
4. Calling `set{Module}Device(null)` to clear the active device.

### 5. Export the module's public API

The module exports exactly three functions:

| Export | Signature | Purpose |
| --- | --- | --- |
| `set{Module}Device` | `(deviceId: number | null) => void` | Set or clear the active device |
| `start{Module}` | `() => void` | Subscribe to eventBus (idempotent) |
| `stop{Module}` | `() => void` | Unsubscribe from eventBus and clear state |

If the subscriber exposes additional configuration (e.g. a callback), export a separate setter for it. Do NOT add it to the start/stop signature.

PASS — separate callback setter:
```typescript
export function setActivityCallback(cb: ActivityCallback | null): void {
  onActivity = cb;
}
```

FAIL — callback as parameter to start:
```typescript
export function startActivityDetector(cb: ActivityCallback): void {
```

## Variants

### Class-based subscriber (polling)

`collectors.ts` uses a `Collector` class with `setInterval`-based polling instead of eventBus subscription. This pattern is used when the subscriber needs to actively fetch data on a timer rather than react to events. The class takes `deviceId` in its constructor, exposes `start(): Promise<void>` and `stop(): void`, and manages multiple `setInterval` timers internally. Do NOT use this pattern for event-reactive subscribers — use the module-level function pattern described above.

## Checklist

- [ ] File created at `src/lib/{module}.ts`.
- [ ] Imports `eventBus` from `./events`, `api` from `./api`, `FanSample` from `./fanSample`.
- [ ] Module-level `activeDeviceId: number | null` initialized to `null`.
- [ ] Module-level `unsubscribe: (() => void) | null` initialized to `null`.
- [ ] `set{Module}Device` exported, sets `activeDeviceId`.
- [ ] `handleSample` is a private (non-exported) function.
- [ ] `handleSample` first line is `if (activeDeviceId == null) return;`.
- [ ] Every `api.*` call in `handleSample` chains `.catch(() => {})`.
- [ ] `start{Module}` guards against double-start with `if (unsubscribe) return;`.
- [ ] `start{Module}` calls `eventBus.subscribe(handleSample)` and stores the return in `unsubscribe`.
- [ ] `stop{Module}` calls `unsubscribe()`, sets it to `null`.
- [ ] `stop{Module}` clears any module-specific state (e.g. Maps).
- [ ] No class used unless the subscriber requires `setInterval`-based polling.
- [ ] Follows `convention` skill.
