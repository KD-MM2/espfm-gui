import { eventBus } from "./events";
import { api } from "./api";
import type { FanSample } from "./fanSample";

let activeDeviceId: number | null = null;
const prevDuties = new Map<number, number>();

export function setDetectorDevice(deviceId: number | null): void {
  activeDeviceId = deviceId;
  prevDuties.clear();
}

type ActivityCallback = (message: string, details: string) => void;
let onActivity: ActivityCallback | null = null;

export function setActivityCallback(cb: ActivityCallback | null): void {
  onActivity = cb;
}

function handleSample(sample: FanSample): void {
  if (activeDeviceId == null) return;

  for (const fan of sample.fans) {
    const prev = prevDuties.get(fan.id);
    if (prev !== undefined && prev !== fan.duty) {
      const msg = `${fan.name} duty → ${fan.duty.toFixed(0)}%`;
      const details = `slot=${fan.id}, old=${prev}%, new=${fan.duty}%`;

      api.saveLog(activeDeviceId, "fan", msg, details).catch((e) =>
        console.warn("[activityDetector] saveLog failed:", e)
      );

      if (onActivity) {
        onActivity(msg, details);
      }
    }
    prevDuties.set(fan.id, fan.duty);
  }
}

let unsubscribe: (() => void) | null = null;

export function startActivityDetector(): void {
  if (unsubscribe) return;
  unsubscribe = eventBus.subscribe(handleSample);
}

export function stopActivityDetector(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  prevDuties.clear();
}
