import { eventBus } from "./events";
import { api } from "./api";
import type { FanSample } from "./fanSample";

let activeDeviceId: number | null = null;
let maintenanceInterval: ReturnType<typeof setInterval> | null = null;

export function setWriterDevice(deviceId: number | null): void {
  activeDeviceId = deviceId;
}

function handleSample(sample: FanSample): void {
  if (activeDeviceId == null) return;

  if (sample.fans.length > 0) {
    const fanBatch: [number, number, number][] = sample.fans.map((f) => [
      f.id,
      f.rpm,
      f.duty,
    ]);
    api.saveFanSamplesBatch(activeDeviceId, fanBatch).catch((e) =>
      console.warn("[sqliteWriter] saveFanSamplesBatch failed:", e)
    );
  }

  if (sample.temperatures.length > 0) {
    const tempBatch: [number, number][] = sample.temperatures.map((t) => [
      t.slot,
      t.temp_c,
    ]);
    api.saveTempSamplesBatch(activeDeviceId, tempBatch).catch((e) =>
      console.warn("[sqliteWriter] saveTempSamplesBatch failed:", e)
    );
  }
}

let unsubscribe: (() => void) | null = null;

export function startSqliteWriter(): void {
  if (unsubscribe) return;
  unsubscribe = eventBus.subscribe(handleSample);

  // Run DB maintenance every 5 minutes (downsample + cleanup)
  maintenanceInterval = setInterval(() => {
    if (activeDeviceId == null) return;
    api.runMaintenance(activeDeviceId).catch((e) =>
      console.warn("[sqliteWriter] runMaintenance failed:", e)
    );
  }, 5 * 60 * 1000);
}

export function stopSqliteWriter(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  if (maintenanceInterval) {
    clearInterval(maintenanceInterval);
    maintenanceInterval = null;
  }
}
