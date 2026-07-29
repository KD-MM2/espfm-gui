# Tauri Backend

Purpose: Rust application powering the Tauri desktop shell. Handles all IPC commands from the frontend, manages device connections via CoAP, and provides shared application state.

## Key files

| Path | Purpose |
| --- | --- |
| `src-tauri/src/lib.rs` | Tauri entry point. Module declarations, `AppState` initialization, `generate_handler![]` registration. |
| `src-tauri/src/main.rs` | Thin wrapper: `fn main() { espfm_gui_lib::run() }`. |
| `src-tauri/src/commands.rs` | All 41 `#[tauri::command]` handlers. DTO structs defined at top. |
| `src-tauri/src/state.rs` | `AppState` struct with `Arc<Mutex<...>>` fields for shared resources. |

## Entry points

`lib.rs::run()` is the Tauri entry point. Every `#[tauri::command]` in `commands.rs` is a frontend-callable IPC endpoint registered via `generate_handler![]`.

## Data flow

Frontend `invoke("command_name", { params })` -> Tauri dispatches to `commands::{fn_name}` -> handler locks `AppState` -> gets `DeviceConnection` -> calls `conn.client.{method}().await` -> maps CoAP response to DTO struct -> returns `Result<T, String>`.

Database commands skip CoAP and call `espfm_store` modules directly via `&state.db.conn()`.

## Integration points

- Imports `espfm_coap::EspFmClient` for device communication.
- Imports `espfm_store::Database` for local persistence.
- DTOs in `commands.rs` mirror the CoAP protobuf response types.
- `AppState` holds `HashMap<u32, DeviceConnection>` for multi-device support.

## Patterns

- Command pattern: `#[tauri::command] pub async fn {verb}_{noun}(device_id: u32, [params], state: State<'_, AppState>) -> Result<T, String>`.
- Error format: `"{verb}_{noun} failed: {e}"`.
- Lock-get-call-map: `state.connections.lock().await` -> `.get(&device_id).ok_or_else(...)` -> `conn.client.{method}().await.map_err(...)` -> map to DTO.
- DTO naming: `{Entity}State` (response), `Create{Entity}Request`/`Update{Entity}Request` (request). All fields `pub`. Derives: `Serialize, Deserialize, Debug, Clone`.
- `Option<T>` for optional fields in update requests.
- `tokio::sync::Mutex` for async-safe locking.
- Section comments group commands by domain: `// -- Fan commands --`.
