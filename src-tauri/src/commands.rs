use std::collections::HashMap;
use std::net::SocketAddr;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::State;

use espfm_coap::proto;

use crate::state::AppState;

// ── Response / Request types ───────────────────────────────────────────

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DeviceInfo {
    pub id: u32,
    pub hostname: String,
    pub ip: String,
    pub port: u16,
    pub connected: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FanState {
    pub slot: u8,
    pub name: String,
    pub mode: String,
    pub rpm: u32,
    pub duty_pct: u32,
    pub enabled: bool,
    pub inverted: bool,
    pub pwm_gpio: u8,
    pub tach_gpio: u8,
    pub source_id: u8,
    pub curve_id: u8,
    pub schedule_id: u8,
    pub group_id: u8,
    pub alarm: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CreateFanRequest {
    pub name: String,
    pub pwm_gpio: u8,
    pub tach_gpio: u8,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UpdateFanRequest {
    pub name: Option<String>,
    pub mode: Option<String>,
    pub duty: Option<u32>,
    pub enabled: Option<bool>,
    pub inverted: Option<bool>,
    pub source_id: Option<u32>,
    pub curve_id: Option<u32>,
    pub schedule_id: Option<u32>,
    pub group_id: Option<u32>,
    pub pwm_gpio: Option<u32>,
    pub tach_gpio: Option<u32>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SourceState {
    pub slot: u8,
    pub name: String,
    pub source_type: String,
    pub temp_c: f32,
    pub rom_code: Option<String>,
    pub status: String,
    pub gpio: u8,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CreateSourceRequest {
    pub name: String,
    pub source_type: String,
    pub gpio: Option<u8>,
    pub rom_code: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CurveState {
    pub slot: u8,
    pub name: String,
    pub points: Vec<CurvePoint>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CurvePoint {
    pub temp_c: f32,
    pub duty: u8,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CreateCurveRequest {
    pub name: String,
    pub points: Vec<CurvePoint>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ScheduleState {
    pub slot: u8,
    pub fan_id: u8,
    pub duty: u8,
    pub start_min: u16,
    pub end_min: u16,
    pub enabled: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CreateScheduleRequest {
    pub fan_id: u8,
    pub duty: u8,
    pub start_min: u16,
    pub end_min: u16,
    pub enabled: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UpdateScheduleRequest {
    pub fan_id: Option<u8>,
    pub duty: Option<u8>,
    pub start_min: Option<u16>,
    pub end_min: Option<u16>,
    pub enabled: Option<bool>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SystemInfoResponse {
    pub version: String,
    pub uptime_secs: u64,
    pub heap_free: u32,
    pub fan_count: u8,
    pub source_count: u8,
    pub curve_count: u8,
    pub schedule_count: u8,
    pub hostname: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct WifiApInfo {
    pub ssid: String,
    pub rssi: i32,
    pub channel: u32,
    pub authmode: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct WifiStatusResponse {
    pub connected: bool,
    pub ip: String,
    pub ap_ip: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Ds18b20DeviceInfo {
    pub index: u32,
    pub rom_code: String,
    pub temp_c: f32,
}

// ── Device management ──────────────────────────────────────────────────

#[tauri::command]
pub async fn discover_devices(state: State<'_, AppState>) -> Result<Vec<DeviceInfo>, String> {
    let discovered = espfm_mdns::discover_devices(Duration::from_secs(3))
        .await
        .map_err(|e| format!("mDNS discovery failed: {e}"))?;

    let connections = state.connections.lock().await;
    let mut result = Vec::new();
    for (i, dev) in discovered.iter().enumerate() {
        let id = (i as u32) + 1;
        let connected = connections.contains_key(&id);
        result.push(DeviceInfo {
            id,
            hostname: dev.hostname.clone(),
            ip: dev.ip.clone(),
            port: dev.port,
            connected,
        });
    }
    Ok(result)
}

#[tauri::command]
pub async fn connect_device(
    addr: String,
    state: State<'_, AppState>,
) -> Result<DeviceInfo, String> {
    let socket_addr: SocketAddr = addr
        .parse()
        .map_err(|_| format!("Invalid address: {addr}"))?;

    let client = espfm_coap::CoapClient::new(socket_addr)
        .await
        .map_err(|e| format!("Connection failed: {e}"))?;

    let system_info = client
        .get_system_info()
        .await
        .map_err(|e| format!("Failed to get device info: {e}"))?;

    let hostname = system_info.hostname.clone();

    // Check if this device already exists in SQLite (survives webview refresh).
    // If found, reuse its ID so historical data (logs, samples) stays associated.
    let existing_id = espfm_store::samples::find_device_by_hostname(
        &mut state.db.conn(),
        &hostname,
    )
    .map_err(|e| format!("Device lookup failed: {e}"))?;

    let id = match existing_id {
        Some(sqlite_id) => sqlite_id as u32,
        None => {
            let mut next_id = state.next_device_id.lock().await;
            let new_id = *next_id;
            *next_id += 1;
            new_id
        }
    };

    let conn = crate::state::DeviceConnection {
        client,
        hostname: hostname.clone(),
        ip: socket_addr.ip().to_string(),
        port: socket_addr.port(),
    };

    let mut connections = state.connections.lock().await;
    connections.insert(id, conn);

    Ok(DeviceInfo {
        id,
        hostname,
        ip: socket_addr.ip().to_string(),
        port: socket_addr.port(),
        connected: true,
    })
}

#[tauri::command]
pub async fn disconnect_device(id: u32, state: State<'_, AppState>) -> Result<(), String> {
    let mut connections = state.connections.lock().await;
    connections
        .remove(&id)
        .ok_or_else(|| format!("Device {id} not connected"))?;
    Ok(())
}

// ── Fan commands ───────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_fans(
    device_id: u32,
    state: State<'_, AppState>,
) -> Result<Vec<FanState>, String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    let fans = conn
        .client
        .get_fans()
        .await
        .map_err(|e| format!("get_fans failed: {e}"))?;
    Ok(fans
        .into_iter()
        .map(|f| FanState {
            slot: f.slot as u8,
            name: f.name,
            mode: f.mode,
            rpm: f.rpm,
            duty_pct: f.duty_pct,
            enabled: f.enabled,
            inverted: f.inverted,
            pwm_gpio: f.pwm_gpio as u8,
            tach_gpio: f.tach_gpio as u8,
            source_id: f.source_id as u8,
            curve_id: f.curve_id as u8,
            schedule_id: f.schedule_id as u8,
            group_id: f.group_id as u8,
            alarm: f.alarm,
        })
        .collect())
}

#[tauri::command]
pub async fn create_fan(
    device_id: u32,
    req: CreateFanRequest,
    state: State<'_, AppState>,
) -> Result<FanState, String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    let f = conn
        .client
        .create_fan(
            &req.name,
            req.pwm_gpio as u32,
            req.tach_gpio as u32,
            espfm_coap::FanCreateOpts::default(),
        )
        .await
        .map_err(|e| format!("create_fan failed: {e}"))?;
    Ok(FanState {
        slot: f.slot as u8,
        name: f.name,
        mode: f.mode,
        rpm: f.rpm,
        duty_pct: f.duty_pct,
        enabled: f.enabled,
        inverted: f.inverted,
        pwm_gpio: f.pwm_gpio as u8,
        tach_gpio: f.tach_gpio as u8,
        source_id: f.source_id as u8,
        curve_id: f.curve_id as u8,
        schedule_id: f.schedule_id as u8,
        group_id: f.group_id as u8,
        alarm: f.alarm,
    })
}

#[tauri::command]
pub async fn update_fan(
    device_id: u32,
    slot: u8,
    req: UpdateFanRequest,
    state: State<'_, AppState>,
) -> Result<FanState, String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    let mode_val = req.mode.as_deref().map(|m| match m {
        "auto" => 1,
        _ => 0,
    });
    let proto_req = proto::FanUpdateRequest {
        id: slot as u32,
        mode: mode_val,
        duty: req.duty,
        source_id: req.source_id,
        curve_id: req.curve_id,
        schedule_id: req.schedule_id,
        group_id: req.group_id,
        inverted: req.inverted,
        enabled: req.enabled,
        pwm_gpio: req.pwm_gpio,
        tach_gpio: req.tach_gpio,
        name: req.name,
    };
    let f = conn
        .client
        .update_fan(slot as u32, &proto_req)
        .await
        .map_err(|e| format!("update_fan failed: {e}"))?;
    Ok(FanState {
        slot: f.slot as u8,
        name: f.name,
        mode: f.mode,
        rpm: f.rpm,
        duty_pct: f.duty_pct,
        enabled: f.enabled,
        inverted: f.inverted,
        pwm_gpio: f.pwm_gpio as u8,
        tach_gpio: f.tach_gpio as u8,
        source_id: f.source_id as u8,
        curve_id: f.curve_id as u8,
        schedule_id: f.schedule_id as u8,
        group_id: f.group_id as u8,
        alarm: f.alarm,
    })
}

#[tauri::command]
pub async fn delete_fan(
    device_id: u32,
    slot: u8,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    conn.client
        .delete_fan(slot as u32)
        .await
        .map_err(|e| format!("delete_fan failed: {e}"))
}

// ── Source commands ────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_sources(
    device_id: u32,
    state: State<'_, AppState>,
) -> Result<Vec<SourceState>, String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    let sources = conn
        .client
        .get_sources()
        .await
        .map_err(|e| format!("get_sources failed: {e}"))?;
    Ok(sources
        .into_iter()
        .map(|s| SourceState {
            slot: s.slot as u8,
            name: s.name,
            source_type: s.source_type,
            temp_c: s.temp_c,
            rom_code: s.rom_code,
            status: s.status,
            gpio: s.gpio as u8,
        })
        .collect())
}

#[tauri::command]
pub async fn create_source(
    device_id: u32,
    req: CreateSourceRequest,
    state: State<'_, AppState>,
) -> Result<SourceState, String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;

    let source_type_enum = match req.source_type.as_str() {
        "NTC" => proto::SourceType::Ntc,
        "DS18B20" => proto::SourceType::Ds18b20,
        "Manual" => proto::SourceType::Manual,
        _ => proto::SourceType::Ntc,
    };
    let gpio = req.gpio.map(|g| g as u32).unwrap_or(255);
    let rom_code = req
        .rom_code
        .as_ref()
        .and_then(|rc| u64::from_str_radix(rc, 16).ok())
        .unwrap_or(0);

    let proto_req = proto::SourceCreateRequest {
        r#type: source_type_enum.into(),
        name: req.name.clone(),
        gpio,
        ds18b20_rom_code: rom_code,
    };
    let s = conn
        .client
        .create_source(&proto_req)
        .await
        .map_err(|e| format!("create_source failed: {e}"))?;
    Ok(SourceState {
        slot: s.slot as u8,
        name: s.name,
        source_type: s.source_type,
        temp_c: s.temp_c,
        rom_code: s.rom_code,
        status: s.status,
        gpio: s.gpio as u8,
    })
}

#[tauri::command]
pub async fn delete_source(
    device_id: u32,
    slot: u8,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    conn.client
        .delete_source(slot as u32)
        .await
        .map_err(|e| format!("delete_source failed: {e}"))
}

#[tauri::command]
pub async fn update_source(
    device_id: u32,
    slot: u8,
    name: String,
    state: State<'_, AppState>,
) -> Result<SourceState, String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    let req = proto::SourceUpdateRequest {
        id: slot as u32,
        name,
    };
    let s = conn
        .client
        .update_source(slot as u32, &req)
        .await
        .map_err(|e| format!("update_source failed: {e}"))?;
    Ok(SourceState {
        slot: s.slot as u8,
        name: s.name,
        source_type: s.source_type,
        temp_c: s.temp_c,
        rom_code: s.rom_code,
        status: s.status,
        gpio: s.gpio as u8,
    })
}

#[tauri::command]
pub async fn scan_ds18b20(
    device_id: u32,
    state: State<'_, AppState>,
) -> Result<Vec<Ds18b20DeviceInfo>, String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    let devices = conn
        .client
        .scan_ds18b20()
        .await
        .map_err(|e| format!("scan_ds18b20 failed: {e}"))?;
    Ok(devices
        .into_iter()
        .map(|d| Ds18b20DeviceInfo {
            index: d.index,
            rom_code: d.rom_code,
            temp_c: d.temp_c,
        })
        .collect())
}

#[tauri::command]
pub async fn update_manual_temp(
    device_id: u32,
    slot: u8,
    temp_c: f32,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    conn.client
        .update_manual_temp(slot as u32, temp_c)
        .await
        .map_err(|e| format!("update_manual_temp failed: {e}"))
}

#[tauri::command]
pub async fn config_ds18b20(
    device_id: u32,
    gpio: u8,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    conn.client
        .config_ds18b20(gpio as u32)
        .await
        .map_err(|e| format!("config_ds18b20 failed: {e}"))
}

// ── Curve commands ─────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_curves(
    device_id: u32,
    state: State<'_, AppState>,
) -> Result<Vec<CurveState>, String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    let curves = conn
        .client
        .get_curves()
        .await
        .map_err(|e| format!("get_curves failed: {e}"))?;
    Ok(curves
        .into_iter()
        .map(|c| CurveState {
            slot: c.slot as u8,
            name: c.name,
            points: c
                .points
                .into_iter()
                .map(|p| CurvePoint {
                    temp_c: p.temp_c,
                    duty: p.duty as u8,
                })
                .collect(),
        })
        .collect())
}

#[tauri::command]
pub async fn create_curve(
    device_id: u32,
    req: CreateCurveRequest,
    state: State<'_, AppState>,
) -> Result<CurveState, String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    let proto_req = proto::CurveCreateRequest {
        name: req.name.clone(),
        points: req
            .points
            .iter()
            .map(|p| proto::CurvePoint {
                temp_c: p.temp_c,
                duty: p.duty as u32,
            })
            .collect(),
    };
    let c = conn
        .client
        .create_curve(&proto_req)
        .await
        .map_err(|e| format!("create_curve failed: {e}"))?;
    Ok(CurveState {
        slot: c.slot as u8,
        name: c.name,
        points: c
            .points
            .into_iter()
            .map(|p| CurvePoint {
                temp_c: p.temp_c,
                duty: p.duty as u8,
            })
            .collect(),
    })
}

#[tauri::command]
pub async fn update_curve(
    device_id: u32,
    slot: u8,
    req: CreateCurveRequest,
    state: State<'_, AppState>,
) -> Result<CurveState, String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    let proto_req = proto::CurveUpdateRequest {
        id: slot as u32,
        name: req.name.clone(),
        points: req
            .points
            .iter()
            .map(|p| proto::CurvePoint {
                temp_c: p.temp_c,
                duty: p.duty as u32,
            })
            .collect(),
    };
    let c = conn
        .client
        .update_curve(slot as u32, &proto_req)
        .await
        .map_err(|e| format!("update_curve failed: {e}"))?;
    Ok(CurveState {
        slot: c.slot as u8,
        name: c.name,
        points: c
            .points
            .into_iter()
            .map(|p| CurvePoint {
                temp_c: p.temp_c,
                duty: p.duty as u8,
            })
            .collect(),
    })
}

#[tauri::command]
pub async fn delete_curve(
    device_id: u32,
    slot: u8,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    conn.client
        .delete_curve(slot as u32)
        .await
        .map_err(|e| format!("delete_curve failed: {e}"))
}

// ── Schedule commands ──────────────────────────────────────────────────

#[tauri::command]
pub async fn get_schedules(
    device_id: u32,
    state: State<'_, AppState>,
) -> Result<Vec<ScheduleState>, String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    let schedules = conn
        .client
        .get_schedules()
        .await
        .map_err(|e| format!("get_schedules failed: {e}"))?;
    Ok(schedules
        .into_iter()
        .map(|s| ScheduleState {
            slot: s.slot as u8,
            fan_id: s.fan_id as u8,
            duty: s.duty as u8,
            start_min: s.start_min as u16,
            end_min: s.end_min as u16,
            enabled: s.enabled,
        })
        .collect())
}

#[tauri::command]
pub async fn create_schedule(
    device_id: u32,
    req: CreateScheduleRequest,
    state: State<'_, AppState>,
) -> Result<ScheduleState, String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    let proto_req = proto::ScheduleCreateRequest {
        fan_id: req.fan_id as u32,
        duty: req.duty as u32,
        start_min: req.start_min as u32,
        end_min: req.end_min as u32,
        enabled: req.enabled,
        name: String::new(),
    };
    let s = conn
        .client
        .create_schedule(&proto_req)
        .await
        .map_err(|e| format!("create_schedule failed: {e}"))?;
    Ok(ScheduleState {
        slot: s.slot as u8,
        fan_id: s.fan_id as u8,
        duty: s.duty as u8,
        start_min: s.start_min as u16,
        end_min: s.end_min as u16,
        enabled: s.enabled,
    })
}

