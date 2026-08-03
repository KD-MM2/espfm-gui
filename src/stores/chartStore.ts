import { create } from "zustand";
import { TimeSeriesBuffer, type TimeRange, type BucketSize } from "../lib/timeSeriesBuffer";
import type { ChartDataPoint, FanSample } from "../lib/fanSample";
import { eventBus } from "../lib/events";

interface ChartStore {
  buffer: TimeSeriesBuffer;
  chartData: ChartDataPoint[];
  fanNames: string[];
  tempNames: string[];
  timeRange: TimeRange;
  bucketSize: BucketSize;
  setTimeRange: (range: TimeRange) => void;
  setBucketSize: (size: BucketSize) => void;
  updateChart: () => void;
  restore: (samples: FanSample[]) => void;
}

const buffer = new TimeSeriesBuffer();

export const useChartStore = create<ChartStore>((set, get) => ({
  buffer,
  chartData: [],
  fanNames: [],
  tempNames: [],
  timeRange: "1h",
  bucketSize: 60,

  setTimeRange: (range) => {
    set({ timeRange: range });
    get().updateChart();
  },

  setBucketSize: (size) => {
    set({ bucketSize: size });
    get().updateChart();
  },

  updateChart: () => {
    const { buffer, timeRange, bucketSize } = get();
    const chartData = buffer.toChartData(timeRange, bucketSize);
    const fanNames = buffer.getFanNames();
    const tempNames = buffer.getTempNames();
    set({ chartData, fanNames, tempNames });
  },

  restore: (samples: FanSample[]) => {
    get().buffer.restore(samples);
    get().updateChart();
  }
}));

let unsubscribe: (() => void) | null = null;

export function startChartStore(): void {
  if (unsubscribe) return;
  unsubscribe = eventBus.subscribe((sample) => {
    const store = useChartStore.getState();
    store.buffer.push(sample);
    store.updateChart();
  });
}

export function stopChartStore(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

export function clearChartBuffer(): void {
  useChartStore.getState().buffer.clear();
  useChartStore.getState().updateChart();
}

