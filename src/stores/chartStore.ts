import { create } from "zustand";
import { TimeSeriesBuffer, type TimeRange } from "../lib/timeSeriesBuffer";
import type { ChartDataPoint } from "../lib/fanSample";
import { eventBus } from "../lib/events";

interface ChartStore {
  buffer: TimeSeriesBuffer;
  chartData: ChartDataPoint[];
  fanNames: string[];
  tempNames: string[];
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  updateChart: () => void;
}

const buffer = new TimeSeriesBuffer();

export const useChartStore = create<ChartStore>((set, get) => ({
  buffer,
  chartData: [],
  fanNames: [],
  tempNames: [],
  timeRange: "1h",

  setTimeRange: (range) => {
    set({ timeRange: range });
    get().updateChart();
  },

  updateChart: () => {
    const { buffer, timeRange } = get();
    const chartData = buffer.toChartData(timeRange);
    const fanNames = buffer.getFanNames();
    const tempNames = buffer.getTempNames();
    set({ chartData, fanNames, tempNames });
  },
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
