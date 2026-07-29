use rusqlite::{Connection, Result as SqlResult};
use std::path::Path;

pub struct Database {
    conn: Connection,
}

impl Database {
    /// Open (or create) a SQLite database at the given path with WAL mode and foreign keys.
    pub fn open(path: &Path) -> SqlResult<Self> {
        let conn = Connection::open(path)?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
        let db = Self { conn };
        db.migrate()?;
        Ok(db)
    }

    /// Open an in-memory database (for testing).
    pub fn open_in_memory() -> SqlResult<Self> {
        let conn = Connection::open_in_memory()?;
        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;
        let db = Self { conn };
        db.migrate()?;
        Ok(db)
    }

    /// Run all migrations to create/update tables and indexes.
    fn migrate(&self) -> SqlResult<()> {
        self.conn.execute_batch(
            "
            -- Core tables
            CREATE TABLE IF NOT EXISTS devices (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                hostname   TEXT NOT NULL UNIQUE,
                ip         TEXT,
                last_seen  TEXT
            );

            -- Raw time-series tables
            CREATE TABLE IF NOT EXISTS fan_samples (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id INTEGER NOT NULL REFERENCES devices(id),
                fan_id   INTEGER NOT NULL,
                rpm      INTEGER NOT NULL,
                duty     REAL NOT NULL,
                ts       TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS temp_samples (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id INTEGER NOT NULL REFERENCES devices(id),
                source_id INTEGER NOT NULL,
                temp_c    REAL NOT NULL,
                ts        TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS activity_log (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id INTEGER NOT NULL REFERENCES devices(id),
                action    TEXT NOT NULL,
                detail    TEXT,
                ts        TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS config_snapshots (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id   INTEGER NOT NULL REFERENCES devices(id),
                config_json TEXT NOT NULL,
                ts          TEXT NOT NULL
            );

            -- 1-minute downsampled tables
            CREATE TABLE IF NOT EXISTS fan_samples_1m (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id INTEGER NOT NULL REFERENCES devices(id),
                fan_id   INTEGER NOT NULL,
                rpm_avg  REAL NOT NULL,
                rpm_min  REAL,
                rpm_max  REAL,
                duty_avg REAL NOT NULL,
                ts       TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS temp_samples_1m (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id INTEGER NOT NULL REFERENCES devices(id),
                source_id INTEGER NOT NULL,
                temp_avg  REAL NOT NULL,
                temp_min  REAL,
                temp_max  REAL,
                ts        TEXT NOT NULL
            );

            -- 5-minute downsampled tables
            CREATE TABLE IF NOT EXISTS fan_samples_5m (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id INTEGER NOT NULL REFERENCES devices(id),
                fan_id   INTEGER NOT NULL,
                rpm_avg  REAL NOT NULL,
                rpm_min  REAL,
                rpm_max  REAL,
                duty_avg REAL NOT NULL,
                ts       TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS temp_samples_5m (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id INTEGER NOT NULL REFERENCES devices(id),
                source_id INTEGER NOT NULL,
                temp_avg  REAL NOT NULL,
                temp_min  REAL,
                temp_max  REAL,
                ts        TEXT NOT NULL
            );

            -- Indexes for time-series queries
            CREATE INDEX IF NOT EXISTS idx_fan_samples_device_ts
                ON fan_samples(device_id, ts);
            CREATE INDEX IF NOT EXISTS idx_temp_samples_device_ts
                ON temp_samples(device_id, ts);
            CREATE INDEX IF NOT EXISTS idx_activity_log_device_ts
                ON activity_log(device_id, ts);
            CREATE INDEX IF NOT EXISTS idx_config_snapshots_device_ts
                ON config_snapshots(device_id, ts);
            CREATE INDEX IF NOT EXISTS idx_fan_samples_1m_device_ts
                ON fan_samples_1m(device_id, ts);
            CREATE INDEX IF NOT EXISTS idx_temp_samples_1m_device_ts
                ON temp_samples_1m(device_id, ts);
            CREATE INDEX IF NOT EXISTS idx_fan_samples_5m_device_ts
                ON fan_samples_5m(device_id, ts);
            ",
        )?;
        Ok(())
    }

    /// Access the underlying connection.
    pub fn conn(&self) -> &Connection {
        &self.conn
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
        let conn = db.conn();

        let expected_tables = [
            "devices",
            "fan_samples",
            "temp_samples",
            "activity_log",
            "config_snapshots",
            "fan_samples_1m",
            "temp_samples_1m",
            "fan_samples_5m",
            "temp_samples_5m",
        ];

        for table in &expected_tables {
            let count: i64 = conn
                .query_row(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
                    [table],
                    |row| row.get(0),
                )
                .unwrap();
            assert!(count > 0, "table '{}' should exist", table);
        }
    }
}
