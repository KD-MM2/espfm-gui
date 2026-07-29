use crate::proto;

/// Discovered device information (from mDNS or direct connection).
#[derive(Debug, Clone)]
pub struct DeviceInfo {
    pub hostname: String,
    pub ip_address: String,
    pub firmware_ver: String,
}

/// Runtime state of a single fan slot.
#[derive(Debug, Clone)]
pub struct FanState {
    pub slot: u32,
    pub name: String,
    pub mode: String,
    pub rpm: u32,
    pub duty_pct: u32,
    pub enabled: bool,
    pub inverted: bool,
    pub pwm_gpio: u32,
    pub tach_gpio: u32,
    pub source_id: u32,
    pub curve_id: u32,
    pub schedule_id: u32,
    pub group_id: u32,
    pub alarm: String,
}

impl From<proto::FanInfo> for FanState {
    fn from(f: proto::FanInfo) -> Self {
        let mode = match proto::FanMode::try_from(f.mode) {
            Ok(proto::FanMode::Auto) => "auto",
            _ => "manual",
        }
        .to_string();
        let alarm = match proto::FanAlarm::try_from(f.alarm) {
            Ok(proto::FanAlarm::Stall) => "stall",
            Ok(proto::FanAlarm::Overtemp) => "overtemp",
            _ => "none",
        }
        .to_string();
        Self {
            slot: f.id,
            name: f.name,
            mode,
            rpm: f.rpm,
            duty_pct: f.duty,
            enabled: f.enabled,
            inverted: f.inverted,
            pwm_gpio: f.pwm_gpio,
            tach_gpio: f.tach_gpio,
            source_id: f.source_id,
            curve_id: f.curve_id,
            schedule_id: f.schedule_id,
            group_id: f.group_id,
            alarm,
        }
    }
}

/// A temperature source (NTC, DS18B20, or manual).
#[derive(Debug, Clone)]
pub struct TempSource {
    pub slot: u32,
    pub name: String,
    pub source_type: String,
    pub temp_c: f32,
    pub rom_code: Option<String>,
    pub status: String,
    pub gpio: u32,
}

impl From<proto::SourceInfo> for TempSource {
    fn from(s: proto::SourceInfo) -> Self {
        let source_type = match proto::SourceType::try_from(s.r#type) {
            Ok(proto::SourceType::Ntc) => "NTC",
            Ok(proto::SourceType::Ds18b20) => "DS18B20",
            Ok(proto::SourceType::Manual) => "Manual",
            _ => "Unknown",
        }
        .to_string();

        let status = match proto::SourceStatus::try_from(s.status) {
            Ok(proto::SourceStatus::Valid) => "valid",
            Ok(proto::SourceStatus::Stale) => "stale",
            Ok(proto::SourceStatus::Invalid) => "invalid",
            _ => "valid",
        }
        .to_string();

        let rom_code = if s.ds18b20_rom_code != 0 {
            Some(format!("{:016X}", s.ds18b20_rom_code))
        } else {
            None
        };

        Self {
            slot: s.id,
            name: s.name,
            source_type,
            temp_c: s.temp_c,
            rom_code,
            status,
            gpio: s.gpio,
        }
    }
}

/// A point on a fan curve (temperature -> duty mapping).
#[derive(Debug, Clone)]
pub struct CurvePoint {
    pub temp_c: f32,
    pub duty: u32,
}

/// Fan curve definition.
#[derive(Debug, Clone)]
pub struct CurveInfo {
    pub slot: u32,
    pub name: String,
    pub points: Vec<CurvePoint>,
}

impl From<proto::CurveInfo> for CurveInfo {
    fn from(c: proto::CurveInfo) -> Self {
        Self {
            slot: c.id,
            name: c.name,
            points: c
                .points
                .into_iter()
                .map(|p| CurvePoint {
                    temp_c: p.temp_c,
                    duty: p.duty,
                })
                .collect(),
        }
    }
}

/// Schedule entry for time-based fan control.
#[derive(Debug, Clone)]
pub struct ScheduleInfo {
    pub slot: u32,
    pub fan_id: u32,
    pub duty: u32,
    pub start_min: u32,
    pub end_min: u32,
    pub enabled: bool,
}

impl From<proto::ScheduleInfo> for ScheduleInfo {
    fn from(s: proto::ScheduleInfo) -> Self {
        Self {
            slot: s.id,
            fan_id: s.fan_id,
            duty: s.duty,
            start_min: s.start_min,
            end_min: s.end_min,
            enabled: s.enabled,
        }
    }
}

/// Device system information.
#[derive(Debug, Clone)]
pub struct SystemInfo {
    pub version: String,
    pub uptime_secs: u32,
    pub heap_free: u32,
    pub fan_count: u32,
    pub source_count: u32,
    pub curve_count: u32,
    pub schedule_count: u32,
    pub hostname: String,
}

impl From<proto::SystemInfo> for SystemInfo {
    fn from(s: proto::SystemInfo) -> Self {
        Self {
            version: s.version,
            uptime_secs: s.uptime_s,
            heap_free: s.heap_free,
            fan_count: s.fan_count,
            source_count: s.source_count,
            curve_count: s.curve_count,
            schedule_count: s.schedule_count,
            hostname: s.hostname,
        }
    }
}

/// WiFi auth mode labels, matching ESP-IDF wifi_auth_mode_t values.
const WIFI_AUTH_LABELS: [&str; 8] = [
    "OPEN",
    "WEP",
    "WPA_PSK",
    "WPA2_PSK",
    "WPA_WPA2_PSK",
    "ENTERPRISE",
    "WPA3_PSK",
    "WPA2_WPA3_PSK",
];

/// A WiFi access point seen during scan.
#[derive(Debug, Clone)]
pub struct WifiAp {
    pub ssid: String,
    pub rssi: i32,
    pub channel: u32,
    pub authmode: String,
}

impl From<proto::WifiApRecord> for WifiAp {
    fn from(ap: proto::WifiApRecord) -> Self {
        let authmode = WIFI_AUTH_LABELS
            .get(ap.authmode as usize)
            .unwrap_or(&"UNKNOWN")
            .to_string();
        Self {
            ssid: ap.ssid,
            rssi: ap.rssi,
            channel: ap.channel,
            authmode,
        }
    }
}

/// Current WiFi connection status.
#[derive(Debug, Clone)]
pub struct WifiStatus {
    pub connected: bool,
    pub ip: String,
    pub ap_ip: String,
}

impl From<proto::WifiStatus> for WifiStatus {
    fn from(ws: proto::WifiStatus) -> Self {
        Self {
            connected: ws.sta_connected,
            ip: ws.sta_ip,
            ap_ip: ws.ap_ip,
        }
    }
}

/// A DS18B20 temperature sensor device.
#[derive(Debug, Clone)]
pub struct Ds18b20Device {
    pub index: u32,
    pub rom_code: String,
    pub temp_c: f32,
}

impl From<proto::Ds18b20Device> for Ds18b20Device {
    fn from(d: proto::Ds18b20Device) -> Self {
        Self {
            index: d.index,
            rom_code: format!("{:016X}", d.rom_code),
            temp_c: d.temp_c,
        }
    }
}
