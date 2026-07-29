use rusqlite::{params, Connection, Result as SqlResult};

pub fn set_app_state(conn: &Connection, key: &str, value: &str) -> SqlResult<()> {
    conn.execute(
        "INSERT OR REPLACE INTO app_state (key, value) VALUES (?1, ?2)",
        params![key, value],
    )?;
    Ok(())
}

pub fn delete_app_state(conn: &Connection, key: &str) -> SqlResult<bool> {
    let changed = conn.execute("DELETE FROM app_state WHERE key = ?1", params![key])?;
    Ok(changed > 0)
}

pub fn get_app_state(conn: &Connection, key: &str) -> SqlResult<Option<String>> {
    let mut stmt = conn.prepare("SELECT value FROM app_state WHERE key = ?1")?;
    let mut rows = stmt.query_map(params![key], |row| row.get::<_, String>(0))?;
    match rows.next() {
        Some(row) => Ok(Some(row?)),
        None => Ok(None),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;

    #[test]
    fn test_set_and_get_app_state() {
        let db = Database::open_in_memory().unwrap();
        let conn = db.conn();
        set_app_state(&conn, "last_active_device", "1").unwrap();
        let val = get_app_state(&conn, "last_active_device").unwrap();
        assert_eq!(val, Some("1".to_string()));
    }

    #[test]
    fn test_get_missing_key() {
        let db = Database::open_in_memory().unwrap();
        let val = get_app_state(&db.conn(), "nonexistent").unwrap();
        assert_eq!(val, None);
    }
}
