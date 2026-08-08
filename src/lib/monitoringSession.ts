/**
 * Session-scoped monitoring pipeline manager.
 *
 * Lifecycle is tied to device connection, NOT page navigation.
 * - start(deviceId): restore stores from SQLite, then start realtime queryAdapter
 * - stop(): stop queryAdapter and clear stores
 *
 * Navigating away from Dashboard does NOT call stop().
 * Only device disconnect or app shutdown calls stop().
 */

import { loadHistory } from "./history";
import { startQueryAdapter, stopQueryAdapter } from "./queryAdapter";
import { queryClient } from "./queryClient";
import { api } from "./api";
import { useChartStore, startChartStore, stopChartStore } from "../stores/chartStore";
import { useActivityStore } from "../stores/activityStore";
import { useDeviceStore } from "../stores/deviceStore";
import { startSqliteWriter, stopSqliteWriter, setWriterDevice } from "./sqliteWriter";
import { startActivityDetector, stopActivityDetector, setDetectorDevice } from "./activityDetector";
import { RANGE_MINUTES, type TimeRange } from "./timeSeriesBuffer";

let activeDeviceId: number | null = null;
let initialized = false;
let generation = 0; // incremented on each start call to detect superseded sessions

/**
 * Start the monitoring pipeline for a device.
 * Idempotent — calling with the same deviceId is a no-op.
 * Calling with a different deviceId stops the previous session first.
 */
export async function startMonitoringSession(deviceId: number, timeRangeMinutes: number): Promise<void> {
  console.log(`[monitoringSession] startMonitoringSession(${deviceId}), current=${activeDeviceId}, initialized=${initialized}`);
  if (activeDeviceId === deviceId && initialized) return;

  // Stop previous session if switching devices
  if (activeDeviceId !== null) {
    stopMonitoringSession();
  }

  const gen = ++generation;
  activeDeviceId = deviceId;
  setWriterDevice(deviceId);
  setDetectorDevice(deviceId);

  // Ensure device exists in SQLite before starting the writer (FK constraint)
  const device = useDeviceStore.getState().devices.find((d) => d.id === deviceId);
  if (device) {
    const [ip, port] = device.ipAddress.split(":");
    await api.saveDeviceInfo(device.hostname, ip, Number(port));
  }

  // Start EventBus subscribers (these persist for the session)
  startChartStore();
  startSqliteWriter();
  startActivityDetector();

  // Phase 1: Restore stores directly from SQLite (NOT through EventBus)
  const [historySamples] = await Promise.all([loadHistory(deviceId, timeRangeMinutes), useActivityStore.getState().loadFromDb(deviceId)]);

  // If another startMonitoringSession call superseded us, abort
  if (gen !== generation) return;

  // Direct restore into chart store — idempotent, no EventBus replay
  useChartStore.getState().restore(historySamples);

  // Phase 2: Start realtime queryAdapter (publishes to EventBus going forward)
  startQueryAdapter(queryClient, deviceId);

  // Final check: if superseded during adapter start, stop the orphan
  if (gen !== generation) {
    stopQueryAdapter();
    return;
  }

  initialized = true;
}

/** Stop the monitoring session. Clears subscribers and stores. */
export function stopMonitoringSession(): void {
  stopQueryAdapter();
  stopChartStore();
  stopSqliteWriter();
  stopActivityDetector();
  setWriterDevice(null);
  setDetectorDevice(null);
  // Note: stores are NOT cleared here — the next startMonitoringSession
  // will restore from SQLite and overwrite. This avoids a flash of empty UI.
  activeDeviceId = null;
  initialized = false;
}

/** Change the chart time range and reload history. */
export async function changeTimeRange(range: TimeRange): Promise<void> {
  const { setTimeRange } = useChartStore.getState();
  setTimeRange(range);

  if (activeDeviceId !== null) {
    const samples = await loadHistory(activeDeviceId, RANGE_MINUTES[range]);
    useChartStore.getState().restore(samples);
  }
}

