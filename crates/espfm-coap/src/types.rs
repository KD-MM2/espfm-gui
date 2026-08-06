use crate::proto;

/// Optional settings for fan creation.
/// All fields are `None` by default (use `FanCreateOpts::default()`).
#[derive(Debug, Clone, Default)]
pub struct FanCreateOpts {
    pub mode: Option<proto::FanMode>,
    pub duty: Option<u32>,
    pub source_id: Option<u32>,
    pub curve_id: Option<u32>,
    pub schedule_id: Option<u32>,
    pub group_id: Option<u32>,
    pub inverted: Option<bool>,
    pub enabled: Option<bool>,
}

/// Control-loop tunables (partial update — omitted fields are preserved by firmware).
///
/// Unknown `failsafe_policy` wire values silently decode to `FailsafeHold`.
#[derive(Debug, Clone, Default)]
pub struct ControlTunables {
    pub hysteresis: Option<u32>,
    pub ramp_up: Option<u32>,
    pub ramp_down: Option<u32>,
    pub failsafe_policy: Option<proto::FailsafePolicy>,
    pub safe_duty: Option<u32>,
}

impl From<proto::ControlConfig> for ControlTunables {
    fn from(c: proto::ControlConfig) -> Self {
        Self {
            hysteresis: c.hysteresis,
            ramp_up: c.ramp_up,
            ramp_down: c.ramp_down,
            failsafe_policy: c.failsafe_policy.map(|v| {
                proto::FailsafePolicy::try_from(v).unwrap_or(proto::FailsafePolicy::FailsafeHold)
            }),
            safe_duty: c.safe_duty,
        }
    }
}

impl From<&ControlTunables> for proto::ControlConfig {
    fn from(t: &ControlTunables) -> Self {
        Self {
            hysteresis: t.hysteresis,
            ramp_up: t.ramp_up,
            ramp_down: t.ramp_down,
            failsafe_policy: t.failsafe_policy.map(|p| p as i32),
            safe_duty: t.safe_duty,
        }
    }
}

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
    pub mode_enum: FanMode,
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
    pub alarm_enum: FanAlarm,
}

/// Strong-typed fan mode. Additive — `FanState.mode` (String) stays as compat.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FanMode { Manual, Auto }

impl From<proto::FanMode> for FanMode {
    fn from(m: proto::FanMode) -> Self {
        match m {
            proto::FanMode::Auto => FanMode::Auto,
            proto::FanMode::Manual => FanMode::Manual,
        }
    }
}

impl std::fmt::Display for FanMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            FanMode::Manual => "manual",
            FanMode::Auto => "auto",
        })
    }
}

impl std::str::FromStr for FanMode {
    type Err = ();
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "auto" => Ok(FanMode::Auto),
            "manual" => Ok(FanMode::Manual),
            _ => Err(()),
        }
    }
}

/// Strong-typed fan alarm.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FanAlarm { None, Stall, Overtemp }

impl From<proto::FanAlarm> for FanAlarm {
    fn from(a: proto::FanAlarm) -> Self {
        match a {
            proto::FanAlarm::None => FanAlarm::None,
            proto::FanAlarm::Stall => FanAlarm::Stall,
            proto::FanAlarm::Overtemp => FanAlarm::Overtemp,
        }
    }
}

impl std::fmt::Display for FanAlarm {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            FanAlarm::None => "none",
            FanAlarm::Stall => "stall",
            FanAlarm::Overtemp => "overtemp",
        })
    }
}

/// Strong-typed temperature source kind.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SourceKind { Ntc, Ds18b20, Manual, Unknown }

impl From<proto::SourceType> for SourceKind {
    fn from(t: proto::SourceType) -> Self {
        match t {
            proto::SourceType::Ntc => SourceKind::Ntc,
            proto::SourceType::Ds18b20 => SourceKind::Ds18b20,
            proto::SourceType::Manual => SourceKind::Manual,
        }
    }
}

impl std::fmt::Display for SourceKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            SourceKind::Ntc => "NTC",
            SourceKind::Ds18b20 => "DS18B20",
            SourceKind::Manual => "Manual",
            SourceKind::Unknown => "Unknown",
        })
    }
}

