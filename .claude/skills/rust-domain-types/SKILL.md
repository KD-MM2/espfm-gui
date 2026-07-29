---
name: rust-domain-types
description: Create or modify a Rust domain type struct in this repo. Covers `#[derive(Debug, Clone)]`, all-pub fields, `impl From<proto::X>` with enum-to-string conversion and ROM formatting, and glob re-export from `lib.rs`. Apply when adding a new domain struct that maps from a protobuf type.
---

# Rust Domain Types

Location: `crates/espfm-coap/src/types.rs` (single file for all domain types).
Base / interface: none.
Proto source: `crates/espfm-coap/src/proto/` (generated prost types).

## Definitions

| Term | Meaning |
| --- | --- |
| Domain type | A plain Rust struct representing a device entity on the GUI side, with `From<proto::X>` to convert from the protobuf wire type. |
| Proto type | A prost-generated struct or enum in `crate::proto` (e.g. `proto::FanInfo`, `proto::FanMode`). |
| Enum-to-string | A `match` on a protobuf enum's `try_from(i32)` result, producing a `String` label for each variant. |
| ROM code | A 64-bit hardware identifier formatted as a 16-character uppercase hex string via `format!("{:016X}", code)`. |

## Steps

### 1. Add the domain struct

Add the struct to `crates/espfm-coap/src/types.rs`. Place it near the top of the file, grouped with related types.

```rust
/// {Doc comment describing what this type represents.}
#[derive(Debug, Clone)]
pub struct {DomainType} {
    pub {field}: {type},
}
```

Rules:
- Every field MUST be `pub`.
- Derive exactly `Debug, Clone`. Do NOT add `Serialize`, `Deserialize`, or any other derive.
- Name the struct with a domain noun in PascalCase (e.g. `FanState`, `TempSource`, `CurveInfo`, `WifiAp`).
- Use `String` for enum-like fields that are converted from protobuf enums (not the enum type itself).
- Use `Option<String>` for nullable/optional fields (e.g. `rom_code: Option<String>`).
- Use `u32` for integer IDs and numeric values. Use `f32` for temperatures. Use `i32` for signed values like RSSI. Use `bool` for flags.

PASS:
```rust
/// Runtime state of a single fan slot.
#[derive(Debug, Clone)]
pub struct FanState {
    pub slot: u32,
    pub name: String,
    pub mode: String,
    pub enabled: bool,
}
```

FAIL:
```rust
#[derive(Debug, Clone, Serialize)]
struct fan_state {
    slot: u32,
    name: String,
}
```

### 2. Implement `From<proto::X>` for the domain type

Add the `From` implementation directly below the struct definition, in the same file.

```rust
impl From<proto::{ProtoType}> for {DomainType} {
    fn from(p: proto::{ProtoType}) -> Self {
        Self {
            {field}: {conversion_expression},
        }
    }
}
```

Rules:
- The parameter name MUST be a short lowercase initial of the proto type (e.g. `f` for `FanInfo`, `s` for `SourceInfo`, `c` for `CurveInfo`).
- For plain fields (same type, direct mapping): use `p.{field}` directly (e.g. `name: p.name`, `slot: p.id`).
- For enum fields: use `proto::{Enum}::try_from(p.{field})` with a `match` arm per variant producing a string label, and a wildcard default. See Step 3.
- For ROM code fields (u64 hardware ID): use `format!("{:016X}", p.{field})` for a non-zero value, or `None` for zero. See Step 4.
- For nested message fields (e.g. `Vec<CurvePoint>`): use `.into_iter().map(|item| SubType { ... }).collect()`. See Step 5.

PASS:
```rust
impl From<proto::ScheduleInfo> for ScheduleInfo {
    fn from(s: proto::ScheduleInfo) -> Self {
        Self {
            slot: s.id,
            fan_id: s.fan_id,
            duty: s.duty,
            start_min: s.start_min,
            end_min: s.end_min,
            enabled: s.enabled,
        }
    }
}
```

