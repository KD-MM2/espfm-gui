import { eventBus } from "./events";
import { api } from "./api";
import type { FanSample } from "./fanSample";

export class Collector {
  private deviceId: number;
  private fanInterval: ReturnType<typeof setInterval> | null = null;
  private sourceInterval: ReturnType<typeof setInterval> | null = null;
  private systemInterval: ReturnType<typeof setInterval> | null = null;

  private latestFans: FanSample["fans"] = [];
  private latestTemps: FanSample["temperatures"] = [];
  private latestSystem: FanSample["system"] = null;

  constructor(deviceId: number) {
    this.deviceId = deviceId;
  }

  async start(): Promise<void> {
    await this.fetchFans();
    await this.fetchSources();
    await this.fetchSystemInfo();
    this.publishSample();

    this.fanInterval = setInterval(async () => {
      await this.fetchFans();
      this.publishSample();
    }, 2000);

    this.sourceInterval = setInterval(async () => {
      await this.fetchSources();
    }, 10000);

    this.systemInterval = setInterval(async () => {
      await this.fetchSystemInfo();
    }, 30000);
  }

  stop(): void {
    if (this.fanInterval) clearInterval(this.fanInterval);
    if (this.sourceInterval) clearInterval(this.sourceInterval);
    if (this.systemInterval) clearInterval(this.systemInterval);
    this.fanInterval = null;
    this.sourceInterval = null;
    this.systemInterval = null;
  }

  private async fetchFans(): Promise<void> {
    try {
      const fans = await api.getFans(this.deviceId);
      this.latestFans = fans.map((f) => ({
        id: f.slot,
        name: f.name || `Fan ${f.slot}`,
        rpm: f.rpm,
        duty: f.duty_pct,
        enabled: f.enabled,
      }));
    } catch (e) {
      console.warn("Collector: fetchFans failed:", e);
    }
  }

  private async fetchSources(): Promise<void> {
    try {
      const sources = await api.getSources(this.deviceId);
      this.latestTemps = sources.map((s) => ({
        slot: s.slot,
        name: s.name || `Source ${s.slot}`,
        temp_c: s.temp_c,
        source_type: s.source_type,
      }));
    } catch (e) {
      console.warn("Collector: fetchSources failed:", e);
    }
  }

  private async fetchSystemInfo(): Promise<void> {
    try {
      const info = await api.getSystemInfo(this.deviceId);
      this.latestSystem = {
        uptime_secs: info.uptime_secs,
        heap_free: info.heap_free,
        version: info.version,
      };
    } catch (e) {
      console.warn("Collector: fetchSystemInfo failed:", e);
    }
  }

  private publishSample(): void {
    const sample: FanSample = {
      timestamp: Date.now(),
      fans: this.latestFans,
      temperatures: this.latestTemps,
      system: this.latestSystem,
    };
    eventBus.publish(sample);
  }
}

/** Load historical samples from SQLite. Returns sorted FanSample[].
 *  Does NOT publish to EventBus — caller should restore() into store directly. */
export async function loadHistory(
  deviceId: number,
  minutes: number
): Promise<FanSample[]> {
  try {
    const fanSamples = await api.getRecentFanSamples(deviceId, minutes);
    const tempSamples = await api.getRecentTempSamples(deviceId, minutes);

    const buckets = new Map<
      number,
      {
        fans: Map<number, { sum: number; count: number; duty: number }>;
        temps: Map<number, { sum: number; count: number }>;
      }
    >();

    for (const s of fanSamples) {
      const ts = new Date(s.ts).getTime();
      const bucketKey = Math.floor(ts / 60000) * 60000;
      if (!buckets.has(bucketKey))
        buckets.set(bucketKey, { fans: new Map(), temps: new Map() });
      const bucket = buckets.get(bucketKey)!;
      const prev = bucket.fans.get(s.fan_id) || {
        sum: 0,
        count: 0,
        duty: s.duty,
      };
      bucket.fans.set(s.fan_id, {
        sum: prev.sum + s.rpm,
        count: prev.count + 1,
        duty: s.duty,
      });
    }

    for (const s of tempSamples) {
      const ts = new Date(s.ts).getTime();
      const bucketKey = Math.floor(ts / 60000) * 60000;
      if (!buckets.has(bucketKey))
        buckets.set(bucketKey, { fans: new Map(), temps: new Map() });
      const bucket = buckets.get(bucketKey)!;
      const prev = bucket.temps.get(s.source_id) || { sum: 0, count: 0 };
      bucket.temps.set(s.source_id, {
        sum: prev.sum + s.temp_c,
        count: prev.count + 1,
      });
    }

    const [fanList, sourceList] = await Promise.all([
      api.getFans(deviceId),
      api.getSources(deviceId),
    ]);
    const fanNames = new Map(
      fanList.map((f) => [f.slot, f.name || `Fan ${f.slot}`])
    );
    const sourceNames = new Map(
      sourceList.map((s) => [s.slot, s.name || `Source ${s.slot}`])
    );

    const samples: FanSample[] = [];
    for (const [ts, bucket] of buckets) {
      const fans = Array.from(bucket.fans.entries()).map(
        ([id, { sum, count, duty }]) => ({
          id,
          name: fanNames.get(id) || `Fan ${id}`,
          rpm: Math.round(sum / count),
          duty,
          enabled: true,
        })
      );

      const temperatures = Array.from(bucket.temps.entries()).map(
        ([slot, { sum, count }]) => ({
          slot,
          name: sourceNames.get(slot) || `Source ${slot}`,
          temp_c: Math.round((sum / count) * 10) / 10,
          source_type: "unknown",
        })
      );

      samples.push({ timestamp: ts, fans, temperatures, system: null });
    }

    console.log(`[loadHistory] loaded ${samples.length} samples for device ${deviceId} (${minutes}m)`);
    return samples.sort((a, b) => a.timestamp - b.timestamp);
  } catch (e) {
    console.warn("loadHistory failed:", e);
    return [];
  }
}
