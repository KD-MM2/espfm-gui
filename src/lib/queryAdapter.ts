import { QueryClient } from "@tanstack/react-query";
import { eventBus } from "./events";
import type { FanData, FanSample, SystemData, TemperatureData } from "./fanSample";

let unsubscribe: (() => void) | null = null;
let activeDeviceId: number | null = null;

const latest: {
  fans?: FanData[];
  temperatures?: TemperatureData[];
  system?: SystemData | null;
} = {};

function publish() {
  if (latest.fans === undefined && latest.temperatures === undefined && latest.system === undefined) return;
  const sample: FanSample = {
    timestamp: Date.now(),
    fans: latest.fans ?? [],
    temperatures: latest.temperatures ?? [],
    system: latest.system ?? null,
  };
  eventBus.publish(sample);
}

export function startQueryAdapter(client: QueryClient, deviceId: number): void {
  stopQueryAdapter();
  activeDeviceId = deviceId;
  latest.fans = undefined;
  latest.temperatures = undefined;
  latest.system = undefined;

  unsubscribe = client.getQueryCache().subscribe((event) => {
    const key = event.query.queryKey;
    const kind = key[0];
    const dev = key[1];
    if (dev !== activeDeviceId) return;
    if (kind !== "fans" && kind !== "sources" && kind !== "system") return;

    const data = event.query.state.data;
    if (!data) return;

    if (kind === "fans" && Array.isArray(data)) {
      latest.fans = (data as Array<{ slot: number; name: string; rpm: number; duty_pct: number; enabled: boolean }>).map((f) => ({
        id: f.slot,
        name: f.name,
        rpm: f.rpm,
        duty: f.duty_pct,
        enabled: f.enabled,
      }));
    } else if (kind === "sources" && Array.isArray(data)) {
      latest.temperatures = (data as Array<{ slot: number; name: string; temp_c: number; source_type: string }>).map((s) => ({
        slot: s.slot,
        name: s.name,
        temp_c: s.temp_c,
        source_type: s.source_type,
      }));
    } else if (kind === "system" && data) {
      const s = data as { uptime_secs: number; heap_free: number; version: string };
      latest.system = { uptime_secs: s.uptime_secs, heap_free: s.heap_free, version: s.version };
    }
    publish();
  });
}

export function stopQueryAdapter(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  activeDeviceId = null;
  latest.fans = undefined;
  latest.temperatures = undefined;
  latest.system = undefined;
}
