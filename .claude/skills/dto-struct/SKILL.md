---
name: dto-struct
description: >
  Create or modify a Rust DTO (data transfer object) struct in the Tauri backend. Covers serde derive
  macros, pub field visibility, naming conventions ({Entity}State, Create{Entity}Request, Update{Entity}Request),
  Option semantics for partial updates, and embedded sub-structs. ACTIVATE when adding or changing a
  request/response struct in src-tauri/src/commands.rs.
---

# DTO Struct

Location: `src-tauri/src/commands.rs`, inside the `// -- Response / Request types --` section at the top of the file (before any `#[tauri::command]` functions).
Base / interface: none (plain data struct with derive macros).

## Definitions

| Term | Definition |
| --- | --- |
| **response DTO** | A struct returned by a `#[tauri::command]` function. Named `{Entity}State`, `{Entity}Response`, `{Entity}Info`, or `{Entity}DeviceInfo`. |
| **request DTO** | A struct received as a parameter or deserialized from a Tauri `invoke` call. Named `Create{Entity}Request` or `Update{Entity}Request`. |
| **embedded sub-struct** | A struct defined inside the same file and used as a field type in another DTO (e.g. `CurvePoint` inside `CurveState`). |
| **primitive field type** | `u8`, `u16`, `u32`, `u64`, `i32`, `i64`, `f32`, `bool`, `String`. |

## Steps

### 1. Choose the DTO variant

Determine which variant matches your use case:

- **Response DTO** -- the struct is returned from a `#[tauri::command]` function. Use the naming convention `{Entity}State` (preferred) or `{Entity}Response` or `{Entity}Info`.
- **Create request DTO** -- the struct carries fields needed to create a new entity. Name it `Create{Entity}Request`.
- **Update request DTO** -- the struct carries optional fields for a partial update. Name it `Update{Entity}Request`. ALL fields use `Option<T>`.

If the DTO contains a nested structure (e.g. a list of curve points), define the embedded sub-struct immediately above the parent struct with the same derive macros.

### 2. Write the struct

Place the struct inside the `// -- Response / Request types --` section, grouped with other DTOs of the same domain.

**Embedded sub-struct template** (if needed):

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct {SubEntity} {
    pub {field}: {PrimitiveType},
    pub {optional_field}: Option<{PrimitiveType}>,
}
```

**Response DTO template:**

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct {Entity}State {
    pub {field}: {PrimitiveType},
    pub {optional_field}: Option<{PrimitiveType}>,
    pub {list_field}: Vec<{SubEntity}>,
}
```

**Create request DTO template:**

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Create{Entity}Request {
    pub {field}: {PrimitiveType},
    pub {optional_field}: Option<{PrimitiveType}>,
}
```

**Update request DTO template:**

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Update{Entity}Request {
    pub {field}: Option<{PrimitiveType}>,
}
```

All field types MUST be one of: a primitive type, `Option<{primitive}>`, `Vec<{primitive or sub-struct}>`, or an embedded sub-struct defined in the same file.

### 3. Verify serde import

Confirm that `use serde::{Deserialize, Serialize};` exists at the top of `commands.rs`. If it does not exist, add it. The import is already present as of the current codebase (line 5).

### 4. Wire into a command (if adding a new DTO)

If this DTO is the return type of a new `#[tauri::command]` function, use it as the `Result<{Entity}State, String>` (for response DTOs) or accept it as a function parameter (for request DTOs). Do NOT add a separate parameter wrapping -- pass the struct fields directly or the struct itself as needed.

## Real Examples

**Response DTO with embedded sub-struct** (from `commands.rs` lines 80-91):

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CurveState {
    pub slot: u8,
    pub name: String,
    pub points: Vec<CurvePoint>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CurvePoint {
    pub temp_c: f32,
    pub duty: u8,
}
```

**Update request DTO with all-Option fields** (from `commands.rs` lines 48-59):

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UpdateFanRequest {
    pub name: Option<String>,
    pub mode: Option<String>,
    pub duty: Option<u32>,
    pub enabled: Option<bool>,
    pub inverted: Option<bool>,
    pub source_id: Option<u32>,
    pub curve_id: Option<u32>,
    pub schedule_id: Option<u32>,
    pub group_id: Option<u32>,
}
```

**Response DTO with one optional field** (from `commands.rs` lines 61-70):

```rust
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SourceState {
    pub slot: u8,
    pub name: String,
    pub source_type: String,
    pub temp_c: f32,
    pub rom_code: Option<String>,
    pub status: String,
    pub gpio: u8,
}
```

## Checklist

- [ ] Struct annotated with `#[derive(Serialize, Deserialize, Debug, Clone)]`.
- [ ] ALL fields are `pub`.
- [ ] Field types are primitives, `Option<T>`, `Vec<T>`, or an embedded sub-struct.
- [ ] Response DTO named `{Entity}State`, `{Entity}Response`, `{Entity}Info`, or `{Entity}DeviceInfo`.
- [ ] Create request DTO named `Create{Entity}Request`.
- [ ] Update request DTO named `Update{Entity}Request` with ALL fields wrapped in `Option<T>`.
- [ ] Embedded sub-structs (if any) defined immediately above the parent struct with the same derive macros.
- [ ] Struct placed inside the `// -- Response / Request types --` section, grouped by domain.
- [ ] `use serde::{Deserialize, Serialize};` import present at top of file.
- [ ] Follows `convention` skill.