#[tauri::command]
pub async fn update_schedule(
    device_id: u32,
    slot: u8,
    req: UpdateScheduleRequest,
    state: State<'_, AppState>,
) -> Result<ScheduleState, String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    let proto_req = proto::ScheduleUpdateRequest {
        id: slot as u32,
        fan_id: req.fan_id.map(|v| v as u32),
        duty: req.duty.map(|v| v as u32),
        start_min: req.start_min.map(|v| v as u32),
        end_min: req.end_min.map(|v| v as u32),
        enabled: req.enabled,
        name: None,
    };
    let s = conn
        .client
        .update_schedule(slot as u32, &proto_req)
        .await
        .map_err(|e| format!("update_schedule failed: {e}"))?;
    Ok(ScheduleState {
        slot: s.slot as u8,
        fan_id: s.fan_id as u8,
        duty: s.duty as u8,
        start_min: s.start_min as u16,
        end_min: s.end_min as u16,
        enabled: s.enabled,
    })
}

#[tauri::command]
pub async fn delete_schedule(
    device_id: u32,
    slot: u8,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    conn.client
        .delete_schedule(slot as u32)
        .await
        .map_err(|e| format!("delete_schedule failed: {e}"))
}

// ── System commands ────────────────────────────────────────────────────

#[tauri::command]
pub async fn get_system_info(
    device_id: u32,
    state: State<'_, AppState>,
) -> Result<SystemInfoResponse, String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    let info = conn
        .client
        .get_system_info()
        .await
        .map_err(|e| format!("get_system_info failed: {e}"))?;
    Ok(SystemInfoResponse {
        version: info.version,
        uptime_secs: info.uptime_secs as u64,
        heap_free: info.heap_free,
        fan_count: info.fan_count as u8,
        source_count: info.source_count as u8,
        curve_count: info.curve_count as u8,
        schedule_count: info.schedule_count as u8,
        hostname: info.hostname,
    })
}

