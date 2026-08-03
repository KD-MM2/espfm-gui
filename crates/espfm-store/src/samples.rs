use chrono::{DateTime, Duration, Utc};
use diesel::upsert::excluded;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

use crate::models::*;
use crate::schema::*;

/// A single fan RPM/duty sample (public-facing type).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FanSample {
    pub device_id: i64,
    pub fan_id: i32,
    pub rpm: i32,
    pub duty: f64,
    pub ts: DateTime<Utc>,
}

/// A single temperature source sample (public-facing type).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TempSample {
    pub device_id: i64,
    pub source_id: i32,
    pub temp_c: f64,
    pub ts: DateTime<Utc>,
}

/// An activity log entry (public-facing type).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityEntry {
    pub id: i64,
    pub device_id: i64,
    pub event_type: String,
    pub message: Option<String>,
    pub details: Option<String>,
    pub ts: String,
}

/// A saved device info entry (public-facing type).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub id: i64,
    pub hostname: String,
    pub ip_address: Option<String>,
    pub port: Option<i32>,
    pub last_seen: Option<String>,
}

// ── Insert functions ───────────────────────────────────────────────

pub fn insert_fan_sample_direct(
    conn: &mut SqliteConnection,
    dev_id: i64,
    f_id: i32,
    rpm_val: i32,
    duty_val: f64,
) -> QueryResult<usize> {
    let now = Utc::now().to_rfc3339();
    diesel::insert_into(fan_samples::table)
        .values(&NewFanSample {
            device_id: dev_id as i32,
            fan_id: f_id,
            rpm: rpm_val,
            duty: duty_val,
            ts: now,
        })
        .execute(conn)
}

pub fn insert_temp_sample_direct(
    conn: &mut SqliteConnection,
    dev_id: i64,
    src_id: i32,
    temp_val: f64,
) -> QueryResult<usize> {
    let now = Utc::now().to_rfc3339();
    diesel::insert_into(temp_samples::table)
        .values(&NewTempSample {
            device_id: dev_id as i32,
            source_id: src_id,
            temp_c: temp_val,
            ts: now,
        })
        .execute(conn)
}

pub fn insert_activity_with_details(
    conn: &mut SqliteConnection,
    dev_id: i64,
    event_type_str: &str,
    message_str: &str,
    details_str: &str,
) -> QueryResult<usize> {
    let now = Utc::now().to_rfc3339();
    diesel::insert_into(activity_log::table)
        .values(&NewActivityLog {
            device_id: dev_id as i32,
            event_type: event_type_str.to_string(),
            message: Some(message_str.to_string()).filter(|s| !s.is_empty()),
            details: Some(details_str.to_string()).filter(|s| !s.is_empty()),
            ts: now,
        })
        .execute(conn)
}

// ── Batch insert functions ─────────────────────────────────────────

pub fn insert_fan_samples_batch(
    conn: &mut SqliteConnection,
    dev_id: i64,
    samples: &[(i32, i32, f64)], // (fan_id, rpm, duty)
) -> QueryResult<usize> {
    let now = Utc::now().to_rfc3339();
    let rows: Vec<NewFanSample> = samples
        .iter()
        .map(|&(fan_id, rpm, duty)| NewFanSample {
            device_id: dev_id as i32,
            fan_id,
            rpm,
            duty,
            ts: now.clone(),
        })
        .collect();
    diesel::insert_into(fan_samples::table)
        .values(&rows)
        .execute(conn)
}

pub fn insert_temp_samples_batch(
    conn: &mut SqliteConnection,
    dev_id: i64,
    samples: &[(i32, f64)], // (source_id, temp_c)
) -> QueryResult<usize> {
    let now = Utc::now().to_rfc3339();
    let rows: Vec<NewTempSample> = samples
        .iter()
        .map(|&(source_id, temp_c)| NewTempSample {
            device_id: dev_id as i32,
            source_id,
            temp_c,
            ts: now.clone(),
        })
        .collect();
    diesel::insert_into(temp_samples::table)
        .values(&rows)
        .execute(conn)
}

// ── Query functions ────────────────────────────────────────────────

pub fn get_fan_samples(
    conn: &mut SqliteConnection,
    dev_id: i64,
    since: &DateTime<Utc>,
) -> QueryResult<Vec<FanSample>> {
    let rows = fan_samples::table
        .filter(fan_samples::device_id.eq(dev_id as i32))
        .filter(fan_samples::ts.ge(since.to_rfc3339()))
        .order(fan_samples::ts.asc())
        .load::<FanSampleRow>(conn)?;

    Ok(rows
        .into_iter()
        .map(|r| FanSample {
            device_id: r.device_id as i64,
            fan_id: r.fan_id,
            rpm: r.rpm,
            duty: r.duty,
            ts: DateTime::parse_from_rfc3339(&r.ts)
                .unwrap_or_default()
                .with_timezone(&Utc),
        })
        .collect())
}

