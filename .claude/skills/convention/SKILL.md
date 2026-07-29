---
name: convention
description: >
  Standard coding rules for espfm-gui. Apply to every create/modify/refactor of source code in the
  TypeScript/React frontend (src/) and Rust backend (src-tauri/src/, crates/).
---

# Coding Conventions

Enforce these in all code you write or edit.

---

## TypeScript / React Rules

### 1. Named function exports

Every React component uses `export function`. The only exception is `App.tsx` which uses `export default function`.

**PASS:**
```tsx
export function FanList({ fans, onEdit, onDelete }: FanListProps) {
  return <div>...</div>;
}
```
**FAIL:**
```tsx
export default function FanList({ fans, onEdit, onDelete }: FanListProps) {
  return <div>...</div>;
}
```
**FAIL:**
```tsx
const FanList = ({ fans }: FanListProps) => <div>...</div>;
export default FanList;
```

### 2. Props interface above the component

Declare a `Props` interface immediately before the component that uses it. Use `interface`, not `type`.

**PASS:**
```tsx
interface FanListProps {
  fans: FanState[];
  onEdit: (fan: FanState) => void;
}

export function FanList({ fans, onEdit }: FanListProps) {
```
**FAIL:**
```tsx
type FanListProps = {
  fans: FanState[];
  onEdit: (fan: FanState) => void;
};

export function FanList({ fans, onEdit }: FanListProps) {
```

### 3. Tailwind CSS utility classes only

Use Tailwind utility classes for all styling. Do not use CSS modules, styled-components, or inline `style` objects.

**PASS:**
```tsx
<div className="rounded-lg border border-[#dcdee0] bg-white p-4">
```
**FAIL:**
```tsx
<div style={{ borderRadius: 8, border: '1px solid #dcdee0' }}>
```

### 4. Design-token hex colors

Use these hardcoded hex values in Tailwind bracket notation. Do not use Tailwind's default color palette names for brand colors.

| Token | Hex | Tailwind class | Usage |
| --- | --- | --- | --- |
| Primary text | `#171717` | `text-[#171717]` | Headings, values |
| Secondary text | `#60646c` | `text-[#60646c]` | Labels, descriptions |
| Border | `#dcdee0` | `border-[#dcdee0]` | Card borders, dividers |
| Hover/active bg | `#f0f0f3` | `bg-[#f0f0f3]` | Button hover, active states |
| Button hover | `#2a2a2a` | `hover:bg-[#2a2a2a]` | Primary button hover |
| Success | `#16a34a` | `text-[#16a34a]` | Success state |
| Warning | `#ab6400` | `text-[#ab6400]` | Warning state |
| Error | `#dc2626` | `text-[#dc2626]` | Error state, delete hover |
| Info | `#0d74ce` | `text-[#0d74ce]` | Info state |

**PASS:**
```tsx
<h1 className="text-xl font-semibold text-[#171717]">Fans</h1>
<p className="mt-1 text-xs text-[#60646c]">3 of 8 slots used</p>
```
**FAIL:**
```tsx
<h1 className="text-xl font-semibold text-gray-900">Fans</h1>
<p className="mt-1 text-xs text-gray-500">3 of 8 slots used</p>
```

### 5. Variant styling via Record maps

When a component has visual variants (status badges, alert types), define a `Record<VariantType, { bg: string; text: string; label: string }>` constant above the component.

**PASS:**
```tsx
type Status = "ok" | "warning" | "error";

const STATUS_STYLES: Record<Status, { bg: string; text: string; label: string }> = {
  ok: { bg: "bg-[#dcfce7]", text: "text-[#16a34a]", label: "OK" },
  warning: { bg: "bg-[#fef9c3]", text: "text-[#ab6400]", label: "Warning" },
  error: { bg: "bg-[#fee2e2]", text: "text-[#dc2626]", label: "Error" },
};
```
**FAIL:**
```tsx
function getStatusColor(status: string) {
  if (status === "ok") return "green";
  if (status === "warning") return "yellow";
  return "red";
}
```

### 6. lucide-react for all icons

Import icons from `lucide-react`. Do not use inline SVG, emoji, or other icon libraries.

**PASS:**
```tsx
import { Plus, Pencil, Trash2 } from "lucide-react";
```
**FAIL:**
```tsx
<svg viewBox="0 0 24 24">...</svg>
```

### 7. Error string coercion with String(err)

Wrap caught errors with `String(err)` when interpolating into template literals. Do not access `.message` directly.

