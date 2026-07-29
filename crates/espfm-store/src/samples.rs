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
    pub device_id: i64,
    pub action: String,
    pub detail: Option<String>,
    pub ts: DateTime<Utc>,
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
        "INSERT INTO activity_log (device_id, action, detail, ts) VALUES (?1, ?2, ?3, ?4)",
        params![
            entry.device_id,
            entry.action,
            entry.detail,
            entry.ts.to_rfc3339(),
        ],
    )?;
    Ok(conn.last_insert_rowid())
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

pub fn get_activity_log(
    conn: &Connection,
    device_id: i64,
    limit: u32,
) -> SqlResult<Vec<ActivityEntry>> {
    let mut stmt = conn.prepare(
        "SELECT device_id, action, detail, ts FROM activity_log
         WHERE device_id = ?1 ORDER BY ts DESC LIMIT ?2",
    )?;
    let rows = stmt.query_map(params![device_id, limit], |row| {
        let ts_str: String = row.get(3)?;
        Ok(ActivityEntry {
            device_id: row.get(0)?,
            action: row.get(1)?,
            detail: row.get(2)?,
            ts: DateTime::parse_from_rfc3339(&ts_str)
                .unwrap()
                .with_timezone(&Utc),
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
            SELECT id FROM activity_log ORDER BY ts DESC LIMIT 1000
        )",
        [],
    )?;
    Ok(count)
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

        let id = insert_fan_sample(conn, &sample).unwrap();
        assert!(id > 0);

        let since = Utc.with_ymd_and_hms(2025, 1, 15, 10, 0, 0).unwrap();
        let samples = get_fan_samples(conn, 1, &since).unwrap();
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

        let id = insert_temp_sample(conn, &sample).unwrap();
        assert!(id > 0);

        let since = Utc.with_ymd_and_hms(2025, 1, 15, 10, 0, 0).unwrap();
        let samples = get_temp_samples(conn, 1, &since).unwrap();
        assert_eq!(samples.len(), 1);
        assert!((samples[0].temp_c - 42.5).abs() < f64::EPSILON);
    }

    #[test]
    fn test_activity_log() {
        let db = setup_db();
        let conn = db.conn();

        let ts = Utc.with_ymd_and_hms(2025, 1, 15, 12, 0, 0).unwrap();
        let entry = ActivityEntry {
            device_id: 1,
            action: "fan_enable".to_string(),
            detail: Some("fan 0 enabled".to_string()),
            ts,
        };

        let id = insert_activity(conn, &entry).unwrap();
        assert!(id > 0);

        let log = get_activity_log(conn, 1, 10).unwrap();
        assert_eq!(log.len(), 1);
        assert_eq!(log[0].action, "fan_enable");
        assert_eq!(log[0].detail.as_deref(), Some("fan 0 enabled"));
    }
}
