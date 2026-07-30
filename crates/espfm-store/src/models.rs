use diesel::prelude::*;
use serde::{Deserialize, Serialize};

use crate::schema::*;

// ── Devices ──────────────────────────────────────────────────────

#[derive(Queryable, Selectable, Debug, Clone, Serialize, Deserialize)]
#[diesel(table_name = devices)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct Device {
    pub id: i32,
    pub hostname: String,
    pub ip_address: Option<String>,
    pub port: Option<i32>,
    pub last_seen: Option<String>,
    pub firmware_ver: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = devices)]
pub struct NewDevice<'a> {
    pub hostname: &'a str,
    pub ip_address: &'a str,
    pub port: i32,
    pub last_seen: &'a str,
}

// ── Fan samples ──────────────────────────────────────────────────

#[derive(Queryable, Selectable, Debug, Clone, Serialize, Deserialize)]
#[diesel(table_name = fan_samples)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct FanSampleRow {
    pub id: i32,
    pub device_id: i32,
    pub fan_id: i32,
    pub rpm: i32,
    pub duty: f64,
    pub ts: String,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = fan_samples)]
pub struct NewFanSample {
    pub device_id: i32,
    pub fan_id: i32,
    pub rpm: i32,
    pub duty: f64,
    pub ts: String,
}

// ── Temp samples ─────────────────────────────────────────────────

#[derive(Queryable, Selectable, Debug, Clone, Serialize, Deserialize)]
#[diesel(table_name = temp_samples)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct TempSampleRow {
    pub id: i32,
    pub device_id: i32,
    pub source_id: i32,
    pub temp_c: f64,
    pub ts: String,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = temp_samples)]
pub struct NewTempSample {
    pub device_id: i32,
    pub source_id: i32,
    pub temp_c: f64,
    pub ts: String,
}

// ── Activity log ─────────────────────────────────────────────────

#[derive(Queryable, Selectable, Debug, Clone, Serialize, Deserialize)]
#[diesel(table_name = activity_log)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct ActivityLogRow {
    pub id: i32,
    pub device_id: i32,
    pub event_type: String,
    pub message: Option<String>,
    pub details: Option<String>,
    pub ts: String,
}

#[derive(Insertable, Debug)]
#[diesel(table_name = activity_log)]
pub struct NewActivityLog {
    pub device_id: i32,
    pub event_type: String,
    pub message: String,
    pub details: String,
    pub ts: String,
}

// ── App state ────────────────────────────────────────────────────

#[derive(Queryable, Selectable, Debug, Clone)]
#[diesel(table_name = app_state)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct AppStateRow {
    pub key: String,
    pub value: String,
}

#[derive(Insertable, AsChangeset, Debug)]
#[diesel(table_name = app_state)]
pub struct NewAppState {
    pub key: String,
    pub value: String,
}

// ── Downsampled fan samples (1m) ─────────────────────────────────

#[derive(Queryable, Selectable, Debug, Clone)]
#[diesel(table_name = fan_samples_1m)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct FanSample1mRow {
    pub id: i32,
    pub device_id: i32,
    pub fan_id: i32,
    pub rpm_avg: f64,
    pub rpm_min: Option<f64>,
    pub rpm_max: Option<f64>,
    pub duty_avg: f64,
    pub ts: String,
}

// ── Downsampled temp samples (1m) ────────────────────────────────

#[derive(Queryable, Selectable, Debug, Clone)]
#[diesel(table_name = temp_samples_1m)]
#[diesel(check_for_backend(diesel::sqlite::Sqlite))]
pub struct TempSample1mRow {
    pub id: i32,
    pub device_id: i32,
    pub source_id: i32,
    pub temp_avg: f64,
    pub temp_min: Option<f64>,
    pub temp_max: Option<f64>,
    pub ts: String,
}
