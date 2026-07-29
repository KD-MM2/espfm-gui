import { invoke } from "@tauri-apps/api/core";

export interface FanState {
  slot: number;
  name: string;
  mode: string;
  rpm: number;
  duty_pct: number;
  enabled: boolean;
  inverted: boolean;
  pwm_gpio: number;
  tach_gpio: number;
  source_id: number;
  curve_id: number;
  schedule_id: number;
  group_id: number;
}
export interface SourceState {
  slot: number;
  name: string;
  source_type: string;
  temp_c: number;
  rom_code: string | null;
}
export interface CurveState {
  slot: number;
  name: string;
  points: { temp_c: number; duty: number }[];
}
export interface ScheduleState {
  slot: number;
  fan_id: number;
  duty: number;
  start_min: number;
  end_min: number;
  enabled: boolean;
}
export interface SystemInfo {
  version: string;
  uptime_secs: number;
  heap_free: number;
  fan_count: number;
  source_count: number;
  curve_count: number;
  schedule_count: number;
  hostname: string;
}
export interface WifiAp {
  ssid: string;
  rssi: number;
  channel: number;
}
export interface WifiStatus {
  connected: boolean;
  ip: string;
  ap_ip: string;
}
export interface Ds18b20Device {
  index: number;
  rom_code: string;
  temp_c: number;
}

export const api = {
  discoverDevices: () => invoke<any[]>("discover_devices"),
  connectDevice: (addr: string) => invoke<any>("connect_device", { addr }),
  disconnectDevice: (id: number) => invoke("disconnect_device", { id }),
  getFans: (deviceId: number) =>
    invoke<FanState[]>("get_fans", { deviceId }),
  createFan: (
    deviceId: number,
    req: { name: string; pwm_gpio: number; tach_gpio: number }
  ) => invoke<FanState>("create_fan", { deviceId, req }),
  updateFan: (
    deviceId: number,
    slot: number,
    req: {
      name?: string;
      mode?: string;
      duty?: number;
      enabled?: boolean;
      inverted?: boolean;
      source_id?: number;
      curve_id?: number;
      schedule_id?: number;
      group_id?: number;
    }
  ) => invoke<FanState>("update_fan", { deviceId, slot, req }),
  deleteFan: (deviceId: number, slot: number) =>
    invoke("delete_fan", { deviceId, slot }),
  getSources: (deviceId: number) =>
    invoke<SourceState[]>("get_sources", { deviceId }),
  createSource: (
    deviceId: number,
    req: { name: string; source_type: string; gpio?: number; rom_code?: string }
  ) => invoke<SourceState>("create_source", { deviceId, req }),
  deleteSource: (deviceId: number, slot: number) =>
    invoke("delete_source", { deviceId, slot }),
  scanDs18b20: (deviceId: number) =>
    invoke<Ds18b20Device[]>("scan_ds18b20", { deviceId }),
  updateManualTemp: (deviceId: number, slot: number, tempC: number) =>
    invoke("update_manual_temp", { deviceId, slot, tempC }),
  getCurves: (deviceId: number) =>
    invoke<CurveState[]>("get_curves", { deviceId }),
  createCurve: (
    deviceId: number,
    req: { name: string; points: { temp_c: number; duty: number }[] }
  ) => invoke<CurveState>("create_curve", { deviceId, req }),
  updateCurve: (
    deviceId: number,
    slot: number,
    req: { name: string; points: { temp_c: number; duty: number }[] }
  ) => invoke<CurveState>("update_curve", { deviceId, slot, req }),
  deleteCurve: (deviceId: number, slot: number) =>
    invoke("delete_curve", { deviceId, slot }),
  getSchedules: (deviceId: number) =>
    invoke<ScheduleState[]>("get_schedules", { deviceId }),
  createSchedule: (
    deviceId: number,
    req: {
      fan_id: number;
      duty: number;
      start_min: number;
      end_min: number;
      enabled: boolean;
    }
  ) => invoke<ScheduleState>("create_schedule", { deviceId, req }),
  updateSchedule: (
    deviceId: number,
    slot: number,
    req: {
      fan_id: number;
      duty: number;
      start_min: number;
      end_min: number;
      enabled: boolean;
    }
  ) => invoke<ScheduleState>("update_schedule", { deviceId, slot, req }),
  deleteSchedule: (deviceId: number, slot: number) =>
    invoke("delete_schedule", { deviceId, slot }),
  getSystemInfo: (deviceId: number) =>
    invoke<SystemInfo>("get_system_info", { deviceId }),
  setHostname: (deviceId: number, hostname: string) =>
    invoke("set_hostname", { deviceId, hostname }),
  rebootDevice: (deviceId: number) =>
    invoke("reboot_device", { deviceId }),
  exportConfig: (deviceId: number) =>
    invoke<string>("export_config", { deviceId }),
  importConfig: (deviceId: number, config: string) =>
    invoke("import_config", { deviceId, config }),
  wifiScan: (deviceId: number) =>
    invoke<WifiAp[]>("wifi_scan", { deviceId }),
  wifiConnect: (deviceId: number, ssid: string, password: string) =>
    invoke("wifi_connect", { deviceId, ssid, password }),
  wifiStatus: (deviceId: number) =>
    invoke<WifiStatus>("wifi_status", { deviceId }),
};
