import { useState } from "react";
import { FanTempChart, type ChartDataPoint } from "../components/dashboard/FanTempChart";
import { SystemInfoCard } from "../components/dashboard/SystemInfoCard";
import { ActivityLog, type ActivityEntry } from "../components/dashboard/ActivityLog";

type TimeRange = "30m" | "1h" | "6h" | "24h";

function generateMockChartData(): ChartDataPoint[] {
  const points: ChartDataPoint[] = [];
  for (let i = 0; i < 30; i++) {
    const minute = i * 2;
    const label = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
    points.push({
      time: label,
      "Fan 1": 800 + Math.round(Math.sin(i / 4) * 200 + Math.random() * 50),
      "Fan 2": 600 + Math.round(Math.cos(i / 5) * 150 + Math.random() * 40),
      temperature: 35 + Math.round(Math.sin(i / 6) * 8 + Math.random() * 2),
    });
  }
  return points;
}

const MOCK_CHART_DATA = generateMockChartData();

const MOCK_ACTIVITY: ActivityEntry[] = [
  { id: "1", type: "fan", message: "Fan 1 set to 75% duty", time: "2 min ago" },
  { id: "2", type: "temp", message: "Temperature reached 42°C", time: "5 min ago" },
  { id: "3", type: "schedule", message: "Night profile activated", time: "1 hr ago" },
  { id: "4", type: "error", message: "DS18B20 read timeout on GPIO 4", time: "2 hr ago" },
];

export function DashboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("1h");

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#171717]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#60646c]">
          esp-fan-01 &middot; 192.168.1.42
        </p>
      </div>

      {/* Content grid: 2/3 chart, 1/3 sidebar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Chart — spans 2 columns */}
        <div className="lg:col-span-2">
          <FanTempChart
            data={MOCK_CHART_DATA}
            fanNames={["Fan 1", "Fan 2"]}
            showTemp
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />
        </div>

        {/* Right column: system info + activity */}
        <div className="flex flex-col gap-4">
          <SystemInfoCard
            uptime="3d 12h 41m"
            heapFree="142 KB"
            version="0.1.0"
            status="healthy"
          />
          <ActivityLog entries={MOCK_ACTIVITY} />
        </div>
      </div>
    </div>
  );
}