pub fn get_recent_fan_samples(
    conn: &mut SqliteConnection,
    dev_id: i64,
    minutes: i64,
) -> QueryResult<Vec<FanSample>> {
    let since = (Utc::now() - Duration::minutes(minutes)).to_rfc3339();
    let rows = fan_samples::table
        .filter(fan_samples::device_id.eq(dev_id as i32))
        .filter(fan_samples::ts.ge(since))
        .order(fan_samples::ts.asc())
        .load::<FanSampleRow>(conn)?;

    Ok(rows
        .into_iter()
        .map(|r| FanSample {
            device_id: r.device_id as i64,
            fan_id: r.fan_id,
            rpm: r.rpm,
            duty: r.duty,
            ts: DateTime::parse_from_rfc3339(&r.ts)
                .unwrap_or_default()
                .with_timezone(&Utc),
        })
        .collect())
}

pub fn get_temp_samples(
    conn: &mut SqliteConnection,
    dev_id: i64,
    since: &DateTime<Utc>,
) -> QueryResult<Vec<TempSample>> {
    let rows = temp_samples::table
        .filter(temp_samples::device_id.eq(dev_id as i32))
        .filter(temp_samples::ts.ge(since.to_rfc3339()))
        .order(temp_samples::ts.asc())
        .load::<TempSampleRow>(conn)?;

    Ok(rows
        .into_iter()
        .map(|r| TempSample {
            device_id: r.device_id as i64,
            source_id: r.source_id,
            temp_c: r.temp_c,
            ts: DateTime::parse_from_rfc3339(&r.ts)
                .unwrap_or_default()
                .with_timezone(&Utc),
        })
        .collect())
}

pub fn get_recent_temp_samples(
    conn: &mut SqliteConnection,
    dev_id: i64,
    minutes: i64,
) -> QueryResult<Vec<TempSample>> {
    let since = (Utc::now() - Duration::minutes(minutes)).to_rfc3339();
    let rows = temp_samples::table
        .filter(temp_samples::device_id.eq(dev_id as i32))
        .filter(temp_samples::ts.ge(since))
        .order(temp_samples::ts.asc())
        .load::<TempSampleRow>(conn)?;

    Ok(rows
        .into_iter()
        .map(|r| TempSample {
            device_id: r.device_id as i64,
            source_id: r.source_id,
            temp_c: r.temp_c,
            ts: DateTime::parse_from_rfc3339(&r.ts)
                .unwrap_or_default()
                .with_timezone(&Utc),
        })
        .collect())
}

pub fn get_activity_log(
    conn: &mut SqliteConnection,
    dev_id: i64,
    limit_val: i32,
) -> QueryResult<Vec<ActivityEntry>> {
    let rows = activity_log::table
        .filter(activity_log::device_id.eq(dev_id as i32))
        .order(activity_log::ts.desc())
        .limit(limit_val as i64)
        .load::<ActivityLogRow>(conn)?;

    Ok(rows
        .into_iter()
        .map(|r| ActivityEntry {
            id: r.id as i64,
            device_id: r.device_id as i64,
            event_type: r.event_type,
            message: r.message,
            details: r.details,
            ts: r.ts,
        })
        .collect())
}

pub fn get_activity_log_filtered(
    conn: &mut SqliteConnection,
    dev_id: i64,
    limit_val: i32,
    offset_val: i32,
    event_type_filter: Option<&str>,
) -> QueryResult<Vec<ActivityEntry>> {
    let mut query = activity_log::table
        .filter(activity_log::device_id.eq(dev_id as i32))
        .order(activity_log::ts.desc())
        .limit(limit_val as i64)
        .offset(offset_val as i64)
        .into_boxed();

    if let Some(et) = event_type_filter {
        query = query.filter(activity_log::event_type.eq(et));
    }

    let rows = query.load::<ActivityLogRow>(conn)?;

    Ok(rows
        .into_iter()
        .map(|r| ActivityEntry {
            id: r.id as i64,
            device_id: r.device_id as i64,
            event_type: r.event_type,
            message: r.message,
            details: r.details,
            ts: r.ts,
        })
        .collect())
}

pub fn clear_activity_log(conn: &mut SqliteConnection, dev_id: i64) -> QueryResult<usize> {
    diesel::delete(activity_log::table.filter(activity_log::device_id.eq(dev_id as i32)))
        .execute(conn)
}

pub fn upsert_device(
    conn: &mut SqliteConnection,
    hostname_str: &str,
    ip_str: &str,
    port_val: i32,
) -> QueryResult<usize> {
    let now = Utc::now().to_rfc3339();
    diesel::insert_into(devices::table)
        .values(&NewDevice {
            hostname: hostname_str,
            ip_address: ip_str,
            port: port_val,
            last_seen: &now,
        })
        .on_conflict(devices::hostname)
        .do_update()
        .set((
            devices::ip_address.eq(excluded(devices::ip_address)),
            devices::port.eq(excluded(devices::port)),
            devices::last_seen.eq(excluded(devices::last_seen)),
        ))
        .execute(conn)
}

