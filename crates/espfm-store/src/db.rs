use diesel::prelude::*;
use diesel::sqlite::SqliteConnection;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};
use std::path::Path;
use std::sync::Mutex;

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!();

pub struct Database {
    conn: Mutex<SqliteConnection>,
}

// SAFETY: SqliteConnection is Send. The Mutex synchronizes access.
unsafe impl Send for Database {}
unsafe impl Sync for Database {}

impl Database {
    /// Open (or create) a SQLite database at the given path with WAL mode.
    /// Runs all pending Diesel migrations automatically.
    pub fn open(path: &Path) -> Result<Self, diesel::result::ConnectionError> {
        let mut conn = SqliteConnection::establish(path.to_str().unwrap())?;
        diesel::sql_query("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=OFF;")
            .execute(&mut conn)
            .map_err(|e| diesel::result::ConnectionError::BadConnection(e.to_string()))?;
        conn.run_pending_migrations(MIGRATIONS)
            .map_err(|e| diesel::result::ConnectionError::BadConnection(e.to_string()))?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    /// Open an in-memory database (for testing).
    pub fn open_in_memory() -> Result<Self, diesel::result::ConnectionError> {
        let mut conn = SqliteConnection::establish(":memory:")?;
        diesel::sql_query("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=OFF;")
            .execute(&mut conn)
            .map_err(|e| diesel::result::ConnectionError::BadConnection(e.to_string()))?;
        conn.run_pending_migrations(MIGRATIONS)
            .map_err(|e| diesel::result::ConnectionError::BadConnection(e.to_string()))?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    /// Access the underlying connection.
    pub fn conn(&self) -> std::sync::MutexGuard<'_, SqliteConnection> {
        self.conn.lock().unwrap()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_open_in_memory() {
        let db = Database::open_in_memory();
        assert!(db.is_ok(), "open_in_memory should succeed: {:?}", db.err());
    }

    #[test]
    fn test_tables_created() {
        let db = Database::open_in_memory().unwrap();
        let mut conn = db.conn();

        let expected_tables = [
            "devices",
            "fan_samples",
            "temp_samples",
            "activity_log",
            "app_state",
            "fan_samples_1m",
            "temp_samples_1m",
            "fan_samples_5m",
            "temp_samples_5m",
        ];

        for table in &expected_tables {
            let count: i64 = diesel::sql_query(format!(
                "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='{}'",
                table
            ))
            .get_result::<CountRow>(&mut *conn)
            .map(|r| r.count)
            .unwrap_or(0);
            assert!(count > 0, "table '{}' should exist", table);
        }
    }
}

#[derive(QueryableByName)]
struct CountRow {
    #[diesel(sql_type = diesel::sql_types::BigInt)]
    count: i64,
}
