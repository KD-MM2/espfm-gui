export interface FanData {
  id: number;
  name: string;
  rpm: number;
  duty: number;
  enabled: boolean;
}

export interface TemperatureData {
  slot: number;
  name: string;
  temp_c: number;
  source_type: string;
}

export interface SystemData {
  uptime_secs: number;
  heap_free: number;
  version: string;
}

export interface FanSample {
  timestamp: number; // Unix ms
  fans: FanData[];
  temperatures: TemperatureData[];
  system: SystemData | null;
}

export interface ChartDataPoint {
  time: string;
  [key: string]: string | number;
}
