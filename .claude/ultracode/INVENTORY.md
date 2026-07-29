# espfm-gui — ultracode Inventory

Generated: 2026-07-29 · Stack: typescript-react-tauri · Machine profile: `.claude/ultracode/repo-profile.json`

> Route work by the tables below, BY NAME. Do not route by skill descriptions.
> When a file type in a task matches a row in "Skill Application Mapping", load the listed skill(s) via the Skill tool.

## Commands

| Purpose   | Command            |
| --------- | ------------------ |
| build     | `pnpm run build`   |
| test      | —                  |
| test-one  | —                  |
| format    | —                  |
| lint      | —                  |
| typecheck | `tsc --noEmit`     |
| run       | `pnpm run dev`     |

## Skills Inventory

| Skill                | Kind        | Load when (component / file type)                                                                 |
| -------------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| `convention`         | convention  | Always. Auto-load for any code edit.                                                              |
| `module-hub`         | module-hub  | Locating which area/module a path belongs to.                                                     |
| `tauri-command`      | creation    | Creating or modifying a Tauri IPC command in `src-tauri/src/commands.rs`.                          |
| `dto-struct`         | creation    | Creating or modifying a Rust request/response DTO struct in `src-tauri/src/commands.rs`.           |
| `rust-domain-types`  | creation    | Creating or modifying a Rust domain type with `From<proto::X>` impl in `crates/espfm-coap/`.      |
| `page`               | creation    | Creating or modifying a domain CRUD page in `src/pages/`.                                         |
| `component`          | creation    | Creating or modifying a shared presentational React component under `src/components/`.             |
| `entity-list`        | creation    | Creating or modifying an entity card-grid list component under `src/components/`.                  |
| `entity-form`        | creation    | Creating or modifying a modal entity form component under `src/components/`.                       |
| `store`              | creation    | Creating or modifying a Zustand state store under `src/stores/`.                                  |
| `event-subscriber`   | creation    | Creating or modifying an event-subscriber module under `src/lib/`.                                |
| `rust-db-module`     | creation    | Creating or modifying a rusqlite database module under `crates/espfm-store/src/`.                 |

## Skill Application Mapping

| File type being changed                                         | Skills to load                              |
| --------------------------------------------------------------- | ------------------------------------------- |
| `src-tauri/src/commands.rs`                                     | `tauri-command`, `dto-struct`, `convention` |
| `src-tauri/src/types.rs`                                        | `rust-domain-types`, `convention`           |
| `src-tauri/src/*.rs` (other backend)                            | `convention`                                |
| `src/pages/*.tsx`                                               | `page`, `convention`                        |
| `src/components/fans/**`, `sources/**`, `curves/**`, `schedules/**` | `entity-list`, `entity-form`, `convention` |
| `src/components/dashboard/**`, `layout/**`, `ui/**`, `logs/**`, `devices/**`, `system/**`, `wifi/**` | `component`, `convention` |
| `src/stores/*.ts`                                               | `store`, `convention`                       |
| `src/lib/*.ts`                                                  | `event-subscriber`, `convention`            |
| `crates/espfm-coap/src/types.rs`                                | `rust-domain-types`, `convention`           |
| `crates/espfm-store/src/*.rs`                                   | `rust-db-module`, `convention`              |
| `crates/espfm-mdns/src/*.rs`                                    | `convention`                                |
| `*.h` (any header)                                              | `convention`                                |

## Module / Area Map

| Path glob                                                                                      | Area               | Reference |
| ----------------------------------------------------------------------------------------------- | ------------------ | --------- |
| `src/pages/**`                                                                                  | pages              | —         |
| `src/components/fans/**`, `src/components/sources/**`, `src/components/curves/**`, `src/components/schedules/**` | domain-components | —         |
| `src/components/dashboard/**`, `src/components/layout/**`, `src/components/ui/**`, `src/components/logs/**`, `src/components/devices/**`, `src/components/system/**`, `src/components/wifi/**` | shared-components | —         |
| `src/stores/**`                                                                                 | stores             | —         |
| `src/lib/**`                                                                                    | lib                | —         |
| `src-tauri/src/**`                                                                              | tauri-backend      | —         |
| `crates/espfm-coap/src/**`, `crates/espfm-store/src/**`, `crates/espfm-mdns/src/**`          | rust-crates        | —         |

## Review Rule Set

Seeded from the stack reference. IDs are stable; the code-reviewer and orchestrator use them.

| ID  | Rule                                                                         | Severity | Auto-fixable |
| --- | ---------------------------------------------------------------------------- | -------- | ------------ |
| C1  | `any` used where a concrete type is known                                    | M        | no           |
| C2  | `as` cast without an inline `// reason:` justification                       | M        | no           |
| C3  | Non-null assertion `!` on an unchecked value                                 | M        | no           |
| C4  | Missing `await`/`void` on a floating Promise                                 | H        | no           |
| C5  | Missing explicit return type on an exported/`async` function                 | L        | yes          |
| C6  | `console.log` in committed code instead of a `Logger`                        | L        | yes          |
| D1  | Service issues DB queries directly instead of via a repository               | H        | no           |
| D2  | New entity/model without a matching migration                                | H        | no           |
| E1  | `throw` of a non-Error (string/object) instead of a typed error class        | M        | yes          |
| E2  | New domain error class not mapped in the global exception filter             | M        | no           |
| S1  | Missing guard/auth on a state-changing route                                 | H        | no           |
| S2  | Raw `process.env` read in feature code instead of the typed config accessor  | M        | no           |
| T1  | New exported function/provider without a test                                | H        | no           |
