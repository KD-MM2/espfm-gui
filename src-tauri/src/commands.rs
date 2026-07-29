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
    pub ip_address: String,
    pub connected: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct FanState {
    pub slot: u8,
    pub name: String,
    pub rpm: u32,
    pub duty_pct: f32,
    pub enabled: bool,
    pub pwm_gpio: u8,
    pub tach_gpio: u8,
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
    pub enabled: Option<bool>,
    pub inverted: Option<bool>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SourceState {
    pub slot: u8,
    pub name: String,
    pub source_type: String,
    pub temp_c: f32,
    pub rom_code: Option<String>,
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
            ip_address: dev.ip.clone(),
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

    let mut next_id = state.next_device_id.lock().await;
    let id = *next_id;
    *next_id += 1;

    let hostname = system_info.hostname.clone();
    let conn = crate::state::DeviceConnection {
        client,
        hostname: hostname.clone(),
    };

    let mut connections = state.connections.lock().await;
    connections.insert(id, conn);

    Ok(DeviceInfo {
        id,
        hostname,
        ip_address: addr,
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
            rpm: f.rpm,
            duty_pct: f.duty_pct as f32,
            enabled: f.enabled,
            pwm_gpio: f.pwm_gpio as u8,
            tach_gpio: f.tach_gpio as u8,
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
        .create_fan(&req.name, req.pwm_gpio as u32, req.tach_gpio as u32)
        .await
        .map_err(|e| format!("create_fan failed: {e}"))?;
    Ok(FanState {
        slot: f.slot as u8,
        name: f.name,
        rpm: f.rpm,
        duty_pct: f.duty_pct as f32,
        enabled: f.enabled,
        pwm_gpio: f.pwm_gpio as u8,
        tach_gpio: f.tach_gpio as u8,
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
    let proto_req = proto::FanUpdateRequest {
        id: slot as u32,
        mode: None,
        duty: None,
        source_id: None,
        curve_id: None,
        schedule_id: None,
        group_id: None,
        inverted: req.inverted,
        enabled: req.enabled,
    };
    let f = conn
        .client
        .update_fan(slot as u32, &proto_req)
        .await
        .map_err(|e| format!("update_fan failed: {e}"))?;
    Ok(FanState {
        slot: f.slot as u8,
        name: f.name,
        rpm: f.rpm,
        duty_pct: f.duty_pct as f32,
        enabled: f.enabled,
        pwm_gpio: f.pwm_gpio as u8,
        tach_gpio: f.tach_gpio as u8,
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
    req: CreateScheduleRequest,
    state: State<'_, AppState>,
) -> Result<ScheduleState, String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    let proto_req = proto::ScheduleUpdateRequest {
        id: slot as u32,
        fan_id: Some(req.fan_id as u32),
        duty: Some(req.duty as u32),
        start_min: Some(req.start_min as u32),
        end_min: Some(req.end_min as u32),
        enabled: Some(req.enabled),
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
struct ExportCurvePoint {
    temp_c: f32,
    duty: u32,
}

#[derive(Serialize, Debug, Clone)]
struct ExportFan {
    id: u32,
    name: String,
    duty: u32,
    rpm: u32,
    enabled: bool,
    inverted: bool,
    pwm_gpio: u32,
    tach_gpio: u32,
}

#[derive(Serialize, Debug, Clone)]
struct ExportSource {
    id: u32,
    name: String,
    r#type: i32,
    temp_c: f32,
}

#[derive(Serialize, Debug, Clone)]
struct ExportCurve {
    id: u32,
    name: String,
    points: Vec<ExportCurvePoint>,
}

#[derive(Serialize, Debug, Clone)]
struct ExportSchedule {
    id: u32,
    fan_id: u32,
    duty: u32,
    start_min: u32,
    end_min: u32,
    enabled: bool,
}

#[derive(Serialize, Debug, Clone)]
struct ExportConfig {
    version: String,
    fans: Vec<ExportFan>,
    sources: Vec<ExportSource>,
    curves: Vec<ExportCurve>,
    schedules: Vec<ExportSchedule>,
}

#[tauri::command]
pub async fn export_config(device_id: u32, state: State<'_, AppState>) -> Result<String, String> {
    let connections = state.connections.lock().await;
    let conn = connections
        .get(&device_id)
        .ok_or_else(|| format!("Device {device_id} not connected"))?;
    let config = conn
        .client
        .export_config()
        .await
        .map_err(|e| format!("export_config failed: {e}"))?;

    let export = ExportConfig {
        version: config.version,
        fans: config
            .fans
            .map(|fl| {
                fl.fans
                    .into_iter()
                    .map(|f| ExportFan {
                        id: f.id,
                        name: f.name,
                        duty: f.duty,
                        rpm: f.rpm,
                        enabled: f.enabled,
                        inverted: f.inverted,
                        pwm_gpio: f.pwm_gpio,
                        tach_gpio: f.tach_gpio,
                    })
                    .collect()
            })
            .unwrap_or_default(),
        sources: config
            .sources
            .map(|sl| {
                sl.sources
                    .into_iter()
                    .map(|s| ExportSource {
                        id: s.id,
                        name: s.name,
                        r#type: s.r#type,
                        temp_c: s.temp_c,
                    })
                    .collect()
            })
            .unwrap_or_default(),
        curves: config
            .curves
            .map(|cl| {
                cl.curves
                    .into_iter()
                    .map(|c| ExportCurve {
                        id: c.id,
                        name: c.name,
                        points: c
                            .points
                            .into_iter()
                            .map(|p| ExportCurvePoint {
                                temp_c: p.temp_c,
                                duty: p.duty,
                            })
                            .collect(),
                    })
                    .collect()
            })
            .unwrap_or_default(),
        schedules: config
            .schedules
            .map(|sl| {
                sl.schedules
                    .into_iter()
                    .map(|s| ExportSchedule {
                        id: s.id,
                        fan_id: s.fan_id,
                        duty: s.duty,
                        start_min: s.start_min,
                        end_min: s.end_min,
                        enabled: s.enabled,
                    })
                    .collect()
            })
            .unwrap_or_default(),
    };

    serde_json::to_string_pretty(&export).map_err(|e| format!("JSON serialization failed: {e}"))
}

#[tauri::command]
pub async fn import_config(
    device_id: u32,
    config: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let _ = (device_id, config, state);
    Err("import_config is not yet implemented on the device".to_string())
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