**PASS:**
```tsx
catch (err) {
  showToast(`Failed to load fans: ${String(err)}`, "error");
}
```
**FAIL:**
```tsx
catch (err) {
  showToast(`Failed to load fans: ${(err as Error).message}`, "error");
}
```

### 8. showToast for user feedback

Use the `useToast()` hook from `../stores/toastStore` for all user-facing notifications. Do not use `alert()` or `console.log` for user feedback.

**PASS:**
```tsx
const { showToast } = useToast();
showToast("Fan created", "success");
```
**FAIL:**
```tsx
alert("Fan created");
```

### 9. Loose equality null guard

Use `== null` (loose equality) to check for both `null` and `undefined` on `activeDeviceId`. Place the guard at the top of every async handler.

**PASS:**
```tsx
const fetchFans = useCallback(async () => {
  if (activeDeviceId == null) return;
  // ...
}, [activeDeviceId]);
```
**FAIL:**
```tsx
const fetchFans = useCallback(async () => {
  if (activeDeviceId === null || activeDeviceId === undefined) return;
  // ...
}, [activeDeviceId]);
```

### 10. Snake_case field names in API types

All interface field names use `snake_case` to match Rust serde serialization. Do not use `camelCase` or add a mapping layer.

**PASS:**
```tsx
export interface FanState {
  slot: number;
  name: string;
  curve_slot: number | null;
  manual_duty: number;
}
```
**FAIL:**
```tsx
export interface FanState {
  slot: number;
  name: string;
  curveSlot: number | null;
  manualDuty: number;
}
```

### 11. Zustand store pattern

Define a TypeScript `interface` for the store shape. Create the hook via `create<Interface>((set) => ({ ... }))`. Define actions inline. Do not use middleware (no `persist`, no `devtools`).

**PASS:**
```ts
interface DeviceStore {
  activeDeviceId: number | null;
  setActiveDevice: (id: number | null) => void;
}

export const useDeviceStore = create<DeviceStore>((set) => ({
  activeDeviceId: null,
  setActiveDevice: (id) => set({ activeDeviceId: id }),
}));
```
**FAIL:**
```ts
export const useDeviceStore = create<DeviceStore>()(
  devtools(
    persist(
      (set) => ({
        activeDeviceId: null,
        setActiveDevice: (id) => set({ activeDeviceId: id }),
      }),
      { name: "device-store" }
    )
  )
);
```

### 12. Raw useState for forms

Do not use form libraries (react-hook-form, formik). Back each form field with an individual `useState` call initialized from `initialData?.field ?? defaultValue`.

**PASS:**
```tsx
const [name, setName] = useState(initialData?.name ?? "");
const [duty, setDuty] = useState(initialData?.manual_duty ?? 50);
```
**FAIL:**
```tsx
const { register, handleSubmit } = useForm<FormValues>({
  defaultValues: { name: initialData?.name ?? "" },
});
```

### 13. Explicit type="button" on buttons

Add `type="button"` to all `<button>` elements that are not submit buttons. This prevents unintended form submissions.

**PASS:**
```tsx
<button type="button" onClick={onCancel}>Cancel</button>
<button type="submit">Create</button>
```
**FAIL:**
```tsx
<button onClick={onCancel}>Cancel</button>
```

### 14. Relative imports for local modules

Use relative paths for imports within the `src/` tree. Use bare package names only for npm packages.

**PASS:**
```tsx
import { api } from "../lib/api";
import { useDeviceStore } from "../stores/deviceStore";
```
**FAIL:**
```tsx
import { api } from "@/lib/api";
import { useDeviceStore } from "stores/deviceStore";
```

---

## Rust Rules

### 15. thiserror for error types

Define error enums with `#[derive(Error, Debug)]` from the `thiserror` crate. Each variant gets a `#[error("...")]` display string.

**PASS:**
```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CoapError {
    #[error("request failed: {0}")]
    RequestFailed(String),

    #[error("decode error: {0}")]
    Decode(#[from] prost::DecodeError),
}
```
**FAIL:**
```rust
#[derive(Debug)]
pub enum CoapError {
    RequestFailed(String),
    Decode(prost::DecodeError),
}

impl std::fmt::Display for CoapError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self)
    }
}
```

### 16. Debug and Clone on all domain types

Every struct that carries data derives `Debug` and `Clone`. DTOs that cross the serde boundary also derive `Serialize, Deserialize`.