FAIL:
```rust
impl From<proto::ScheduleInfo> for ScheduleInfo {
    fn from(info: proto::ScheduleInfo) -> Self {
        Self { slot: info.id, fan_id: info.fan_id, duty: info.duty }
    }
}
```

FAIL reasons: parameter name `info` does not match the short-initial convention; missing fields `start_min`, `end_min`, `enabled`.

### 3. Convert enum fields with `try_from` + match

For every protobuf enum field, convert the `i32` to a string label. Pattern:

```rust
let {field_name} = match proto::{Enum}::try_from(p.{field}) {
    Ok(proto::{Enum}::{Variant1}) => "{label1}",
    Ok(proto::{Enum}::{Variant2}) => "{label2}",
    _ => "{default_label}",
}
.to_string();
```

Rules:
- Always call `.to_string()` on the match result (the match arms are `&str`).
- The wildcard arm MUST produce a sensible default string (e.g. `"manual"`, `"none"`, `"Unknown"`, `"valid"`).
- If the enum has a clear "unset/none" variant, use that as the default. Otherwise use a lowercase label.

PASS:
```rust
let mode = match proto::FanMode::try_from(f.mode) {
    Ok(proto::FanMode::Auto) => "auto",
    _ => "manual",
}
.to_string();
```

FAIL:
```rust
let mode = proto::FanMode::try_from(f.mode).unwrap().as_str_name().to_string();
```

### 4. Convert ROM code fields with hex formatting

For a `u64` protobuf field representing a DS18B20 ROM code:

```rust
let {field_name} = if p.{rom_field} != 0 {
    Some(format!("{:016X}", p.{rom_field}))
} else {
    None
};
```

Rules:
- The domain field type MUST be `Option<String>`.
- Format as 16-character uppercase hex with zero-padding.
- A zero protobuf value means "not set" and maps to `None`.

PASS:
```rust
let rom_code = if s.ds18b20_rom_code != 0 {
    Some(format!("{:016X}", s.ds18b20_rom_code))
} else {
    None
};
```

FAIL:
```rust
let rom_code = format!("{:X}", s.ds18b20_rom_code);
```

### 5. Convert nested message fields

For a protobuf repeated message field (e.g. `Vec<proto::CurvePoint>`):

```rust
points: p.points.into_iter().map(|item| SubDomainType {
    {field}: item.{proto_field},
    ...
}).collect(),
```

Rules:
- Use `.into_iter()` (not `.iter()`) to consume the proto vector.
- Map each item to an inline struct literal (no separate `From` impl needed for sub-types that only appear inside one parent).

PASS:
```rust
points: c.points.into_iter().map(|p| CurvePoint {
    temp_c: p.temp_c,
    duty: p.duty,
}).collect(),
```

FAIL:
```rust
points: c.points.iter().map(|p| CurvePoint {
    temp_c: p.temp_c,
    duty: p.duty,
}).collect(),
```

### 6. Verify the glob re-export

The file `crates/espfm-coap/src/lib.rs` re-exports all types:

```rust
pub use types::*;
```

Rules:
- If this line already exists, no change needed. The new type is automatically exported.
- If it does not exist, add `mod types;` (if missing) and `pub use types::*;` to `lib.rs`.

PASS (`lib.rs` already has the glob re-export — no edit needed):
```rust
pub mod types;
pub use types::*;
```

FAIL (re-export missing — new type is invisible to consumers of the crate):
```rust
pub mod types;
// no pub use types::*;
```

## Checklist

- [ ] Struct derives exactly `Debug, Clone` (no other derives).
- [ ] All fields are `pub`.
- [ ] `impl From<proto::X>` is present, converting every field.
- [ ] Enum fields use `try_from` + match with a wildcard default, producing `String`.
- [ ] ROM code fields use `format!("{:016X}", ...)` with `Option<String>`.
- [ ] Nested message fields use `.into_iter().map(...).collect()`.
- [ ] Doc comment (`///`) on the struct.
- [ ] Type is re-exported via `pub use types::*` from `lib.rs` (or already covered by existing glob).
- [ ] Follows `convention` skill.