/// Find a device by hostname. Returns the existing device ID if found.
pub fn find_device_by_hostname(
    conn: &mut SqliteConnection,
    hostname_str: &str,
) -> QueryResult<Option<i32>> {
    let result = devices::table
        .filter(devices::hostname.eq(hostname_str))
        .select(devices::id)
        .first::<i32>(conn)
        .optional()?;
    Ok(result)
}

pub fn get_all_devices(conn: &mut SqliteConnection) -> QueryResult<Vec<DeviceInfo>> {
    let rows = devices::table
        .order(devices::last_seen.desc())
        .load::<Device>(conn)?;

    Ok(rows
        .into_iter()
        .map(|r| DeviceInfo {
            id: r.id as i64,
            hostname: r.hostname,
            ip_address: r.ip_address,
            port: r.port,
            last_seen: r.last_seen,
        })
        .collect())
}

// ── Downsample functions ───────────────────────────────────────────

pub fn downsample_fan_1m(conn: &mut SqliteConnection, dev_id: i64) -> QueryResult<usize> {
    diesel::sql_query(format!(
        "INSERT INTO fan_samples_1m (device_id, fan_id, rpm_avg, rpm_min, rpm_max, duty_avg, ts)
         SELECT device_id, fan_id, AVG(rpm), MIN(rpm), MAX(rpm), AVG(duty),
                strftime('%Y-%m-%dT%H:%M:00Z', ts)
         FROM fan_samples WHERE device_id = {}
         GROUP BY device_id, fan_id, strftime('%Y-%m-%dT%H:%M:00Z', ts)
         HAVING COUNT(*) > 0",
        dev_id
    ))
    .execute(conn)
}

pub fn downsample_temp_1m(conn: &mut SqliteConnection, dev_id: i64) -> QueryResult<usize> {
    diesel::sql_query(format!(
        "INSERT INTO temp_samples_1m (device_id, source_id, temp_avg, temp_min, temp_max, ts)
         SELECT device_id, source_id, AVG(temp_c), MIN(temp_c), MAX(temp_c),
                strftime('%Y-%m-%dT%H:%M:00Z', ts)
         FROM temp_samples WHERE device_id = {}
         GROUP BY device_id, source_id, strftime('%Y-%m-%dT%H:%M:00Z', ts)
         HAVING COUNT(*) > 0",
        dev_id
    ))
    .execute(conn)
}

// ── Cleanup functions ──────────────────────────────────────────────

pub fn cleanup_old_raw_samples(conn: &mut SqliteConnection) -> QueryResult<(usize, usize)> {
    let fan = diesel::sql_query(
        "DELETE FROM fan_samples WHERE ts < datetime('now', '-24 hours')",
    )
    .execute(conn)?;
    let temp = diesel::sql_query(
        "DELETE FROM temp_samples WHERE ts < datetime('now', '-24 hours')",
    )
    .execute(conn)?;
    Ok((fan, temp))
}

pub fn cleanup_old_1m_samples(conn: &mut SqliteConnection) -> QueryResult<(usize, usize)> {
    let fan = diesel::sql_query(
        "DELETE FROM fan_samples_1m WHERE ts < datetime('now', '-7 days')",
    )
    .execute(conn)?;
    let temp = diesel::sql_query(
        "DELETE FROM temp_samples_1m WHERE ts < datetime('now', '-7 days')",
    )
    .execute(conn)?;
    Ok((fan, temp))
}

pub fn cleanup_old_5m_samples(conn: &mut SqliteConnection) -> QueryResult<(usize, usize)> {
    let fan = diesel::sql_query(
        "DELETE FROM fan_samples_5m WHERE ts < datetime('now', '-30 days')",
    )
    .execute(conn)?;
    let temp = diesel::sql_query(
        "DELETE FROM temp_samples_5m WHERE ts < datetime('now', '-30 days')",
    )
    .execute(conn)?;
    Ok((fan, temp))
}

pub fn cleanup_old_activity(conn: &mut SqliteConnection) -> QueryResult<usize> {
    diesel::sql_query(
        "DELETE FROM activity_log WHERE id NOT IN (
            SELECT id FROM (
                SELECT id, ROW_NUMBER() OVER (PARTITION BY device_id ORDER BY ts DESC) AS rn
                FROM activity_log
            ) WHERE rn <= 1000
        )",
    )
    .execute(conn)
}

pub fn run_maintenance(
    conn: &mut SqliteConnection,
    dev_id: i64,
) -> QueryResult<(usize, usize, usize, usize, usize)> {
    let fan_1m = downsample_fan_1m(conn, dev_id)?;
    let temp_1m = downsample_temp_1m(conn, dev_id)?;
    let (raw_fan, raw_temp) = cleanup_old_raw_samples(conn)?;
    let raw_deleted = raw_fan + raw_temp;
    let (old_fan, old_temp) = cleanup_old_1m_samples(conn)?;
    let old_deleted = old_fan + old_temp;
    let activity = cleanup_old_activity(conn)?;
    Ok((fan_1m, temp_1m, raw_deleted, old_deleted, activity))
}
