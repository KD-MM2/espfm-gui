/**
 * Session-scoped monitoring pipeline manager.
 *
 * Lifecycle is tied to device connection, NOT page navigation.
 * - start(deviceId): restore stores from SQLite, then start realtime Collector
 * - stop(): stop Collector and clear stores
 *
 * Navigating away from Dashboard does NOT call stop().
 * Only device disconnect or app shutdown calls stop().
 */

import { Collector, loadHistory } from "./collectors";
import { useChartStore, startChartStore, stopChartStore } from "../stores/chartStore";
import { useActivityStore } from "../stores/activityStore";
import { startSqliteWriter, stopSqliteWriter, setWriterDevice } from "./sqliteWriter";
import { startActivityDetector, stopActivityDetector, setDetectorDevice } from "./activityDetector";
import type { TimeRange } from "./timeSeriesBuffer";

let activeDeviceId: number | null = null;
let collector: Collector | null = null;
let initialized = false;

/** Get the currently active monitoring device, if any. */
export function getActiveMonitoringDevice(): number | null {
  return activeDeviceId;
}

/**
 * Start the monitoring pipeline for a device.
 * Idempotent — calling with the same deviceId is a no-op.
 * Calling with a different deviceId stops the previous session first.
 */
export async function startMonitoringSession(
  deviceId: number,
  timeRangeMinutes: number
): Promise<void> {
  if (activeDeviceId === deviceId && initialized) return;

  // Stop previous session if switching devices
  if (activeDeviceId !== null) {
    stopMonitoringSession();
  }

  activeDeviceId = deviceId;
  setWriterDevice(deviceId);
  setDetectorDevice(deviceId);

  // Start EventBus subscribers (these persist for the session)
  startChartStore();
  startSqliteWriter();
  startActivityDetector();

  // Phase 1: Restore stores directly from SQLite (NOT through EventBus)
  const [historySamples] = await Promise.all([
    loadHistory(deviceId, timeRangeMinutes),
    useActivityStore.getState().loadFromDb(deviceId),
  ]);

  // Direct restore into chart store — idempotent, no EventBus replay
  useChartStore.getState().restore(historySamples);

  // Phase 2: Start realtime Collector (publishes to EventBus going forward)
  collector = new Collector(deviceId);
  await collector.start();

  initialized = true;
}

/** Stop the monitoring session. Clears all subscribers and stores. */
export function stopMonitoringSession(): void {
  if (collector) {
    collector.stop();
    collector = null;
  }
  stopChartStore();
  stopSqliteWriter();
  stopActivityDetector();
  setWriterDevice(null);
  setDetectorDevice(null);
  useChartStore.getState().buffer.clear();
  useChartStore.getState().updateChart();
  useActivityStore.getState().clear();
  activeDeviceId = null;
  initialized = false;
}

/** Change the chart time range and reload history. */
export async function changeTimeRange(range: TimeRange): Promise<void> {
  const RANGE_MINUTES: Record<TimeRange, number> = {
    "30m": 30,
    "1h": 60,
    "6h": 360,
    "24h": 1440,
  };

  const { setTimeRange } = useChartStore.getState();
  setTimeRange(range);

  if (activeDeviceId !== null) {
    const samples = await loadHistory(activeDeviceId, RANGE_MINUTES[range]);
    useChartStore.getState().restore(samples);
  }
}