#[tauri::command]
pub async fn set_hostname(
    device_id: u32,
    hostname: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    conn.client
        .set_hostname(&hostname)
        .await
        .map_err(|e| format!("set_hostname failed: {e}"))
}

#[tauri::command]
pub async fn reboot_device(device_id: u32, state: State<'_, AppState>) -> Result<(), String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    conn.client
        .reboot()
        .await
        .map_err(|e| format!("reboot failed: {e}"))
}

// ── Config export/import ───────────────────────────────────────────────

#[derive(Serialize, Debug, Clone)]
pub struct ImportResult {
    pub fans_created: u32,
    pub fans_updated: u32,
    pub fans_deleted: u32,
    pub sources_created: u32,
    pub sources_deleted: u32,
    pub curves_created: u32,
    pub curves_updated: u32,
    pub curves_deleted: u32,
    pub schedules_created: u32,
    pub schedules_updated: u32,
    pub schedules_deleted: u32,
}

fn current_timestamp_iso() -> String {
    let d = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = d.as_secs();
    let days = secs / 86400;
    let rem = secs % 86400;
    let h = rem / 3600;
    let m = (rem % 3600) / 60;
    let s = rem % 60;
    let mut y = 1970;
    let mut dleft = days;
    loop {
        let dy = if y % 4 == 0 && (y % 100 != 0 || y % 400 == 0) {
            366
        } else {
            365
        };
        if dleft < dy {
            break;
        }
        dleft -= dy;
        y += 1;
    }
    let leap = y % 4 == 0 && (y % 100 != 0 || y % 400 == 0);
    let mdays: [u32; 12] = [
        31,
        if leap { 29 } else { 28 },
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
    ];
    let mut mo = 0;
    let mut dleft32 = dleft as u32;
    while mo < 12 && dleft32 >= mdays[mo] {
        dleft32 -= mdays[mo];
        mo += 1;
    }
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}",
        y,
        mo + 1,
        dleft32 + 1,
        h,
        m,
        s
    )
}

