---
name: rust-db-module
description: >
  Create or modify a rusqlite database module in espfm-store. Covers free-function query/insert pattern
  with `conn: &Connection` first parameter, serde data structs, chrono timestamps as RFC 3339 strings,
  `params![]` macro binding, `_direct` server-timestamp variants, cleanup functions, and in-memory test
  fixtures with `Database::open_in_memory()`. ACTIVATE when adding or editing files under
  crates/espfm-store/src/.
---

# Rust Database Module

Location: `crates/espfm-store/src/{module}.rs`.
Handle: `crate::db::Database` (wraps `Mutex<Connection>`, provides `conn()` returning `MutexGuard`).
Library root: `crates/espfm-store/src/lib.rs` — declare module with `pub mod {module};`, re-export data structs if public API.

## Definitions

| Term | Definition |
| --- | --- |
| **db module** | A single `.rs` file in `crates/espfm-store/src/` that defines data structs and free functions operating on `rusqlite::Connection`. |
| **data struct** | A `pub struct` with `#[derive(Debug, Clone, Serialize, Deserialize)]` representing one database row. |
| **insert function** | A `pub fn` taking `conn: &Connection` + data ref, returning `SqlResult<i64>` (last insert rowid). |
| **query function** | A `pub fn` taking `conn: &Connection` + filter params, returning `SqlResult<Vec<T>>` or `SqlResult<Option<T>>`. |
| **_direct variant** | An insert function that does not accept a timestamp parameter; instead uses SQL `datetime('now')` to generate the timestamp server-side. |
| **cleanup function** | A `pub fn` taking `conn: &Connection` that deletes rows older than a threshold, returning `SqlResult<usize>` or `SqlResult<(usize, usize)>`. |

## Steps

### 1. Define the data struct(s)

Each data struct represents one database table row. Fields map 1:1 to table columns.

```rust
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// {Doc comment describing what this record represents.}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct {Record} {
    pub id: i64,
    pub device_id: i64,
    pub {field}: {type},
    pub ts: DateTime<Utc>,
}
```

**Field type rules:**
- Timestamps use `DateTime<Utc>` when the caller controls the value.
- Timestamps use `String` when the value comes from SQL `datetime('now')` and is stored/read as a raw string (see `ActivityEntry.ts`).
- Nullable columns use `Option<T>` (e.g. `pub message: Option<String>`).
- IDs are `i64`. Numeric measurements use `i32`, `f64` as appropriate.

### 2. Write insert functions

Each insert function takes `conn: &Connection` as its first parameter and the data struct (or individual fields) as subsequent parameters. Returns `SqlResult<i64>`.

```rust
use rusqlite::{params, Connection, Result as SqlResult};

/// {Doc comment.}
pub fn insert_{record}(conn: &Connection, sample: &{Record}) -> SqlResult<i64> {
    conn.execute(
        "INSERT INTO {table} ({columns}) VALUES (?1, ?2, ...)",
        params![
            sample.{field1},
            sample.{field2},
            sample.ts.to_rfc3339(),
        ],
    )?;
    Ok(conn.last_insert_rowid())
}
```

**PASS:** `sample.ts.to_rfc3339()` for caller-controlled timestamps.
**FAIL:** Passing a `DateTime<Utc>` directly to `params![]` — rusqlite does not natively serialize `chrono` types.

#### _direct variant (server-generated timestamp)

When the caller should not control the timestamp, provide a `_direct` variant that uses SQL `datetime('now')` and accepts individual field parameters instead of the full struct.

```rust
/// {Doc comment.} Timestamp generated server-side via datetime('now').
pub fn insert_{record}_direct(
    conn: &Connection,
    device_id: i64,
    {field}: {type},
) -> SqlResult<i64> {
    conn.execute(
        "INSERT INTO {table} ({columns}, ts) VALUES (?1, ?2, datetime('now'))",
        params![device_id, {field}],
    )?;
    Ok(conn.last_insert_rowid())
}
```

### 3. Write query functions

Query functions return `SqlResult<Vec<T>>` for multi-row results or `SqlResult<Option<T>>` for single-row lookups. Use `conn.prepare()` + `stmt.query_map()` + `rows.collect()`.

```rust
/// {Doc comment.}
pub fn get_{records}(
    conn: &Connection,
    device_id: i64,
    since: &DateTime<Utc>,
) -> SqlResult<Vec<{Record}>> {
    let mut stmt = conn.prepare(
        "SELECT {columns} FROM {table}
         WHERE device_id = ?1 AND ts >= ?2 ORDER BY ts",
    )?;
    let rows = stmt.query_map(params![device_id, since.to_rfc3339()], |row| {
        let ts_str: String = row.get({idx})?;
        Ok({Record} {
            {field1}: row.get(0)?,
            {field2}: row.get(1)?,
            ts: DateTime::parse_from_rfc3339(&ts_str)
                .unwrap()
                .with_timezone(&Utc),
        })
    })?;
    rows.collect()
}
```