/// Strong-typed source validity status.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SourceStatus { Valid, Stale, Invalid }

impl From<proto::SourceStatus> for SourceStatus {
    fn from(s: proto::SourceStatus) -> Self {
        match s {
            proto::SourceStatus::Valid => SourceStatus::Valid,
            proto::SourceStatus::Stale => SourceStatus::Stale,
            proto::SourceStatus::Invalid => SourceStatus::Invalid,
        }
    }
}

impl std::fmt::Display for SourceStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            SourceStatus::Valid => "valid",
            SourceStatus::Stale => "stale",
            SourceStatus::Invalid => "invalid",
        })
    }
}

/// Strong-typed WiFi auth mode (ESP-IDF `wifi_auth_mode_t` values).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WifiAuthMode {
    Open, Wep, WpaPsk, Wpa2Psk, WpaWpa2Psk, Enterprise, Wpa3Psk, Wpa2Wpa3Psk, Unknown,
}

impl From<u32> for WifiAuthMode {
    fn from(v: u32) -> Self {
        match v {
            0 => WifiAuthMode::Open,
            1 => WifiAuthMode::Wep,
            2 => WifiAuthMode::WpaPsk,
            3 => WifiAuthMode::Wpa2Psk,
            4 => WifiAuthMode::WpaWpa2Psk,
            5 => WifiAuthMode::Enterprise,
            6 => WifiAuthMode::Wpa3Psk,
            7 => WifiAuthMode::Wpa2Wpa3Psk,
            _ => WifiAuthMode::Unknown,
        }
    }
}

impl std::fmt::Display for WifiAuthMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self {
            WifiAuthMode::Open => "OPEN",
            WifiAuthMode::Wep => "WEP",
            WifiAuthMode::WpaPsk => "WPA_PSK",
            WifiAuthMode::Wpa2Psk => "WPA2_PSK",
            WifiAuthMode::WpaWpa2Psk => "WPA_WPA2_PSK",
            WifiAuthMode::Enterprise => "ENTERPRISE",
            WifiAuthMode::Wpa3Psk => "WPA3_PSK",
            WifiAuthMode::Wpa2Wpa3Psk => "WPA2_WPA3_PSK",
            WifiAuthMode::Unknown => "UNKNOWN",
        })
    }
}

impl From<proto::FanInfo> for FanState {
    fn from(f: proto::FanInfo) -> Self {
        let mode_enum = match proto::FanMode::try_from(f.mode) {
            Ok(m) => FanMode::from(m),
            Err(_) => FanMode::Manual,
        };
        let alarm_enum = match proto::FanAlarm::try_from(f.alarm) {
            Ok(a) => FanAlarm::from(a),
            Err(_) => FanAlarm::None,
        };
        Self {
            slot: f.id,
            name: f.name,
            mode: mode_enum.to_string(),
            mode_enum,
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
            alarm: alarm_enum.to_string(),
            alarm_enum,
        }
    }
}

/// A temperature source (NTC, DS18B20, or manual).
#[derive(Debug, Clone)]
pub struct TempSource {
    pub slot: u32,
    pub name: String,
    pub source_type: String,
    pub kind_enum: SourceKind,
    pub temp_c: f32,
    pub rom_code: Option<String>,
    pub status: String,
    pub status_enum: SourceStatus,
    pub gpio: u32,
}

