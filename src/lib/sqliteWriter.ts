import { eventBus } from "./events";
import { api } from "./api";
import type { FanSample } from "./fanSample";

let activeDeviceId: number | null = null;

export function setWriterDevice(deviceId: number | null): void {
  activeDeviceId = deviceId;
}

function handleSample(sample: FanSample): void {
  if (activeDeviceId == null) return;

  for (const fan of sample.fans) {
    api.saveFanSample(activeDeviceId, fan.id, fan.rpm, fan.duty).catch(() => {});
  }

  for (const temp of sample.temperatures) {
    api.saveTempSample(activeDeviceId, temp.slot, temp.temp_c).catch(() => {});
  }
}

let unsubscribe: (() => void) | null = null;

export function startSqliteWriter(): void {
  if (unsubscribe) return;
  unsubscribe = eventBus.subscribe(handleSample);
}

export function stopSqliteWriter(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}
