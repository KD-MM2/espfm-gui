---
name: module-hub
description: >
  Module/area reference hub for espfm-gui. ACTIVATE when working on any area of the codebase, or when
  locating which area a file path belongs to. Covers all 7 areas: pages, domain-components,
  shared-components, stores, lib, tauri-backend, rust-crates.
---

# espfm-gui Module Reference Hub

## Definitions

| Term | Definition |
| --- | --- |
| **area** | A logical grouping of source files sharing purpose and patterns. |
| **reference file** | A `references/{area}.md` file containing area-specific patterns, key files, and data flow. |
| **path glob** | A glob pattern matching files belonging to an area. |

## How to use

1. Find the area from Routing Table A below.
2. Read its reference file: `references/{area}.md`.
3. Follow that area's patterns when creating or modifying files in it.

If a file does not match any glob in Routing Table A, check Routing Table B by task concept.

## Routing Table A -- Path to Area

| Path glob | Area | Reference |
| --- | --- | --- |
| `src/pages/**` | pages | `references/pages.md` |
| `src/components/fans/**`, `src/components/sources/**`, `src/components/curves/**`, `src/components/schedules/**` | domain-components | `references/domain-components.md` |
| `src/components/dashboard/**`, `src/components/layout/**`, `src/components/ui/**`, `src/components/logs/**`, `src/components/devices/**`, `src/components/system/**`, `src/components/wifi/**` | shared-components | `references/shared-components.md` |
| `src/stores/**` | stores | `references/stores.md` |
| `src/lib/**` | lib | `references/lib.md` |
| `src-tauri/src/**` | tauri-backend | `references/tauri-backend.md` |
| `crates/espfm-coap/src/**`, `crates/espfm-store/src/**`, `crates/espfm-mdns/src/**` | rust-crates | `references/rust-crates.md` |

## Routing Table B -- Concept to Area

| If the task mentions... | Area(s) |
| --- | --- |
| page, route, navigation, URL, `App.tsx` | pages |
| fan, source, curve, schedule (CRUD UI), entity list/form | domain-components |
| dashboard card, layout, sidebar, nav, toast, empty state, badge, modal | shared-components |
| Zustand store, `useStore`, global state, device selection, chart state | stores |
| API client, `invoke`, Tauri IPC call, event bus, event subscriber, time series buffer, type definition | lib |
| `#[tauri::command]`, `AppState`, `lib.rs` (Tauri), DTO struct, Tauri handler registration | tauri-backend |
| CoAP client, protobuf decode, `rusqlite`, database handle, `thiserror`, domain types from proto | rust-crates |

## Area Semantics

| Area | What it contains | Typical patterns |
| --- | --- | --- |
| pages | Route-level page components + `App.tsx` router + `main.tsx` entry point | Named function export, `useDeviceStore` guard, CRUD handlers with `showToast`, Tailwind styling |
| domain-components | Entity-specific UI: list cards, form modals, specialized editors (CurveEditor, Ds18b20Scanner) | `EntityList` + `EntityCard` (private), `EntityForm` with modal overlay, `useState`-per-field, slot keys |
| shared-components | Reusable presentational components: dashboard cards, layout shell, UI primitives (EmptyState, Badge, Toast) | Pure presentational, props-driven, Tailwind design tokens (`#171717`, `#60646c`, `#dcdee0`), lucide-react icons |
| stores | Zustand state stores: device selection, chart/event data, toast notifications | `create<Interface>()`, inline actions, no middleware, module-level start/stop lifecycle functions |
| lib | Shared TypeScript modules: API client, event bus, type definitions, utility classes | `invoke<T>()` wrappers, `EventBus` singleton, `TimeSeriesBuffer` class, snake_case field names matching Rust |
| tauri-backend | Rust Tauri application: IPC command handlers, shared state, DTOs, entrypoint | `#[tauri::command]` async fns, `State<'_, AppState>`, lock-get-call-map pattern, `generate_handler![]` registration |
| rust-crates | Standalone Rust libraries: CoAP client (`espfm-coap`), SQLite store (`espfm-store`), mDNS discovery (`espfm-mdns`) | `thiserror` errors, `From<proto::X>` conversions, `rusqlite` free functions, `chrono` RFC 3339 timestamps |
