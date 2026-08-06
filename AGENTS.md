# espfm-gui

Tauri v2 desktop app for managing ESP32/ESP32-S3 fan controllers (espfm-core). React 19 + Vite + TypeScript frontend, Rust backend, CoAP+Protobuf device communication, SQLite (Diesel) persistence.

## Commands

| Purpose   | Command               | Notes                                    |
| --------- | --------------------- | ---------------------------------------- |
| install   | `pnpm install`        | Frontend deps                            |
| dev       | `pnpm run dev`        | Vite dev server (frontend only)          |
| build     | `pnpm run build`      | `tsc && vite build` (frontend)           |
| typecheck | `tsc --noEmit`        | TypeScript only, no emit                 |
| run       | `cargo tauri dev`     | Full desktop app (dev, hot-reload)       |
| build app | `cargo tauri build`   | Production desktop bundle                |

There is **no test framework** configured (frontend or Rust). Typecheck + build are the verification gates.

## Architecture

### Stack

| Layer       | Technology                         | Notes                                            |
| ----------- | ---------------------------------- | ------------------------------------------------ |
| UI          | React 19 + Vite + TypeScript       | `@/*` path alias, named exports only             |
| Styling     | Tailwind v4 + shadcn/ui            | new-york style, CSS-variable theme, hardcoded hex |
| State       | Zustand (3 stores)                 | No middleware                                    |
| Desktop     | Tauri v2                           | IPC via `invoke`, single process                 |
| Charts      | Recharts + lucide-react + sonner   | Time-series fan RPM / temp                       |
| Backend     | Rust (tauri)                       | 45 Tauri commands in `src-tauri/src/commands.rs` |
| CoAP client | `espfm-coap` crate (`coap` + `prost`) | UDP, 3s timeout, protobuf via `prost`         |
| Persistence | `espfm-store` crate (Diesel 2 + SQLite) | WAL mode, `foreign_keys=OFF`               |
| Discovery   | `espfm-mdns` crate                 | mDNS device discovery                           |

### Frontend

| Path                          | Responsibility                                                        |
| ----------------------------- | --------------------------------------------------------------------- |
| `src/App.tsx`                 | Router (BrowserRouter) + Toaster                                      |
| `src/lib/api.ts`              | All Tauri `invoke` wrappers (45 commands)                             |
| `src/lib/events.ts`           | EventBus (pub/sub for `FanSample`)                                    |
| `src/lib/collectors.ts`       | Polling collector (fans 2s, sources 10s, system 30s)                  |
| `src/lib/timeSeriesBuffer.ts` | In-memory ring buffer (10k samples)                                   |
| `src/lib/monitoringSession.ts`| Session-scoped pipeline manager (generation counter for races)        |
| `src/lib/sqliteWriter.ts`     | EventBus subscriber → SQLite persistence + 5-min DB maintenance       |
| `src/lib/activityDetector.ts` | EventBus subscriber → duty-change detection                           |
| `src/lib/logUserAction.ts`    | Log to both SQLite + ActivityStore                                    |
| `src/stores/`                 | `deviceStore`, `chartStore`, `activityStore` (Zustand)                |
| `src/hooks/useAutoConnect.ts` | Auto-connect to last device on startup (reads app_state KV)           |
| `src/pages/`                  | Dashboard, Fans, Sources, Curves, Schedules, Wifi, System, Devices, Logs |
| `src/components/`             | `layout/`, `dashboard/`, `fans/`, `sources/`, `curves/`, `schedules/`, `logs/`, `ui/` |

All pages use `flex h-full flex-col`; the Layout shell uses `flex h-screen overflow-hidden`.

### Backend (Rust)

| File                       | Responsibility                                                   |
| -------------------------- | ---------------------------------------------------------------- |
| `src-tauri/src/main.rs`    | Entry point → `lib::run`                                         |
| `src-tauri/src/lib.rs`     | Tauri builder, setup (DB open), `invoke_handler` (45 commands)   |
| `src-tauri/src/commands.rs`| All 45 command implementations                                   |
| `src-tauri/src/state.rs`   | `AppState { connections, active_device_id, next_device_id, db }` |

`device_id` in Tauri commands is an **in-memory counter** (`next_device_id`, starts at 1), **not** the SQLite `devices.id` auto-increment. The two can diverge; `PRAGMA foreign_keys=OFF` is deliberate.

### Crates (Cargo workspace)

| Crate           | Purpose                                                    |
| --------------- | ---------------------------------------------------------- |
| `espfm-coap`    | `CoapClient` (UDP, ~28 methods), `codec`, `error`, domain `types` with `From<proto::X>` |
| `espfm-store`   | Diesel DB (`Mutex<SqliteConnection>`), 9 tables, migrations, `samples`/`app_state` |
| `espfm-mdns`    | mDNS device discovery                                      |

`crates/espfm-coap/proto/espfm.proto` is the **client-side mirror** of the firmware schema. It is compiled by `prost_build` (via `build.rs`) at build time — the generated code is not checked in. The firmware (`espfm-core`) is the authoritative source of truth for the wire protocol.

### Key Files