#[tauri::command]
pub async fn export_config(device_id: u32, state: State<'_, AppState>) -> Result<String, String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;

    let fans = conn
        .client
        .get_fans()
        .await
        .map_err(|e| format!("get_fans failed: {e}"))?;
    let sources = conn
        .client
        .get_sources()
        .await
        .map_err(|e| format!("get_sources failed: {e}"))?;
    let curves = conn
        .client
        .get_curves()
        .await
        .map_err(|e| format!("get_curves failed: {e}"))?;
    let schedules = conn
        .client
        .get_schedules()
        .await
        .map_err(|e| format!("get_schedules failed: {e}"))?;

    let mut export = serde_json::json!({
        "version": "3.0",
        "exported_at": current_timestamp_iso(),
    });

    export["fans"] = serde_json::json!(fans
        .into_iter()
        .map(|f| serde_json::json!({
            "id": f.slot,
            "name": f.name,
            "mode": f.mode,
            "duty": f.duty_pct,
            "rpm": f.rpm,
            "enabled": f.enabled,
            "inverted": f.inverted,
            "pwm_gpio": f.pwm_gpio,
            "tach_gpio": f.tach_gpio,
            "source_id": f.source_id,
            "curve_id": f.curve_id,
            "schedule_id": f.schedule_id,
            "group_id": f.group_id,
            "alarm": f.alarm,
        }))
        .collect::<Vec<_>>());

    export["sources"] = serde_json::json!(sources
        .into_iter()
        .map(|s| serde_json::json!({
            "id": s.slot,
            "name": s.name,
            "type": s.source_type,
            "status": s.status,
            "temp_c": s.temp_c,
            "gpio": s.gpio,
        }))
        .collect::<Vec<_>>());

    export["curves"] = serde_json::json!(curves
        .into_iter()
        .map(|c| serde_json::json!({
            "id": c.slot,
            "name": c.name,
            "points": c.points.iter().map(|p| serde_json::json!({
                "temp_c": p.temp_c,
                "duty": p.duty,
            })).collect::<Vec<_>>(),
        }))
        .collect::<Vec<_>>());

    export["schedules"] = serde_json::json!(schedules
        .into_iter()
        .map(|s| serde_json::json!({
            "id": s.slot,
            "fan_id": s.fan_id,
            "duty": s.duty,
            "start_min": s.start_min,
            "end_min": s.end_min,
            "enabled": s.enabled,
        }))
        .collect::<Vec<_>>());

    // WiFi status — best-effort, don't fail the whole export if unavailable
    let wifi = match conn.client.wifi_status().await {
        Ok(ws) => serde_json::json!({
            "sta_connected": ws.connected,
            "sta_ip": ws.ip,
            "ap_ip": ws.ap_ip,
        }),
        Err(_) => serde_json::json!({}),
    };
    export["wifi"] = wifi;

    serde_json::to_string_pretty(&export).map_err(|e| format!("JSON serialization failed: {e}"))
}

