import { api } from "./api";
import { useActivityStore } from "../stores/activityStore";

let nextId = Date.now() * 1000;

/** Generate a unique monotonic ID for in-memory activity entries. */
export function genId(): number {
  return nextId++;
}

/**
 * Log a user action to both SQLite and ActivityStore.
 * Use this in page action handlers (create/update/delete fans, sources, etc.).
 */
export function logUserAction(deviceId: number, eventType: string, message: string, details: string): void {
  // Persist to SQLite
  api.saveLog(deviceId, eventType, message, details).catch((e) => console.warn("[logUserAction] saveLog failed:", e));

  // Push to ActivityStore (immediate UI update)
  useActivityStore.getState().push({
    id: genId(),
    device_id: deviceId,
    event_type: eventType,
    message,
    details,
    ts: new Date().toISOString()
  });
}

