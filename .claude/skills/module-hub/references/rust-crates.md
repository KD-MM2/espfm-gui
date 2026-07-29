# Rust Crates

Purpose: Standalone Rust libraries providing CoAP device communication, SQLite persistence, and mDNS device discovery. These crates are consumed by the Tauri backend.

## Key files

### espfm-coap

| Path | Purpose |
| --- | --- |
| `crates/espfm-coap/src/lib.rs` | Crate root. Re-exports all public types. |
| `crates/espfm-coap/src/client.rs` | `EspFmClient` struct: CoAP client with domain-specific endpoint methods. |
| `crates/espfm-coap/src/types.rs` | Domain types (`FanState`, `TempSource`, `CurveInfo`, etc.) with `From<proto::X>` conversions. |
| `crates/espfm-coap/src/codec.rs` | Protobuf encode/decode helpers. |
| `crates/espfm-coap/src/error.rs` | `CoapError` enum with `thiserror` derive. |

### espfm-store

| Path | Purpose |
| --- | --- |
| `crates/espfm-store/src/lib.rs` | Crate root. Re-exports `Database`. |
| `crates/espfm-store/src/db.rs` | `Database` struct wrapping `Mutex<Connection>`. PRAGMAs, migrations, `open_in_memory()`. |
| `crates/espfm-store/src/samples.rs` | Sample insert/query functions. Free functions taking `&Connection`. |
| `crates/espfm-store/src/app_state.rs` | App state persistence queries. |
| `crates/espfm-store/src/config.rs` | Configuration persistence queries. |

### espfm-mdns

| Path | Purpose |
| --- | --- |
| `crates/espfm-mdns/src/lib.rs` | Crate root. Re-exports discovery types. |
| `crates/espfm-mdns/src/discovery.rs` | `MdnsDiscovery` struct for `_coap._udp` service browsing. `MdnsError` enum. |

## Entry points

- `EspFmClient::new(addr)` creates a CoAP connection to a device.
- `Database::open(path)` opens/creates the SQLite database.
- `MdnsDiscovery::new()` starts mDNS service browsing.

## Data flow

Tauri backend -> `EspFmClient` methods -> CoAP request -> protobuf encode -> UDP send -> receive -> protobuf decode -> `From<proto::X>` conversion -> domain types returned.

Tauri backend -> `Database::conn()` -> free functions in `samples.rs`/`app_state.rs`/`config.rs` -> rusqlite queries -> results.

## Integration points

- `espfm-coap` depends on `libcoap-4` (CoAP protocol), `prost` (protobuf), `thiserror`.
- `espfm-store` depends on `rusqlite`, `chrono`, `serde`.
- `espfm-mdns` depends on `mdns-sd`, `thiserror`.
- All crates use `edition = "2021"`.

## Patterns

- Error types: `#[derive(Error, Debug)] pub enum {Domain}Error` with `#[error("...")]` display strings and `#[from]` for wrapped errors. Re-exported from `lib.rs`.
- Domain types: `#[derive(Debug, Clone)]` structs with `pub` fields. `impl From<proto::X>` for each. `From` impls handle enum conversion via `try_from` + match, numeric-to-string formatting (ROM codes as `{:016X}`).
- DB modules: free functions taking `conn: &Connection` as first param. `params![]` macro for binding. `rows.collect()` for `SqlResult<Vec<T>>`. Timestamps as `chrono::DateTime<Utc>` stored as RFC 3339 strings. `#[cfg(test)] mod tests` with `setup_db()` using `open_in_memory()`.
- DB handle: `Mutex<Connection>` with `unsafe impl Send + Sync`. `PRAGMA journal_mode=WAL; foreign_keys=ON`. All DDL in one `execute_batch`.
- API client: private `get/post/put/delete` helpers, public domain methods organized by section comments, protobuf encode/decode via `codec` module.
- Re-exports: every crate uses `pub use` in `lib.rs` to expose primary types.