#[tauri::command]
pub async fn import_config(
    device_id: u32,
    config: String,
    state: State<'_, AppState>,
) -> Result<ImportResult, String> {
    let data: serde_json::Value =
        serde_json::from_str(&config).map_err(|e| format!("Invalid JSON: {e}"))?;

    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;

    let mut result = ImportResult {
        fans_created: 0,
        fans_updated: 0,
        fans_deleted: 0,
        sources_created: 0,
        sources_deleted: 0,
        curves_created: 0,
        curves_updated: 0,
        curves_deleted: 0,
        schedules_created: 0,
        schedules_updated: 0,
        schedules_deleted: 0,
    };

    // ── Fans ──────────────────────────────────────────────────────────────
    {
        let device_fans = conn
            .client
            .get_fans()
            .await
            .map_err(|e| format!("get_fans failed: {e}"))?;
        let device_map: HashMap<u32, _> = device_fans.into_iter().map(|f| (f.slot, f)).collect();

        let json_fans: Vec<&serde_json::Value> = data["fans"]
            .as_array()
            .map(|a| a.iter().collect())
            .unwrap_or_default();

        // Create missing fans
        for jf in &json_fans {
            let fid = jf["id"].as_u64().unwrap_or(0) as u32;
            if !device_map.contains_key(&fid) {
                let name = jf["name"].as_str().unwrap_or("").to_string();
                let pwm_gpio = jf["pwm_gpio"].as_u64().unwrap_or(255) as u32;
                let tach_gpio = jf["tach_gpio"].as_u64().unwrap_or(255) as u32;
                conn.client
                    .create_fan(
                        &name,
                        pwm_gpio,
                        tach_gpio,
                        espfm_coap::FanCreateOpts::default(),
                    )
                    .await
                    .map_err(|e| format!("create_fan {fid} failed: {e}"))?;
                result.fans_created += 1;
            }
        }

        // Update changed fans
        for jf in &json_fans {
            let fid = jf["id"].as_u64().unwrap_or(0) as u32;
            if let Some(df) = device_map.get(&fid) {
                let mut changed = false;
                let mode = jf["mode"].as_str().and_then(|m| match m {
                    "auto" => Some(1i32),
                    "manual" => Some(0i32),
                    _ => None,
                });
                let mode_changed = mode.map_or(false, |m| (m == 1) != (df.mode == "auto"));
                if mode_changed {
                    changed = true;
                }
                let duty = jf["duty"].as_u64().map(|v| v as u32);
                if duty.map_or(false, |d| d != df.duty_pct) {
                    changed = true;
                }
                let source_id = jf["source_id"].as_u64().map(|v| v as u32);
                if source_id.map_or(false, |s| s != df.source_id) {
                    changed = true;
                }
                let curve_id = jf["curve_id"].as_u64().map(|v| v as u32);
                if curve_id.map_or(false, |c| c != df.curve_id) {
                    changed = true;
                }
                let schedule_id = jf["schedule_id"].as_u64().map(|v| v as u32);
                if schedule_id.map_or(false, |s| s != df.schedule_id) {
                    changed = true;
                }
                let group_id = jf["group_id"].as_u64().map(|v| v as u32);
                if group_id.map_or(false, |g| g != df.group_id) {
                    changed = true;
                }
                let inverted = jf["inverted"].as_bool();
                if inverted.map_or(false, |i| i != df.inverted) {
                    changed = true;
                }
                let enabled = jf["enabled"].as_bool();
                if enabled.map_or(false, |e| e != df.enabled) {
                    changed = true;
                }
                if changed {
                    let mode_val = mode.map(|m| if m == 1 { 1 } else { 0 });
                    let proto_req = proto::FanUpdateRequest {
                        id: fid,
                        mode: mode_val,
                        duty,
                        source_id,
                        curve_id,
                        schedule_id,
                        group_id,
                        inverted,
                        enabled,
                        pwm_gpio: None,
                        tach_gpio: None,
                        name: None,
                    };
                    conn.client
                        .update_fan(fid, &proto_req)
                        .await
                        .map_err(|e| format!("update_fan {fid} failed: {e}"))?;
                    result.fans_updated += 1;
                }
            }
        }

        // Delete extra fans
        let json_fan_ids: std::collections::HashSet<u32> = json_fans
            .iter()
            .map(|jf| jf["id"].as_u64().unwrap_or(0) as u32)
            .collect();
        for fid in device_map.keys() {
            if !json_fan_ids.contains(fid) {
                conn.client
                    .delete_fan(*fid)
                    .await
                    .map_err(|e| format!("delete_fan {fid} failed: {e}"))?;
                result.fans_deleted += 1;
            }
        }
    }

    // ── Sources ───────────────────────────────────────────────────────────
    {
        let device_sources = conn
            .client
            .get_sources()
            .await
            .map_err(|e| format!("get_sources failed: {e}"))?;
        let device_map: HashMap<u32, _> =
            device_sources.into_iter().map(|s| (s.slot, s)).collect();

        let json_sources: Vec<&serde_json::Value> = data["sources"]
            .as_array()
            .map(|a| a.iter().collect())
            .unwrap_or_default();

        // Create missing sources
        for js in &json_sources {
            let sid = js["id"].as_u64().unwrap_or(0) as u32;
            if !device_map.contains_key(&sid) {
                let name = js["name"].as_str().unwrap_or("").to_string();
                let source_type = js["type"].as_str().unwrap_or("NTC");
                let source_type_enum = match source_type {
                    "NTC" => proto::SourceType::Ntc,
                    "DS18B20" => proto::SourceType::Ds18b20,
                    "Manual" => proto::SourceType::Manual,
                    _ => proto::SourceType::Ntc,
                };
                let gpio = js["gpio"].as_u64().unwrap_or(255) as u32;
                let rom_code = js["rom_code"]
                    .as_str()
                    .and_then(|rc| u64::from_str_radix(rc, 16).ok())
                    .unwrap_or(0);
                let proto_req = proto::SourceCreateRequest {
                    r#type: source_type_enum.into(),
                    name,
                    gpio,
                    ds18b20_rom_code: rom_code,
                };
                conn.client
                    .create_source(&proto_req)
                    .await
                    .map_err(|e| format!("create_source {sid} failed: {e}"))?;
                result.sources_created += 1;
            }
        }

        // Delete extra sources
        let json_source_ids: std::collections::HashSet<u32> = json_sources
            .iter()
            .map(|js| js["id"].as_u64().unwrap_or(0) as u32)
            .collect();
        for sid in device_map.keys() {
            if !json_source_ids.contains(sid) {
                conn.client
                    .delete_source(*sid)
                    .await
                    .map_err(|e| format!("delete_source {sid} failed: {e}"))?;
                result.sources_deleted += 1;
            }
        }
    }

    // ── Curves ────────────────────────────────────────────────────────────
    {
        let device_curves = conn
            .client
            .get_curves()
            .await
            .map_err(|e| format!("get_curves failed: {e}"))?;
        let device_map: HashMap<u32, _> =
            device_curves.into_iter().map(|c| (c.slot, c)).collect();

        let json_curves: Vec<&serde_json::Value> = data["curves"]
            .as_array()
            .map(|a| a.iter().collect())
            .unwrap_or_default();

        for jc in &json_curves {
            let cid = jc["id"].as_u64().unwrap_or(0) as u32;
            let name = jc["name"].as_str().unwrap_or("").to_string();
            let points: Vec<proto::CurvePoint> = jc["points"]
                .as_array()
                .map(|arr| {
                    arr.iter()
                        .map(|p| proto::CurvePoint {
                            temp_c: p["temp_c"].as_f64().unwrap_or(0.0) as f32,
                            duty: p["duty"].as_u64().unwrap_or(0) as u32,
                        })
                        .collect()
                })
                .unwrap_or_default();

            if !device_map.contains_key(&cid) {
                let proto_req = proto::CurveCreateRequest {
                    name,
                    points,
                };
                conn.client
                    .create_curve(&proto_req)
                    .await
                    .map_err(|e| format!("create_curve {cid} failed: {e}"))?;
                result.curves_created += 1;
            } else {
                let dc = &device_map[&cid];
                let name_changed = name != dc.name;
                let pts_changed = points.len() != dc.points.len()
                    || points.iter().zip(dc.points.iter()).any(|(p, dp)| {
                        (p.temp_c - dp.temp_c).abs() > 0.01 || p.duty != dp.duty
                    });
                if name_changed || pts_changed {
                    let proto_req = proto::CurveUpdateRequest {
                        id: cid,
                        name,
                        points,
                    };
                    conn.client
                        .update_curve(cid, &proto_req)
                        .await
                        .map_err(|e| format!("update_curve {cid} failed: {e}"))?;
                    result.curves_updated += 1;
                }
            }
        }

        let json_curve_ids: std::collections::HashSet<u32> = json_curves
            .iter()
            .map(|jc| jc["id"].as_u64().unwrap_or(0) as u32)
            .collect();
        for cid in device_map.keys() {
            if !json_curve_ids.contains(cid) {
                conn.client
                    .delete_curve(*cid)
                    .await
                    .map_err(|e| format!("delete_curve {cid} failed: {e}"))?;
                result.curves_deleted += 1;
            }
        }
    }

    // ── Schedules ─────────────────────────────────────────────────────────
    {
        let device_schedules = conn
            .client
            .get_schedules()
            .await
            .map_err(|e| format!("get_schedules failed: {e}"))?;
        let device_map: HashMap<u32, _> =
            device_schedules.into_iter().map(|s| (s.slot, s)).collect();

        let json_scheds: Vec<&serde_json::Value> = data["schedules"]
            .as_array()
            .map(|a| a.iter().collect())
            .unwrap_or_default();

        for js in &json_scheds {
            let sid = js["id"].as_u64().unwrap_or(0) as u32;
            let fan_id = js["fan_id"].as_u64().unwrap_or(0) as u32;
            let duty = js["duty"].as_u64().unwrap_or(0) as u32;
            let start_min = js["start_min"].as_u64().unwrap_or(0) as u32;
            let end_min = js["end_min"].as_u64().unwrap_or(0) as u32;
            let enabled = js["enabled"].as_bool().unwrap_or(true);

            if !device_map.contains_key(&sid) {
                let proto_req = proto::ScheduleCreateRequest {
                    fan_id,
                    duty,
                    start_min,
                    end_min,
                    enabled,
                    name: String::new(),
                };
                conn.client
                    .create_schedule(&proto_req)
                    .await
                    .map_err(|e| format!("create_schedule {sid} failed: {e}"))?;
                result.schedules_created += 1;
            } else {
                let ds = &device_map[&sid];
                let mut changed = false;
                let mut proto_req = proto::ScheduleUpdateRequest {
                    id: sid,
                    fan_id: None,
                    duty: None,
                    start_min: None,
                    end_min: None,
                    enabled: None,
                    name: None,
                };
                if fan_id != ds.fan_id {
                    proto_req.fan_id = Some(fan_id);
                    changed = true;
                }
                if duty != ds.duty {
                    proto_req.duty = Some(duty);
                    changed = true;
                }
                if start_min != ds.start_min {
                    proto_req.start_min = Some(start_min);
                    changed = true;
                }
                if end_min != ds.end_min {
                    proto_req.end_min = Some(end_min);
                    changed = true;
                }
                if enabled != ds.enabled {
                    proto_req.enabled = Some(enabled);
                    changed = true;
                }
                if changed {
                    conn.client
                        .update_schedule(sid, &proto_req)
                        .await
                        .map_err(|e| format!("update_schedule {sid} failed: {e}"))?;
                    result.schedules_updated += 1;
                }
            }
        }

        let json_sched_ids: std::collections::HashSet<u32> = json_scheds
            .iter()
            .map(|js| js["id"].as_u64().unwrap_or(0) as u32)
            .collect();
        for sid in device_map.keys() {
            if !json_sched_ids.contains(sid) {
                conn.client
                    .delete_schedule(*sid)
                    .await
                    .map_err(|e| format!("delete_schedule {sid} failed: {e}"))?;
                result.schedules_deleted += 1;
            }
        }
    }

    Ok(result)
}