**PASS:**
```rust
#[derive(Debug, Clone)]
pub struct FanState {
    pub slot: u8,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SampleRecord {
    pub device_id: i64,
    pub ts: DateTime<Utc>,
}
```
**FAIL:**
```rust
pub struct FanState {
    slot: u8,
    name: String,
}
```

### 17. All fields pub

Struct fields are `pub` by default. Do not use private fields on domain types or DTOs.

**PASS:**
```rust
pub struct AppState {
    pub connections: Arc<Mutex<HashMap<u32, DeviceConnection>>>,
    pub db: espfm_store::Database,
}
```
**FAIL:**
```rust
pub struct AppState {
    connections: Arc<Mutex<HashMap<u32, DeviceConnection>>>,
    db: espfm_store::Database,
}
```

### 18. From<proto::X> for domain conversion

Implement `From<proto::ProtoType> for DomainType` to convert protobuf types into domain types. Handle enum conversion with `try_from` + match, numeric codes with `format!`.

**PASS:**
```rust
impl From<proto::FanInfo> for FanState {
    fn from(p: proto::FanInfo) -> Self {
        Self {
            slot: p.slot as u8,
            name: p.name,
            mode: proto::FanMode::try_from(p.mode)
                .map(|m| match m {
                    proto::FanMode::Auto => "auto",
                    proto::FanMode::Manual => "manual",
                })
                .unwrap_or("auto")
                .to_string(),
        }
    }
}
```
**FAIL:**
```rust
fn fan_from_proto(p: proto::FanInfo) -> FanState {
    FanState {
        slot: p.slot as u8,
        name: p.name,
        mode: format!("{}", p.mode),
    }
}
```

### 19. chrono with RFC 3339 for timestamps

Use `chrono::{DateTime, Utc}` for timestamp fields. Store as RFC 3339 strings in SQLite. Parse back with `DateTime::parse_from_rfc3339`.

**PASS:**
```rust
use chrono::{DateTime, Utc};

pub struct Sample {
    pub ts: DateTime<Utc>,
}

// Insert
conn.execute("INSERT INTO samples (ts) VALUES (?1)", params![sample.ts.to_rfc3339()])?;

// Query
let ts: DateTime<Utc> = DateTime::parse_from_rfc3339(&row.get::<_, String>(0)?)
    .unwrap()
    .with_timezone(&Utc);
```
**FAIL:**
```rust
// Insert
conn.execute("INSERT INTO samples (ts) VALUES (?1)", params![sample.ts.timestamp()])?;
```

### 20. Re-export from lib.rs

Re-export a crate's primary types from `lib.rs` via `pub use`. Consumers import from the crate root, not internal modules.

**PASS:**
```rust
// crates/espfm-coap/src/lib.rs
pub use client::CoapClient;
pub use types::*;
pub use error::CoapError;
```
**FAIL:**
```rust
// crates/espfm-coap/src/lib.rs
pub mod client;
pub mod types;
pub mod error;
// (no re-exports — consumers must write espfm_coap::client::CoapClient)
```

### 21. Tauri command pattern

Annotate with `#[tauri::command]`. First parameter is `device_id: u32`. Last parameter is `state: State<'_, AppState>`. Return `Result<T, String>`. Lock connections, validate device, call CoAP client, map result.

**PASS:**
```rust
#[tauri::command]
pub async fn get_fans(
    device_id: u32,
    state: State<'_, AppState>,
) -> Result<Vec<FanState>, String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    let fans = conn
        .client
        .get_fans()
        .await
        .map_err(|e| format!("get_fans failed: {e}"))?;
    Ok(fans.into_iter().map(FanState::from).collect())
}
```
**FAIL:**
```rust
#[tauri::command]
pub async fn get_fans(state: State<'_, AppState>) -> Result<Vec<FanState>, String> {
    let conn = state.connections.lock().await;
    let client = conn.values().next().unwrap();
    Ok(client.get_fans().await.unwrap())
}
```

### 22. Section comments group by domain

Use `// ── {Domain} {category} ──` comments to group related functions or structs. Do not use `// ===` or `// ---`.

**PASS:**
```rust
// ── Fan commands ──

#[tauri::command]
pub async fn get_fans(...) { ... }

#[tauri::command]
pub async fn create_fan(...) { ... }

// ── Source commands ──

#[tauri::command]
pub async fn get_sources(...) { ... }
```
**FAIL:**
```rust
// Fan commands
#[tauri::command]
pub async fn get_fans(...) { ... }

// Source commands
#[tauri::command]
pub async fn get_sources(...) { ... }
```

