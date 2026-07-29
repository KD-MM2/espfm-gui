import type { FanSample, ChartDataPoint } from "./fanSample";

export type TimeRange = "30m" | "1h" | "6h" | "24h";
export type BucketSize = 10 | 30 | 60 | 300 | 600 | 900;

const RANGE_MINUTES: Record<TimeRange, number> = {
  "30m": 30,
  "1h": 60,
  "6h": 360,
  "24h": 1440,
};

export const BUCKET_OPTIONS: { value: BucketSize; label: string }[] = [
  { value: 10, label: "10s" },
  { value: 30, label: "30s" },
  { value: 60, label: "1min" },
  { value: 300, label: "5min" },
  { value: 600, label: "10min" },
  { value: 900, label: "15min" },
];

export class TimeSeriesBuffer {
  private samples: FanSample[] = [];
  private maxSamples: number;

  constructor(maxSamples = 10000) {
    this.maxSamples = maxSamples;
  }

  push(sample: FanSample): void {
    this.samples.push(sample);
    if (this.samples.length > this.maxSamples) {
      this.samples = this.samples.slice(this.samples.length - this.maxSamples);
    }
  }

  clear(): void {
    this.samples = [];
  }

  getSamples(): FanSample[] {
    return this.samples;
  }

  getRange(minutes: number): FanSample[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.samples.filter((s) => s.timestamp >= cutoff);
  }

  toChartData(range: TimeRange, bucketSeconds: BucketSize = 60): ChartDataPoint[] {
    const minutes = RANGE_MINUTES[range];
    const samples = this.getRange(minutes);
    if (samples.length === 0) return [];

    const bucketMs = bucketSeconds * 1000;

    const buckets = new Map<number, FanSample[]>();
    for (const s of samples) {
      const key = Math.floor(s.timestamp / bucketMs) * bucketMs;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(s);
    }

    const points: ChartDataPoint[] = [];
    for (const [ts, bucket] of buckets) {
      const point: ChartDataPoint = {
        time: formatTime(ts, range),
      };

      const fanSums = new Map<
        number,
        { sum: number; count: number; name: string }
      >();
      for (const s of bucket) {
        for (const f of s.fans) {
          const prev = fanSums.get(f.id) || {
            sum: 0,
            count: 0,
            name: f.name,
          };
          fanSums.set(f.id, {
            sum: prev.sum + f.rpm,
            count: prev.count + 1,
            name: f.name,
          });
        }
      }
      for (const [_fanId, { sum, count, name }] of fanSums) {
        point[name] = Math.round(sum / count);
      }

      const tempSums = new Map<
        number,
        { sum: number; count: number; name: string }
      >();
      for (const s of bucket) {
        for (const t of s.temperatures) {
          const prev = tempSums.get(t.slot) || {
            sum: 0,
            count: 0,
            name: t.name,
          };
          tempSums.set(t.slot, {
            sum: prev.sum + t.temp_c,
            count: prev.count + 1,
            name: t.name,
          });
        }
      }
      for (const [_slot, { sum, count, name }] of tempSums) {
        point[`temp_${name}`] = Math.round((sum / count) * 10) / 10;
      }

      points.push(point);
    }

    return points.sort((a, b) => {
      const aTime = a.time;
      const bTime = b.time;
      return aTime.localeCompare(bTime);
    });
  }

  getFanNames(): string[] {
    const names = new Set<string>();
    for (const s of this.samples) {
      for (const f of s.fans) {
        names.add(f.name);
      }
    }
    return Array.from(names);
  }

  getTempNames(): string[] {
    const names = new Set<string>();
    for (const s of this.samples) {
      for (const t of s.temperatures) {
        names.add(`temp_${t.name}`);
      }
    }
    return Array.from(names);
  }
}

function formatTime(ts: number, range: TimeRange): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");

  if (range === "24h") {
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${month}/${day} ${hh}:${mm}`;
  }

  return `${hh}:${mm}:${ss}`;
}
