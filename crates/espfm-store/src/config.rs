use chrono::Utc;
use rusqlite::{params, Connection, Result as SqlResult};

/// Save a configuration snapshot for a device.
pub fn save_config_snapshot(conn: &Connection, device_id: i64, config_json: &str) -> SqlResult<i64> {
    let ts = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO config_snapshots (device_id, config_json, ts) VALUES (?1, ?2, ?3)",
        params![device_id, config_json, ts],
    )?;
    Ok(conn.last_insert_rowid())
}

/// Get the latest configuration snapshot for a device.
pub fn get_latest_snapshot(conn: &Connection, device_id: i64) -> SqlResult<Option<String>> {
    let mut stmt = conn.prepare(
        "SELECT config_json FROM config_snapshots
         WHERE device_id = ?1 ORDER BY ts DESC LIMIT 1",
    )?;
    let mut rows = stmt.query_map(params![device_id], |row| row.get::<_, String>(0))?;
    match rows.next() {
        Some(result) => Ok(Some(result?)),
        None => Ok(None),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;

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
    fn test_save_and_get_snapshot() {
        let db = setup_db();
        let conn = db.conn();

        let config = r#"{"fans":[{"id":0,"name":"cpu","duty":50}]}"#;
        let id = save_config_snapshot(&conn, 1, config).unwrap();
        assert!(id > 0);

        let retrieved = get_latest_snapshot(&conn, 1).unwrap();
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap(), config);

        // No snapshot for non-existent device
        let none = get_latest_snapshot(&conn, 99).unwrap();
        assert!(none.is_none());
    }
}
