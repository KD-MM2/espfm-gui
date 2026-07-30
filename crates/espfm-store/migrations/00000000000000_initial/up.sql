-- espfm-store schema

CREATE TABLE IF NOT EXISTS devices (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    hostname     TEXT NOT NULL UNIQUE,
    ip_address   TEXT,
    port         INTEGER DEFAULT 5683,
    last_seen    TEXT,
    firmware_ver TEXT,
    created_at   TEXT DEFAULT (datetime('now'))
);

-- Raw time-series tables (device_id is a logical identifier, not a FK)
CREATE TABLE IF NOT EXISTS fan_samples (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    fan_id   INTEGER NOT NULL,
    rpm      INTEGER NOT NULL,
    duty     REAL NOT NULL,
    ts       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS temp_samples (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    source_id INTEGER NOT NULL,
    temp_c    REAL NOT NULL,
    ts        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id  INTEGER NOT NULL,
    event_type TEXT NOT NULL,
    message    TEXT,
    details    TEXT,
    ts         TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_state (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- 1-minute downsampled tables
CREATE TABLE IF NOT EXISTS fan_samples_1m (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    fan_id   INTEGER NOT NULL,
    rpm_avg  REAL NOT NULL,
    rpm_min  REAL,
    rpm_max  REAL,
    duty_avg REAL NOT NULL,
    ts       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS temp_samples_1m (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    source_id INTEGER NOT NULL,
    temp_avg  REAL NOT NULL,
    temp_min  REAL,
    temp_max  REAL,
    ts        TEXT NOT NULL
);

-- 5-minute downsampled tables
CREATE TABLE IF NOT EXISTS fan_samples_5m (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    fan_id   INTEGER NOT NULL,
    rpm_avg  REAL NOT NULL,
    rpm_min  REAL,
    rpm_max  REAL,
    duty_avg REAL NOT NULL,
    ts       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS temp_samples_5m (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    source_id INTEGER NOT NULL,
    temp_avg  REAL NOT NULL,
    temp_min  REAL,
    temp_max  REAL,
    ts        TEXT NOT NULL
);

-- Indexes for time-series queries
CREATE INDEX IF NOT EXISTS idx_fan_samples_device_ts ON fan_samples(device_id, ts);
CREATE INDEX IF NOT EXISTS idx_temp_samples_device_ts ON temp_samples(device_id, ts);
CREATE INDEX IF NOT EXISTS idx_activity_log_device_ts ON activity_log(device_id, ts);
CREATE INDEX IF NOT EXISTS idx_fan_samples_1m_device_ts ON fan_samples_1m(device_id, ts);
CREATE INDEX IF NOT EXISTS idx_temp_samples_1m_device_ts ON temp_samples_1m(device_id, ts);
CREATE INDEX IF NOT EXISTS idx_fan_samples_5m_device_ts ON fan_samples_5m(device_id, ts);
CREATE INDEX IF NOT EXISTS idx_temp_samples_5m_device_ts ON temp_samples_5m(device_id, ts);