### 23. Test module convention

Place tests in `#[cfg(test)] mod tests` at the bottom of the file. Use `use super::*`. Create an in-memory `setup_db()` helper for database tests.

**PASS:**
```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;

    fn setup_db() -> Database {
        let db = Database::open_in_memory().unwrap();
        db.conn()
            .execute("INSERT INTO devices (hostname) VALUES ('test')", [])
            .unwrap();
        db
    }

    #[test]
    fn test_insert_and_query_sample() {
        let db = setup_db();
        let conn = db.conn();
        // ...
    }
}
```
**FAIL:**
```rust
#[test]
fn test_sample() {
    let conn = Connection::open_in_memory().unwrap();
    // missing setup_db helper, duplicated setup
}
```

---

## Package / Directory Structure

### Frontend (`src/`)

| Directory | Purpose |
| --- | --- |
| `src/pages/` | Page-level route components (`FansPage`, `SourcesPage`, etc.) |
| `src/components/fans/` | Fan domain: `FanList`, `FanForm` |
| `src/components/sources/` | Source domain: `SourceList`, `SourceForm`, `Ds18b20Scanner` |
| `src/components/curves/` | Curve domain: `CurveList`, `CurveEditor` |
| `src/components/schedules/` | Schedule domain: `ScheduleList`, `ScheduleForm` |
| `src/components/dashboard/` | Dashboard cards and charts |
| `src/components/layout/` | App shell: `Layout`, sidebar, navigation |
| `src/components/ui/` | Shared presentational: `EmptyState`, `Toast` |
| `src/components/logs/` | Log viewer |
| `src/components/devices/` | Device manager |
| `src/components/system/` | System info panel |
| `src/components/wifi/` | WiFi scanner and connector |
| `src/stores/` | Zustand stores: `deviceStore`, `toastStore`, `chartStore` |
| `src/lib/` | API client, event bus, type definitions, utilities |
| `src/App.tsx` | Router (only default export in the codebase) |
| `src/main.tsx` | React entry point |

### Backend (`src-tauri/src/`)

| File | Purpose |
| --- | --- |
| `src-tauri/src/main.rs` | Thin entry point, calls `lib::run()` |
| `src-tauri/src/lib.rs` | Tauri builder, module declarations, `generate_handler![]` |
| `src-tauri/src/commands.rs` | All `#[tauri::command]` functions and DTO structs |
| `src-tauri/src/state.rs` | `AppState` struct with `Arc<Mutex<...>>` fields |

### Rust crates (`crates/`)

| Crate | Purpose |
| --- | --- |
| `crates/espfm-coap/` | CoAP client: `client.rs`, `types.rs`, `codec.rs`, `error.rs` |
| `crates/espfm-store/` | SQLite storage: `db.rs`, `samples.rs`, `app_state.rs`, `config.rs` |
| `crates/espfm-mdns/` | mDNS discovery: `discovery.rs` |

---

## Checklist

Before submitting any code change, verify:

- [ ] Every React component uses `export function` (not `export default`, not arrow function).
- [ ] Props interface declared above the component using `interface` (not `type`).
- [ ] All styling via Tailwind utility classes with hardcoded hex design tokens.
- [ ] Icons from `lucide-react`.
- [ ] Error coercion uses `String(err)`.
- [ ] User feedback uses `showToast`, not `alert()`.
- [ ] Null guard uses `== null` (loose equality) on `activeDeviceId`.
- [ ] API type fields use `snake_case`.
- [ ] Zustand stores use `create<Interface>` with no middleware.
- [ ] Forms use raw `useState` per field, no form library.
- [ ] Non-submit buttons have `type="button"`.
- [ ] Local imports use relative paths.
- [ ] Rust domain types derive `Debug, Clone` (plus `Serialize, Deserialize` for data structs).
- [ ] Rust struct fields are `pub`.
- [ ] Proto-to-domain conversion uses `From<proto::X>`.
- [ ] Timestamps use `chrono::DateTime<Utc>` and RFC 3339.
- [ ] Crate primary types re-exported from `lib.rs`.
- [ ] Tauri commands follow lock-get-call-map pattern with `device_id` first, `State` last.
- [ ] Section comments use `// ── Domain ──` format.
- [ ] Tests in `#[cfg(test)] mod tests` with `use super::*` and `setup_db()` helper.