**Timestamp parsing pattern:** Read the `ts` column as `String`, then parse with `DateTime::parse_from_rfc3339(&ts_str).unwrap().with_timezone(&Utc)`. For non-critical display queries, use `.unwrap_or_default()` instead of `.unwrap()`.

**PASS:** `rows.collect()` returns `SqlResult<Vec<T>>` directly.
**FAIL:** Manually iterating with `while let Some(row) = rows.next()` and pushing to a `Vec` — use `collect()` unless branching on optional filters (see `get_activity_log_filtered` in `samples.rs`).

#### Single-row query (returns `Option<T>`)

```rust
/// {Doc comment.}
pub fn get_{record}(conn: &Connection, id: i64) -> SqlResult<Option<String>> {
    let mut stmt = conn.prepare(
        "SELECT {column} FROM {table} WHERE id = ?1",
    )?;
    let mut rows = stmt.query_map(params![id], |row| row.get::<_, String>(0))?;
    match rows.next() {
        Some(result) => Ok(Some(result?)),
        None => Ok(None),
    }
}
```

### 4. Write cleanup functions

Cleanup functions delete rows older than a time threshold. Return `SqlResult<usize>` (deleted row count) or `SqlResult<(usize, usize)>` when cleaning multiple tables.

```rust
/// Delete raw {entity} samples older than {threshold}.
pub fn cleanup_old_{records}(conn: &Connection) -> SqlResult<usize> {
    let count = conn.execute(
        "DELETE FROM {table} WHERE ts < datetime('now', '-{threshold}')",
        [],
    )?;
    Ok(count)
}
```

**Observed thresholds from `samples.rs`:** raw samples at `'-24 hours'`, 1-minute downsampled at `'-7 days'`, 5-minute downsampled at `'-30 days'`, activity log trimmed to `LIMIT 1000`.

### 5. Add test module

Every db module MUST have a `#[cfg(test)] mod tests` block. Use `Database::open_in_memory()` for isolation. If the table has foreign keys to `devices`, insert a test device first.

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;

    /// Create an in-memory database and insert prerequisite rows.
    fn setup_db() -> Database {
        let db = Database::open_in_memory().unwrap();
        db.conn()
            .execute(
                "INSERT INTO devices (hostname) VALUES ('test-device')",
                [],
            )
            .unwrap();
        db
    }

    #[test]
    fn test_insert_and_query_{record}() {
        let db = setup_db();
        let conn = db.conn();

        // Insert
        let sample = {Record} {
            device_id: 1,
            {field}: {value},
            ts: Utc::now(),
        };
        let id = insert_{record}(&conn, &sample).unwrap();
        assert!(id > 0);

        // Query
        let results = get_{records}(&conn, 1, &Utc::now() - chrono::Duration::hours(1)).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].{field}, {value});
    }
}
```

### 6. Register the module in lib.rs

Add `pub mod {module};` to `crates/espfm-store/src/lib.rs`. If the module's data structs are part of the crate's public API, add `pub use {module}::{Struct1, Struct2};`.

```rust
// crates/espfm-store/src/lib.rs
pub mod {module};
// ... existing modules ...
```

## Checklist

- [ ] Data struct derives `Debug, Clone, Serialize, Deserialize`.
- [ ] Every insert function takes `conn: &Connection` as first parameter and returns `SqlResult<i64>`.
- [ ] Timestamps stored via `.to_rfc3339()` or SQL `datetime('now')` — never raw `DateTime<Utc>` in params.
- [ ] Query functions use `conn.prepare()` + `stmt.query_map()` + `rows.collect()`.
- [ ] Timestamp columns read as `String` then parsed with `DateTime::parse_from_rfc3339()`.
- [ ] `_direct` variant provided when server-side timestamp generation is needed.
- [ ] Cleanup functions use `datetime('now', '-{interval}')` for threshold comparison.
- [ ] `#[cfg(test)] mod tests` present with `setup_db()` using `Database::open_in_memory()`.
- [ ] Foreign-key prerequisite rows inserted in `setup_db()` (e.g. `INSERT INTO devices`).
- [ ] Module declared in `crates/espfm-store/src/lib.rs` via `pub mod`.
- [ ] Follows `convention` skill (snake_case, doc comments, Rust naming).
