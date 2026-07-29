---
name: tauri-command
description: Create or modify a Tauri IPC command in this repo. Covers the `#[tauri::command]` annotation, device-scoped and database-scoped patterns, `State<'_, AppState>` injection, lock-get-call-map error handling, and registration in `lib.rs`.
---

# Tauri Command

Location: `src-tauri/src/commands.rs` — all commands live in this single file.
Base / interface: none — commands are free `async fn` with `#[tauri::command]`.

## Definitions

| Term | Meaning |
| --- | --- |
| **device-scoped command** | A command that communicates with a physical device over CoAP via `DeviceConnection`. Requires `device_id: u32` as the first parameter. |
| **database-scoped command** | A command that reads/writes local SQLite via `espfm_store`. Does NOT require `device_id`. Uses `state.db.conn()` directly. |
| **DTO** | A request or response struct annotated with `#[derive(Serialize, Deserialize, Debug, Clone)]`. Defined at the top of `commands.rs`. |
| **AppState** | The shared state struct (defined in `src-tauri/src/state.rs`) holding `Arc<Mutex<...>>` resources and `db: espfm_store::Database`. |
| **DeviceConnection** | A struct holding a CoAP client for one device, stored in `state.connections` keyed by `u32` device ID. |

## Prerequisites

- `src-tauri/src/state.rs` defines `AppState` with the resource you need (connections map, active device, db).
- `src-tauri/src/commands.rs` already imports `serde::{Serialize, Deserialize}`, `tauri::State`, and the `AppState` type.
- A DTO struct exists or will be created for the command's request/response payload.

## Steps

### 1. Define the DTO struct (if needed)

Place request/response structs in the `// -- Response / Request types --` section at the top of `commands.rs`.

**Response DTO pattern:**
```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct {Entity}State {
    pub {field}: {PrimitiveType},
    pub {optional_field}: Option<{Type}>,
}
```

**Request DTO pattern (update/partial):**
```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Update{Entity}Request {
    pub {field}: Option<{Type}>,
}
```

Naming conventions:
- Response: `{Entity}State`, `{Entity}Response`, or `{Entity}Info`.
- Create request: `Create{Entity}Request`.
- Update request: `Update{Entity}Request` — ALL fields are `Option<T>` for partial updates.
- All fields are `pub`.

### 2. Write the command function

**Device-scoped command (CoAP):**
```rust
#[tauri::command]
pub async fn {verb}_{noun}(
    device_id: u32,
    {param}: {Type},
    state: State<'_, AppState>,
) -> Result<{ResponseType}, String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    let result = conn
        .client
        .{coap_method}({args})
        .await
        .map_err(|e| format!("{coap_method} failed: {e}"))?;
    Ok({map_to_dto}(result))
}
```

**Database-scoped command (local store):**
```rust
#[tauri::command]
pub async fn {verb}_{noun}(
    state: State<'_, AppState>,
    {param}: {Type},
) -> Result<{ResponseType}, String> {
    let db = state.db.conn();
    let result = db.{query_method}({args})
        .map_err(|e| format!("{verb}_{noun} failed: {e}"))?;
    Ok({map_to_dto}(result))
}
```

### 3. Register the command in lib.rs

Add `commands::{fn_name}` to the `tauri::generate_handler![...]` macro in `src-tauri/src/lib.rs`.

```rust
.invoke_handler(tauri::generate_handler![
    commands::{existing_cmd1},
    commands::{existing_cmd2},
    commands::{new_cmd},       // <-- add here
])
```

### 4. Add domain section comment

Group the command under its domain section header in `commands.rs`. Existing sections:
- `// -- Fan commands --`
- `// -- Source commands --`
- `// -- Curve commands --`
- `// -- Schedule commands --`
- `// -- System commands --`
- `// -- WiFi commands --`
- `// -- DS18B20 commands --`
- `// -- Database/store commands --`

If the command belongs to a new domain, add a new section comment.

## Checklist

- [ ] `#[tauri::command]` annotation present on the function.
- [ ] Function is `pub async fn`.
- [ ] Device-scoped: first param is `device_id: u32`, last param is `state: State<'_, AppState>`.
- [ ] Database-scoped: uses `state.db.conn()`, no `device_id` param.
- [ ] Return type is `Result<T, String>`.
- [ ] Error string follows `"{method} failed: {e}"` or `"{verb}_{noun} failed: {e}"` format.
- [ ] Device-scoped: lock → get → validate → call → map pattern used.
- [ ] DTO struct defined in the types section with correct derive macros.
- [ ] Command registered in `tauri::generate_handler![...]` in `lib.rs`.
- [ ] Command placed under the correct domain section comment.
- [ ] Scalar casts (`u32` to `u8`) done inline at the call site, not in a helper.
- [ ] Follows `convention` skill.