impl From<proto::SourceInfo> for TempSource {
    fn from(s: proto::SourceInfo) -> Self {
        let kind_enum = match proto::SourceType::try_from(s.r#type) {
            Ok(t) => SourceKind::from(t),
            Err(_) => SourceKind::Unknown,
        };
        let status_enum = match proto::SourceStatus::try_from(s.status) {
            Ok(st) => SourceStatus::from(st),
            Err(_) => SourceStatus::Valid,
        };
        let rom_code = if s.ds18b20_rom_code != 0 {
            Some(format!("{:016X}", s.ds18b20_rom_code))
        } else {
            None
        };
        Self {
            slot: s.id,
            name: s.name,
            source_type: kind_enum.to_string(),
            kind_enum,
            temp_c: s.temp_c,
            rom_code,
            status: status_enum.to_string(),
            status_enum,
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
    pub name: String,
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
            name: s.name,
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

/// A WiFi access point seen during scan.
#[derive(Debug, Clone)]
pub struct WifiAp {
    pub ssid: String,
    pub rssi: i32,
    pub channel: u32,
    pub authmode: String,
    pub authmode_enum: WifiAuthMode,
}

impl From<proto::WifiApRecord> for WifiAp {
    fn from(ap: proto::WifiApRecord) -> Self {
        let authmode_enum = WifiAuthMode::from(ap.authmode);
        Self {
            ssid: ap.ssid,
            rssi: ap.rssi,
            channel: ap.channel,
            authmode: authmode_enum.to_string(),
            authmode_enum,
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fan_mode_from_proto() {
        assert_eq!(FanMode::from(proto::FanMode::Auto), FanMode::Auto);
        assert_eq!(FanMode::from(proto::FanMode::Manual), FanMode::Manual);
    }

    #[test]
    fn fan_mode_display_and_fromstr() {
        assert_eq!(FanMode::Auto.to_string(), "auto");
        assert_eq!(FanMode::Manual.to_string(), "manual");
        assert_eq!("auto".parse::<FanMode>().unwrap(), FanMode::Auto);
        assert_eq!("manual".parse::<FanMode>().unwrap(), FanMode::Manual);
        assert!("bogus".parse::<FanMode>().is_err());
    }

    #[test]
    fn source_kind_and_status() {
        assert_eq!(SourceKind::from(proto::SourceType::Ntc), SourceKind::Ntc);
        assert_eq!(SourceKind::from(proto::SourceType::Ds18b20), SourceKind::Ds18b20);
        assert_eq!(SourceKind::from(proto::SourceType::Manual), SourceKind::Manual);
        assert_eq!(SourceStatus::from(proto::SourceStatus::Valid), SourceStatus::Valid);
        assert_eq!(SourceStatus::from(proto::SourceStatus::Stale), SourceStatus::Stale);
        assert_eq!(SourceStatus::from(proto::SourceStatus::Invalid), SourceStatus::Invalid);
    }

    #[test]
    fn fan_alarm_from_proto() {
        assert_eq!(FanAlarm::from(proto::FanAlarm::None), FanAlarm::None);
        assert_eq!(FanAlarm::from(proto::FanAlarm::Stall), FanAlarm::Stall);
        assert_eq!(FanAlarm::from(proto::FanAlarm::Overtemp), FanAlarm::Overtemp);
    }

    #[test]
    fn fan_alarm_display() {
        assert_eq!(FanAlarm::None.to_string(), "none");
        assert_eq!(FanAlarm::Stall.to_string(), "stall");
        assert_eq!(FanAlarm::Overtemp.to_string(), "overtemp");
    }

    #[test]
    fn wifi_auth_mode() {
        assert_eq!(WifiAuthMode::from(0), WifiAuthMode::Open);
        assert_eq!(WifiAuthMode::from(3), WifiAuthMode::Wpa2Psk);
        assert_eq!(WifiAuthMode::from(99), WifiAuthMode::Unknown);
    }

    #[test]
    fn temp_source_enum_fields_sync() {
        let s = proto::SourceInfo {
            id: 1, name: "top".into(), r#type: 1, status: 1, temp_c: 25.0,
            gpio: 4, ds18b20_rom_code: 0,
        };
        let src = TempSource::from(s);
        assert_eq!(src.kind_enum, SourceKind::Ds18b20);
        assert_eq!(src.source_type, "DS18B20");
        assert_eq!(src.status_enum, SourceStatus::Stale);
        assert_eq!(src.status, "stale");

        let s = proto::SourceInfo {
            id: 2, name: "bad".into(), r#type: 99, status: 0, temp_c: 0.0,
            gpio: 255, ds18b20_rom_code: 0,
        };
        let src = TempSource::from(s);
        assert_eq!(src.kind_enum, SourceKind::Unknown);
        assert_eq!(src.source_type, "Unknown");
        assert_eq!(src.status_enum, SourceStatus::Valid);
        assert_eq!(src.status, "valid");
    }

    #[test]
    fn wifi_ap_enum_field_sync() {
        let ap = proto::WifiApRecord { ssid: "net".into(), rssi: -40, channel: 6, authmode: 4 };
        let wifi = WifiAp::from(ap);
        assert_eq!(wifi.authmode_enum, WifiAuthMode::WpaWpa2Psk);
        assert_eq!(wifi.authmode, "WPA_WPA2_PSK");

        let ap = proto::WifiApRecord { ssid: "bad".into(), rssi: -90, channel: 1, authmode: 99 };
        let wifi = WifiAp::from(ap);
        assert_eq!(wifi.authmode_enum, WifiAuthMode::Unknown);
        assert_eq!(wifi.authmode, "UNKNOWN");
    }

    #[test]
    fn fan_state_enum_fields_populated() {
        let f = proto::FanInfo {
            id: 0, name: "x".into(), mode: 1, duty: 50, rpm: 1000,
            enabled: true, inverted: false, pwm_gpio: 4, tach_gpio: 8,
            source_id: 255, curve_id: 255, schedule_id: 255, group_id: 0, alarm: 1,
        };
        let state = FanState::from(f);
        assert_eq!(state.mode_enum, FanMode::Auto);
        assert_eq!(state.alarm_enum, FanAlarm::Stall);
        assert_eq!(state.mode, "auto");
        assert_eq!(state.alarm, "stall");
    }

    #[test]
    fn fan_state_fallback() {
        let f = proto::FanInfo {
            id: 0, name: "x".into(), mode: 99, duty: 50, rpm: 1000,
            enabled: true, inverted: false, pwm_gpio: 4, tach_gpio: 8,
            source_id: 255, curve_id: 255, schedule_id: 255, group_id: 0, alarm: 99,
        };
        let state = FanState::from(f);
        assert_eq!(state.mode_enum, FanMode::Manual);
        assert_eq!(state.mode, "manual");
        assert_eq!(state.alarm_enum, FanAlarm::None);
        assert_eq!(state.alarm, "none");
    }

    #[test]
    fn control_tunables_roundtrip() {
        let t = ControlTunables {
            hysteresis: Some(3),
            ramp_up: Some(10),
            ramp_down: Some(3),
            failsafe_policy: Some(proto::FailsafePolicy::FailsafeSafeDuty),
            safe_duty: Some(50),
        };
        let proto_cfg: proto::ControlConfig = (&t).into();
        assert_eq!(proto_cfg.hysteresis, Some(3));
        assert_eq!(proto_cfg.ramp_up, Some(10));
        assert_eq!(proto_cfg.ramp_down, Some(3));
        assert_eq!(proto_cfg.failsafe_policy, Some(proto::FailsafePolicy::FailsafeSafeDuty as i32));
        assert_eq!(proto_cfg.safe_duty, Some(50));

        let back = ControlTunables::from(proto_cfg);
        assert_eq!(back.hysteresis, Some(3));
        assert_eq!(back.ramp_up, Some(10));
        assert_eq!(back.ramp_down, Some(3));
        assert_eq!(back.failsafe_policy, Some(proto::FailsafePolicy::FailsafeSafeDuty));
        assert_eq!(back.safe_duty, Some(50));
    }

    #[test]
    fn control_tunables_failsafe_fallback() {
        let proto_cfg = proto::ControlConfig {
            hysteresis: None,
            ramp_up: None,
            ramp_down: None,
            failsafe_policy: Some(99),
            safe_duty: None,
        };
        let back = ControlTunables::from(proto_cfg);
        assert_eq!(back.failsafe_policy, Some(proto::FailsafePolicy::FailsafeHold));
    }

    #[test]
    fn control_tunables_all_none() {
        let t = ControlTunables::default();
        let proto_cfg: proto::ControlConfig = (&t).into();
        assert_eq!(proto_cfg.hysteresis, None);
        assert_eq!(proto_cfg.failsafe_policy, None);
    }

    #[test]
    fn schedule_name_mapped() {
        let s = proto::ScheduleInfo {
            id: 1, fan_id: 2, duty: 50, start_min: 480, end_min: 1080,
            enabled: true, name: "work hours".into(),
        };
        let si = ScheduleInfo::from(s);
        assert_eq!(si.name, "work hours");
    }
}
