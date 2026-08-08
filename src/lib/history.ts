import { api } from "./api";
import type { FanSample } from "./fanSample";

/** Load historical samples from SQLite. Returns sorted FanSample[].
 *  Does NOT publish to EventBus — caller should restore() into store directly. */
export async function loadHistory(deviceId: number, minutes: number): Promise<FanSample[]> {
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
      if (!buckets.has(bucketKey)) buckets.set(bucketKey, { fans: new Map(), temps: new Map() });
      const bucket = buckets.get(bucketKey)!;
      const prev = bucket.fans.get(s.fan_id) || {
        sum: 0,
        count: 0,
        duty: s.duty
      };
      bucket.fans.set(s.fan_id, {
        sum: prev.sum + s.rpm,
        count: prev.count + 1,
        duty: s.duty
      });
    }

    for (const s of tempSamples) {
      const ts = new Date(s.ts).getTime();
      const bucketKey = Math.floor(ts / 60000) * 60000;
      if (!buckets.has(bucketKey)) buckets.set(bucketKey, { fans: new Map(), temps: new Map() });
      const bucket = buckets.get(bucketKey)!;
      const prev = bucket.temps.get(s.source_id) || { sum: 0, count: 0 };
      bucket.temps.set(s.source_id, {
        sum: prev.sum + s.temp_c,
        count: prev.count + 1
      });
    }

    const [fanList, sourceList] = await Promise.all([api.getFans(deviceId), api.getSources(deviceId)]);
    const fanNames = new Map(fanList.map((f) => [f.slot, f.name || `Fan ${f.slot}`]));
    const sourceNames = new Map(sourceList.map((s) => [s.slot, s.name || `Source ${s.slot}`]));

    const samples: FanSample[] = [];
    for (const [ts, bucket] of buckets) {
      const fans = Array.from(bucket.fans.entries()).map(([id, { sum, count, duty }]) => ({
        id,
        name: fanNames.get(id) || `Fan ${id}`,
        rpm: Math.round(sum / count),
        duty,
        enabled: true
      }));

      const temperatures = Array.from(bucket.temps.entries()).map(([slot, { sum, count }]) => ({
        slot,
        name: sourceNames.get(slot) || `Source ${slot}`,
        temp_c: Math.round((sum / count) * 10) / 10,
        source_type: "unknown"
      }));

      samples.push({ timestamp: ts, fans, temperatures, system: null });
    }

    console.log(`[loadHistory] loaded ${samples.length} samples for device ${deviceId} (${minutes}m)`);
    return samples.sort((a, b) => a.timestamp - b.timestamp);
  } catch (e) {
    console.warn("loadHistory failed:", e);
    return [];
  }
}
