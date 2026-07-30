use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, Result as SqlResult};
use serde::{Deserialize, Serialize};

/// A single fan RPM/duty sample.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FanSample {
    pub device_id: i64,
    pub fan_id: i32,
    pub rpm: i32,
    pub duty: f64,
    pub ts: DateTime<Utc>,
}

/// A single temperature source sample.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TempSample {
    pub device_id: i64,
    pub source_id: i32,
    pub temp_c: f64,
    pub ts: DateTime<Utc>,
}

/// An activity log entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityEntry {
    pub id: i64,
    pub device_id: i64,
    pub event_type: String,
    pub message: Option<String>,
    pub details: Option<String>,
    pub ts: String,
}

/// A saved device info entry.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub id: i64,
    pub hostname: String,
    pub ip_address: Option<String>,
    pub port: Option<i32>,
    pub last_seen: Option<String>,
}

// ── Insert functions ───────────────────────────────────────────────

pub fn insert_fan_sample(conn: &Connection, sample: &FanSample) -> SqlResult<i64> {
    conn.execute(
        "INSERT INTO fan_samples (device_id, fan_id, rpm, duty, ts) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            sample.device_id,
            sample.fan_id,
            sample.rpm,
            sample.duty,
            sample.ts.to_rfc3339(),
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn insert_temp_sample(conn: &Connection, sample: &TempSample) -> SqlResult<i64> {
    conn.execute(
        "INSERT INTO temp_samples (device_id, source_id, temp_c, ts) VALUES (?1, ?2, ?3, ?4)",
        params![
            sample.device_id,
            sample.source_id,
            sample.temp_c,
            sample.ts.to_rfc3339(),
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn insert_activity(conn: &Connection, entry: &ActivityEntry) -> SqlResult<i64> {
    conn.execute(
        "INSERT INTO activity_log (device_id, event_type, message, details, ts) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            entry.device_id,
            entry.event_type,
            entry.message,
            entry.details,
            entry.ts,
        ],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn insert_activity_with_details(
    conn: &Connection,
    device_id: i64,
    event_type: &str,
    message: &str,
    details: &str,
) -> SqlResult<i64> {
    conn.execute(
        "INSERT INTO activity_log (device_id, event_type, message, details, ts) VALUES (?1, ?2, ?3, ?4, datetime('now'))",
        params![device_id, event_type, message, details],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn insert_fan_sample_direct(
    conn: &Connection,
    device_id: i64,
    fan_id: i32,
    rpm: i32,
    duty: f64,
) -> SqlResult<i64> {
    conn.execute(
        "INSERT INTO fan_samples (device_id, fan_id, rpm, duty, ts) VALUES (?1, ?2, ?3, ?4, datetime('now'))",
        params![device_id, fan_id, rpm, duty],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn insert_temp_sample_direct(
    conn: &Connection,
    device_id: i64,
    source_id: i32,
    temp_c: f64,
) -> SqlResult<i64> {
    conn.execute(
        "INSERT INTO temp_samples (device_id, source_id, temp_c, ts) VALUES (?1, ?2, ?3, datetime('now'))",
        params![device_id, source_id, temp_c],
    )?;
    Ok(conn.last_insert_rowid())
}

// ── Batch insert functions ─────────────────────────────────────────

pub fn insert_fan_samples_batch(
    conn: &Connection,
    device_id: i64,
    samples: &[(i32, i32, f64)], // (fan_id, rpm, duty)
) -> SqlResult<usize> {
    // SAFETY: unchecked_transaction is safe here because the Connection is behind
    // a Mutex, guaranteeing no concurrent transaction on the same connection.
    let tx = conn.unchecked_transaction()?;
    {
        let mut stmt = tx.prepare(
            "INSERT INTO fan_samples (device_id, fan_id, rpm, duty, ts) VALUES (?1, ?2, ?3, ?4, datetime('now'))",
        )?;
        for &(fan_id, rpm, duty) in samples {
            stmt.execute(params![device_id, fan_id, rpm, duty])?;
        }
    }
    tx.commit()?;
    Ok(samples.len())
}

pub fn insert_temp_samples_batch(
    conn: &Connection,
    device_id: i64,
    samples: &[(i32, f64)], // (source_id, temp_c)
) -> SqlResult<usize> {
    // SAFETY: same as above — Mutex guarantees no concurrent transaction.
    let tx = conn.unchecked_transaction()?;
    {
        let mut stmt = tx.prepare(
            "INSERT INTO temp_samples (device_id, source_id, temp_c, ts) VALUES (?1, ?2, ?3, datetime('now'))",
        )?;
        for &(source_id, temp_c) in samples {
            stmt.execute(params![device_id, source_id, temp_c])?;
        }
    }
    tx.commit()?;
    Ok(samples.len())
}

// ── Query functions ────────────────────────────────────────────────

pub fn get_fan_samples(
    conn: &Connection,
    device_id: i64,
    since: &DateTime<Utc>,
) -> SqlResult<Vec<FanSample>> {
    let mut stmt = conn.prepare(
        "SELECT device_id, fan_id, rpm, duty, ts FROM fan_samples
         WHERE device_id = ?1 AND ts >= ?2 ORDER BY ts",
    )?;
    let rows = stmt.query_map(params![device_id, since.to_rfc3339()], |row| {
        let ts_str: String = row.get(4)?;
        Ok(FanSample {
            device_id: row.get(0)?,
            fan_id: row.get(1)?,
            rpm: row.get(2)?,
            duty: row.get(3)?,
            ts: DateTime::parse_from_rfc3339(&ts_str)
                .unwrap()
                .with_timezone(&Utc),
        })
    })?;
    rows.collect()
}

/// Get recent fan samples for chart display (last N minutes).
pub fn get_recent_fan_samples(
    conn: &Connection,
    device_id: i64,
    minutes: i64,
) -> SqlResult<Vec<FanSample>> {
    let mut stmt = conn.prepare(
        "SELECT device_id, fan_id, rpm, duty, ts FROM fan_samples
         WHERE device_id = ?1 AND ts >= datetime('now', ?2)
         ORDER BY ts",
    )?;
    let since_param = format!("-{} minutes", minutes);
    let rows = stmt.query_map(params![device_id, since_param], |row| {
        let ts_str: String = row.get(4)?;
        Ok(FanSample {
            device_id: row.get(0)?,
            fan_id: row.get(1)?,
            rpm: row.get(2)?,
            duty: row.get(3)?,
            ts: DateTime::parse_from_rfc3339(&ts_str)
                .unwrap_or_default()
                .with_timezone(&Utc),
        })
    })?;
    rows.collect()
}

pub fn get_temp_samples(
    conn: &Connection,
    device_id: i64,
    since: &DateTime<Utc>,
) -> SqlResult<Vec<TempSample>> {
    let mut stmt = conn.prepare(
        "SELECT device_id, source_id, temp_c, ts FROM temp_samples
         WHERE device_id = ?1 AND ts >= ?2 ORDER BY ts",
    )?;
    let rows = stmt.query_map(params![device_id, since.to_rfc3339()], |row| {
        let ts_str: String = row.get(3)?;
        Ok(TempSample {
            device_id: row.get(0)?,
            source_id: row.get(1)?,
            temp_c: row.get(2)?,
            ts: DateTime::parse_from_rfc3339(&ts_str)
                .unwrap()
                .with_timezone(&Utc),
        })
    })?;
    rows.collect()
}

/// Get recent temp samples for chart display (last N minutes).
pub fn get_recent_temp_samples(
    conn: &Connection,
    device_id: i64,
    minutes: i64,
) -> SqlResult<Vec<TempSample>> {
    let mut stmt = conn.prepare(
        "SELECT device_id, source_id, temp_c, ts FROM temp_samples
         WHERE device_id = ?1 AND ts >= datetime('now', ?2)
         ORDER BY ts",
    )?;
    let since_param = format!("-{} minutes", minutes);
    let rows = stmt.query_map(params![device_id, since_param], |row| {
        let ts_str: String = row.get(3)?;
        Ok(TempSample {
            device_id: row.get(0)?,
            source_id: row.get(1)?,
            temp_c: row.get(2)?,
            ts: DateTime::parse_from_rfc3339(&ts_str)
                .unwrap_or_default()
                .with_timezone(&Utc),
        })
    })?;
    rows.collect()
}

pub fn get_activity_log(
    conn: &Connection,
    device_id: i64,
    limit: u32,
) -> SqlResult<Vec<ActivityEntry>> {
    let mut stmt = conn.prepare(
        "SELECT id, device_id, event_type, message, details, ts FROM activity_log
         WHERE device_id = ?1 ORDER BY ts DESC LIMIT ?2",
    )?;
    let rows = stmt.query_map(params![device_id, limit], |row| {
        Ok(ActivityEntry {
            id: row.get(0)?,
            device_id: row.get(1)?,
            event_type: row.get(2)?,
            message: row.get(3)?,
            details: row.get(4)?,
            ts: row.get(5)?,
        })
    })?;
    rows.collect()
}

pub fn get_activity_log_filtered(
    conn: &Connection,
    device_id: i64,
    limit: i32,
    offset: i32,
    event_type: Option<&str>,
) -> SqlResult<Vec<ActivityEntry>> {
    let mut entries = Vec::new();
    match event_type {
        Some(et) => {
            let mut stmt = conn.prepare(
                "SELECT id, device_id, event_type, message, details, ts FROM activity_log
                 WHERE device_id = ?1 AND event_type = ?2 ORDER BY ts DESC LIMIT ?3 OFFSET ?4",
            )?;
            let mut rows =
                stmt.query_map(params![device_id, et, limit, offset], |row| {
                    Ok(ActivityEntry {
                        id: row.get(0)?,
                        device_id: row.get(1)?,
                        event_type: row.get(2)?,
                        message: row.get(3)?,
                        details: row.get(4)?,
                        ts: row.get(5)?,
                    })
                })?;
            while let Some(row) = rows.next() {
                entries.push(row?);
            }
        }
        None => {
            let mut stmt = conn.prepare(
                "SELECT id, device_id, event_type, message, details, ts FROM activity_log
                 WHERE device_id = ?1 ORDER BY ts DESC LIMIT ?2 OFFSET ?3",
            )?;
            let mut rows =
                stmt.query_map(params![device_id, limit, offset], |row| {
                    Ok(ActivityEntry {
                        id: row.get(0)?,
                        device_id: row.get(1)?,
                        event_type: row.get(2)?,
                        message: row.get(3)?,
                        details: row.get(4)?,
                        ts: row.get(5)?,
                    })
                })?;
            while let Some(row) = rows.next() {
                entries.push(row?);
            }
        }
    }
    Ok(entries)
}

pub fn clear_activity_log(conn: &Connection, device_id: i64) -> SqlResult<usize> {
    let count = conn.execute("DELETE FROM activity_log WHERE device_id = ?1", params![device_id])?;
    Ok(count)
}

pub fn upsert_device(conn: &Connection, hostname: &str, ip: &str, port: i32) -> SqlResult<()> {
    conn.execute(
        "INSERT INTO devices (hostname, ip_address, port, last_seen) VALUES (?1, ?2, ?3, datetime('now'))
         ON CONFLICT(hostname) DO UPDATE SET ip_address = ?2, port = ?3, last_seen = datetime('now')",
        params![hostname, ip, port],
    )?;
    Ok(())
}

pub fn get_all_devices(conn: &Connection) -> SqlResult<Vec<DeviceInfo>> {
    let mut stmt = conn.prepare(
        "SELECT id, hostname, ip_address, port, last_seen FROM devices ORDER BY last_seen DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(DeviceInfo {
            id: row.get(0)?,
            hostname: row.get(1)?,
            ip_address: row.get(2)?,
            port: row.get(3)?,
            last_seen: row.get(4)?,
        })
    })?;
    rows.collect()
}

// ── Downsample functions ───────────────────────────────────────────

/// Downsample raw fan samples into 1-minute buckets for a given device.
pub fn downsample_fan_1m(conn: &Connection, device_id: i64) -> SqlResult<usize> {
    let count = conn.execute(
        "INSERT INTO fan_samples_1m (device_id, fan_id, rpm_avg, rpm_min, rpm_max, duty_avg, ts)
         SELECT device_id,
                fan_id,
                AVG(rpm),
                MIN(rpm),
                MAX(rpm),
                AVG(duty),
                strftime('%Y-%m-%dT%H:%M:00Z', ts)
         FROM fan_samples
         WHERE device_id = ?1
         GROUP BY device_id, fan_id, strftime('%Y-%m-%dT%H:%M:00Z', ts)
         HAVING COUNT(*) > 0",
        [device_id],
    )?;
    Ok(count)
}

/// Downsample raw temp samples into 1-minute buckets for a given device.
pub fn downsample_temp_1m(conn: &Connection, device_id: i64) -> SqlResult<usize> {
    let count = conn.execute(
        "INSERT INTO temp_samples_1m (device_id, source_id, temp_avg, temp_min, temp_max, ts)
         SELECT device_id,
                source_id,
                AVG(temp_c),
                MIN(temp_c),
                MAX(temp_c),
                strftime('%Y-%m-%dT%H:%M:00Z', ts)
         FROM temp_samples
         WHERE device_id = ?1
         GROUP BY device_id, source_id, strftime('%Y-%m-%dT%H:%M:00Z', ts)
         HAVING COUNT(*) > 0",
        [device_id],
    )?;
    Ok(count)
}

// ── Cleanup functions ──────────────────────────────────────────────

/// Delete raw fan/temperature samples older than 24 hours.
pub fn cleanup_old_raw_samples(conn: &Connection) -> SqlResult<(usize, usize)> {
    let fan = conn.execute(
        "DELETE FROM fan_samples WHERE ts < datetime('now', '-24 hours')",
        [],
    )?;
    let temp = conn.execute(
        "DELETE FROM temp_samples WHERE ts < datetime('now', '-24 hours')",
        [],
    )?;
    Ok((fan, temp))
}

/// Delete 1-minute downsampled samples older than 7 days.
pub fn cleanup_old_1m_samples(conn: &Connection) -> SqlResult<(usize, usize)> {
    let fan = conn.execute(
        "DELETE FROM fan_samples_1m WHERE ts < datetime('now', '-7 days')",
        [],
    )?;
    let temp = conn.execute(
        "DELETE FROM temp_samples_1m WHERE ts < datetime('now', '-7 days')",
        [],
    )?;
    Ok((fan, temp))
}

/// Delete 5-minute downsampled samples older than 30 days.
pub fn cleanup_old_5m_samples(conn: &Connection) -> SqlResult<(usize, usize)> {
    let fan = conn.execute(
        "DELETE FROM fan_samples_5m WHERE ts < datetime('now', '-30 days')",
        [],
    )?;
    let temp = conn.execute(
        "DELETE FROM temp_samples_5m WHERE ts < datetime('now', '-30 days')",
        [],
    )?;
    Ok((fan, temp))
}

/// Trim activity log to the most recent 1000 entries per device.
pub fn cleanup_old_activity(conn: &Connection) -> SqlResult<usize> {
    let count = conn.execute(
        "DELETE FROM activity_log WHERE id NOT IN (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (PARTITION BY device_id ORDER BY ts DESC) AS rn
                FROM activity_log
            ) WHERE rn <= 1000
        )",
        [],
    )?;
    Ok(count)
}

/// Run all maintenance: downsample + cleanup. Returns (fan_1m_inserted, temp_1m_inserted, raw_deleted, old_deleted, activity_trimmed).
pub fn run_maintenance(conn: &Connection, device_id: i64) -> SqlResult<(usize, usize, usize, usize, usize)> {
    let fan_1m = downsample_fan_1m(conn, device_id)?;
    let temp_1m = downsample_temp_1m(conn, device_id)?;
    let (raw_fan, raw_temp) = cleanup_old_raw_samples(conn)?;
    let raw_deleted = raw_fan + raw_temp;
    let (old_fan, old_temp) = cleanup_old_1m_samples(conn)?;
    let old_deleted = old_fan + old_temp;
    let activity = cleanup_old_activity(conn)?;
    Ok((fan_1m, temp_1m, raw_deleted, old_deleted, activity))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::Database;
    use chrono::TimeZone;

    fn setup_db() -> Database {
        let db = Database::open_in_memory().unwrap();
        // Insert a test device for foreign key references
        db.conn()
            .execute(
                "INSERT INTO devices (hostname) VALUES ('test-device')",
                [],
            )
            .unwrap();
        db
    }

    #[test]
    fn test_insert_and_query_fan_samples() {
        let db = setup_db();
        let conn = db.conn();

        let ts = Utc.with_ymd_and_hms(2025, 1, 15, 10, 30, 0).unwrap();
        let sample = FanSample {
            device_id: 1,
            fan_id: 0,
            rpm: 1200,
            duty: 75.5,
            ts,
        };

        let id = insert_fan_sample(&conn, &sample).unwrap();
        assert!(id > 0);

        let since = Utc.with_ymd_and_hms(2025, 1, 15, 10, 0, 0).unwrap();
        let samples = get_fan_samples(&conn, 1, &since).unwrap();
        assert_eq!(samples.len(), 1);
        assert_eq!(samples[0].rpm, 1200);
        assert!((samples[0].duty - 75.5).abs() < f64::EPSILON);
    }

    #[test]
    fn test_insert_and_query_temp_samples() {
        let db = setup_db();
        let conn = db.conn();

        let ts = Utc.with_ymd_and_hms(2025, 1, 15, 11, 0, 0).unwrap();
        let sample = TempSample {
            device_id: 1,
            source_id: 0,
            temp_c: 42.5,
            ts,
        };

        let id = insert_temp_sample(&conn, &sample).unwrap();
        assert!(id > 0);

        let since = Utc.with_ymd_and_hms(2025, 1, 15, 10, 0, 0).unwrap();
        let samples = get_temp_samples(&conn, 1, &since).unwrap();
        assert_eq!(samples.len(), 1);
        assert!((samples[0].temp_c - 42.5).abs() < f64::EPSILON);
    }

    #[test]
    fn test_activity_log() {
        let db = setup_db();
        let conn = db.conn();

        let entry = ActivityEntry {
            id: 0,
            device_id: 1,
            event_type: "fan_enable".to_string(),
            message: Some("fan 0 enabled".to_string()),
            details: None,
            ts: "2025-01-15T12:00:00Z".to_string(),
        };

        let id = insert_activity(&conn, &entry).unwrap();
        assert!(id > 0);

        let log = get_activity_log(&conn, 1, 10).unwrap();
        assert_eq!(log.len(), 1);
        assert_eq!(log[0].event_type, "fan_enable");
        assert_eq!(log[0].message.as_deref(), Some("fan 0 enabled"));
    }
}