| File                                   | Purpose                                             |
| -------------------------------------- | --------------------------------------------------- |
| `PROJECT_RECONSTRUCTION.md`            | Full architecture, DB schema, data flow, known gaps |
| `crates/espfm-coap/proto/espfm.proto`  | Protobuf schema (32 messages, 5 enums)              |
| `crates/espfm-store/migrations/`       | Diesel migrations (schema source of truth)          |
| `crates/espfm-store/src/schema.rs`     | Diesel `table!` macros (generated, keep in sync)    |
| `vite.config.ts` / `tsconfig.json`     | Vite + TS path alias `@/*`                          |
| `src-tauri/tauri.conf.json`            | Tauri app config                                    |

## Protobuf Workflow (client mirror)

The firmware proto is the source of truth. When the firmware schema changes:

1. Copy the updated `espfm.proto` from `espfm-core` into `crates/espfm-coap/proto/`
2. Update domain types in `crates/espfm-coap/src/types.rs` (new `From<proto::X>` impls)
3. Rebuild so `prost_build` regenerates the code: `cargo build` (or `cargo tauri dev`)
4. Add/update Tauri commands in `src-tauri/src/commands.rs` + `src/lib/api.ts`

## Known Gaps / Gotchas

- **`/control` endpoint not exposed**: `ControlConfig` exists in the proto and the firmware implements `GET/PUT /control`, but the Rust `CoapClient` has no control methods and there are no Tauri commands for it. Add `get_control`/`set_control` when the UI needs tunable control.
- **No test framework** configured (repo-profile `test: null`). `tsc --noEmit` + `pnpm run build` are the only gates.
- **`device_id` mismatch**: in-memory connection ID vs SQLite `devices.id`; foreign keys disabled (see Architecture).
- **Single active device**: only one device is monitored at a time.
- **No auto-reconnect**: if a device goes offline, the CoAP client does not reconnect.
- **5m downsampling tables** are defined but never populated (only 1m downsampling runs).
- **No `config_snapshots` table** — config export/import uses in-memory JSON, not persisted snapshots.
- Frontend timestamps are Unix ms (`Date.now()`); SQLite timestamps are RFC 3339 (`Utc::now().to_rfc3339()`). `loadHistory()` converts.

## Project Skills

When working on this project, invoke the relevant skill for the task at hand. Skills are defined in `.claude/ultracode/INVENTORY.md` and `.claude/skills/`.

| Skill              | When to Use                                                                   |
| ------------------ | ----------------------------------------------------------------------------- |
| `convention`       | **Always.** Auto-load for any code edit.                                      |
| `module-hub`       | Locating which area/module a path belongs to.                                 |
| `tauri-command`    | Creating or modifying a Tauri IPC command in `src-tauri/src/commands.rs`.     |
| `dto-struct`       | Creating or modifying a Rust request/response DTO struct in `commands.rs`.    |
| `rust-domain-types`| Creating or modifying a domain type with `From<proto::X>` in `espfm-coap`.    |
| `page`             | Creating or modifying a domain CRUD page in `src/pages/`.                     |
| `component`        | Creating or modifying a shared presentational component in `src/components/`. |
| `entity-list`      | Creating or modifying an entity card-grid list component.                     |
| `entity-form`      | Creating or modifying a modal entity form component.                          |
| `store`            | Creating or modifying a Zustand store in `src/stores/`.                       |
| `event-subscriber` | Creating or modifying an event-subscriber module in `src/lib/`.               |
| `rust-db-module`   | Creating or modifying a Diesel ORM module in `crates/espfm-store/src/`.       |

### Skill Application Mapping

| File type being changed                                      | Skills to load                                |
| ------------------------------------------------------------ | --------------------------------------------- |
| `src-tauri/src/commands.rs`                                  | `tauri-command`, `dto-struct`, `convention`   |
| `src-tauri/src/*.rs` (other backend)                         | `convention`                                  |
| `crates/espfm-coap/src/types.rs`                             | `rust-domain-types`, `convention`             |
| `crates/espfm-store/src/*.rs`                                | `rust-db-module`, `convention`                |
| `crates/espfm-mdns/src/*.rs`                                 | `convention`                                  |
| `src/pages/*.tsx`                                            | `page`, `convention`                          |
| `src/components/{fans,sources,curves,schedules}/**`          | `entity-list`, `entity-form`, `convention`    |
| `src/components/{dashboard,layout,ui,logs,devices,system,wifi}/**` | `component`, `convention`              |
| `src/stores/*.ts`                                            | `store`, `convention`                         |
| `src/lib/*.ts`                                               | `event-subscriber`, `convention`              |

## Feature Development Workflow

Two-phase workflow for non-trivial features (same as espfm-core):

1. **Spec & Plan** — `/superpowers:brainstorming` to explore, design, and write specs + plans
   - Outputs: `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` and `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`
2. **Implement** — `/ultracode:orchestrate` with the spec and plan to execute
   - Spawns implement, code-review, and test subagents per plan phase

Firmware changes live in the parent `espfm-core` repo; GUI changes live here. Keep the two protos in sync.