// ── WiFi commands ──────────────────────────────────────────────────────

#[tauri::command]
pub async fn wifi_scan(
    device_id: u32,
    state: State<'_, AppState>,
) -> Result<Vec<WifiApInfo>, String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    let aps = conn
        .client
        .wifi_scan()
        .await
        .map_err(|e| format!("wifi_scan failed: {e}"))?;
    Ok(aps
        .into_iter()
        .map(|ap| WifiApInfo {
            ssid: ap.ssid,
            rssi: ap.rssi,
            channel: ap.channel,
            authmode: ap.authmode,
        })
        .collect())
}

#[tauri::command]
pub async fn wifi_connect(
    device_id: u32,
    ssid: String,
    password: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    conn.client
        .wifi_connect(&ssid, &password)
        .await
        .map_err(|e| format!("wifi_connect failed: {e}"))
}

#[tauri::command]
pub async fn wifi_status(
    device_id: u32,
    state: State<'_, AppState>,
) -> Result<WifiStatusResponse, String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    let status = conn
        .client
        .wifi_status()
        .await
        .map_err(|e| format!("wifi_status failed: {e}"))?;
    Ok(WifiStatusResponse {
        connected: status.connected,
        ip: status.ip,
        ap_ip: status.ap_ip,
    })
}

// ── Database commands ──────────────────────────────────────────────

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ActivityLogEntry {
    pub id: i64,
    pub device_id: i64,
    pub event_type: String,
    pub message: String,
    pub details: String,
    pub ts: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SavedDevice {
    pub id: i64,
    pub hostname: String,
    pub ip_address: String,
    pub port: i32,
    pub last_seen: Option<String>,
}

#[tauri::command]
pub async fn save_fan_sample(
    device_id: u32,
    slot: u8,
    rpm: u32,
    duty: f32,
    state: State<'_, AppState>,
) -> Result<(), String> {
    espfm_store::samples::insert_fan_sample_direct(
        &mut state.db.conn(),
        device_id as i64,
        slot as i32,
        rpm as i32,
        duty as f64,
    )
    .map_err(|e| format!("save_fan_sample failed: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn save_fan_samples_batch(
    device_id: u32,
    samples: Vec<(u8, u32, f32)>, // [(slot, rpm, duty)]
    state: State<'_, AppState>,
) -> Result<(), String> {
    let batch: Vec<(i32, i32, f64)> = samples
        .into_iter()
        .map(|(slot, rpm, duty)| (slot as i32, rpm as i32, duty as f64))
        .collect();
    espfm_store::samples::insert_fan_samples_batch(&mut state.db.conn(), device_id as i64, &batch)
        .map_err(|e| format!("save_fan_samples_batch failed: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn save_temp_sample(
    device_id: u32,
    slot: u8,
    temp_c: f32,
    state: State<'_, AppState>,
) -> Result<(), String> {
    espfm_store::samples::insert_temp_sample_direct(
        &mut state.db.conn(),
        device_id as i64,
        slot as i32,
        temp_c as f64,
    )
    .map_err(|e| format!("save_temp_sample failed: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn save_temp_samples_batch(
    device_id: u32,
    samples: Vec<(u8, f32)>, // [(slot, temp_c)]
    state: State<'_, AppState>,
) -> Result<(), String> {
    let batch: Vec<(i32, f64)> = samples
        .into_iter()
        .map(|(slot, temp_c)| (slot as i32, temp_c as f64))
        .collect();
    espfm_store::samples::insert_temp_samples_batch(&mut state.db.conn(), device_id as i64, &batch)
        .map_err(|e| format!("save_temp_samples_batch failed: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn save_log(
    device_id: u32,
    event_type: String,
    message: String,
    details: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    espfm_store::samples::insert_activity_with_details(
        &mut state.db.conn(),
        device_id as i64,
        &event_type,
        &message,
        &details,
    )
    .map_err(|e| format!("save_log failed: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn get_logs(
    device_id: u32,
    limit: i32,
    offset: i32,
    event_type: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<ActivityLogEntry>, String> {
    let entries = espfm_store::samples::get_activity_log_filtered(
        &mut state.db.conn(),
        device_id as i64,
        limit,
        offset,
        event_type.as_deref(),
    )
    .map_err(|e| format!("get_logs failed: {e}"))?;
    Ok(entries
        .into_iter()
        .map(|e| ActivityLogEntry {
            id: e.id,
            device_id: e.device_id,
            event_type: e.event_type,
            message: e.message.unwrap_or_default(),
            details: e.details.unwrap_or_default(),
            ts: e.ts,
        })
        .collect())
}

#[tauri::command]
pub async fn clear_logs(device_id: u32, state: State<'_, AppState>) -> Result<(), String> {
    espfm_store::samples::clear_activity_log(&mut state.db.conn(), device_id as i64)
        .map_err(|e| format!("clear_logs failed: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn run_maintenance(
    device_id: u32,
    state: State<'_, AppState>,
) -> Result<(usize, usize, usize, usize, usize), String> {
    espfm_store::samples::run_maintenance(&mut state.db.conn(), device_id as i64)
        .map_err(|e| format!("run_maintenance failed: {e}"))
}

#[tauri::command]
pub async fn save_app_state(
    key: String,
    value: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    espfm_store::app_state::set_app_state(&mut state.db.conn(), &key, &value)
        .map_err(|e| format!("save_app_state failed: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn delete_app_state(
    key: String,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    espfm_store::app_state::delete_app_state(&mut state.db.conn(), &key)
        .map(|n| n > 0)
        .map_err(|e| format!("delete_app_state failed: {e}"))
}

#[tauri::command]
pub async fn get_app_state(
    key: String,
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    espfm_store::app_state::get_app_state(&mut state.db.conn(), &key)
        .map_err(|e| format!("get_app_state failed: {e}"))
}

#[tauri::command]
pub async fn save_device_info(
    hostname: String,
    ip: String,
    port: u16,
    state: State<'_, AppState>,
) -> Result<(), String> {
    espfm_store::samples::upsert_device(&mut state.db.conn(), &hostname, &ip, port as i32)
        .map_err(|e| format!("save_device_info failed: {e}"))?;
    Ok(())
}

#[tauri::command]
pub async fn get_saved_devices(
    state: State<'_, AppState>,
) -> Result<Vec<SavedDevice>, String> {
    let devices = espfm_store::samples::get_all_devices(&mut state.db.conn())
        .map_err(|e| format!("get_saved_devices failed: {e}"))?;
    Ok(devices
        .into_iter()
        .map(|d| SavedDevice {
            id: d.id,
            hostname: d.hostname,
            ip_address: d.ip_address.unwrap_or_default(),
            port: d.port.unwrap_or(5683),
            last_seen: d.last_seen,
        })
        .collect())
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FanSamplePoint {
    pub fan_id: i32,
    pub rpm: i32,
    pub duty: f64,
    pub ts: String,
}

#[tauri::command]
pub async fn get_recent_fan_samples(
    device_id: u32,
    minutes: i64,
    state: State<'_, AppState>,
) -> Result<Vec<FanSamplePoint>, String> {
    let samples = espfm_store::samples::get_recent_fan_samples(
        &mut state.db.conn(),
        device_id as i64,
        minutes,
    )
    .map_err(|e| format!("get_recent_fan_samples failed: {e}"))?;
    Ok(samples
        .into_iter()
        .map(|s| FanSamplePoint {
            fan_id: s.fan_id,
            rpm: s.rpm,
            duty: s.duty,
            ts: s.ts.to_rfc3339(),
        })
        .collect())
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TempSamplePoint {
    pub source_id: i32,
    pub temp_c: f64,
    pub ts: String,
}

#[tauri::command]
pub async fn get_recent_temp_samples(
    device_id: u32,
    minutes: i64,
    state: State<'_, AppState>,
) -> Result<Vec<TempSamplePoint>, String> {
    let samples = espfm_store::samples::get_recent_temp_samples(
        &mut state.db.conn(),
        device_id as i64,
        minutes,
    )
    .map_err(|e| format!("get_recent_temp_samples failed: {e}"))?;
    Ok(samples
        .into_iter()
        .map(|s| TempSamplePoint {
            source_id: s.source_id,
            temp_c: s.temp_c,
            ts: s.ts.to_rfc3339(),
        })
        .collect())
}
