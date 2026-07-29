import { useState, useEffect, useRef, useCallback } from "react";
import { FanTempChart, type ChartDataPoint } from "../components/dashboard/FanTempChart";
import { SystemInfoCard } from "../components/dashboard/SystemInfoCard";
import { ActivityLog, type ActivityEntry } from "../components/dashboard/ActivityLog";
import { api, type FanState, type SystemInfo } from "../lib/api";
import { useDeviceStore } from "../stores/deviceStore";

type TimeRange = "30m" | "1h" | "6h" | "24h";

const MAX_POINTS = 60; // Rolling window of data points

export function DashboardPage() {
  const activeDeviceId = useDeviceStore((s) => s.activeDeviceId);
  const devices = useDeviceStore((s) => s.devices);
  const activeDevice = devices.find((d) => d.id === activeDeviceId);

  const [timeRange, setTimeRange] = useState<TimeRange>("1h");
  const [fans, setFans] = useState<FanState[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const activityIdRef = useRef(0);
  const prevFansRef = useRef<Map<number, FanState>>(new Map());

  const fetchFanData = useCallback(async () => {
    if (!activeDeviceId) return;
    try {
      const fanList = await api.getFans(activeDeviceId);
      setFans(fanList);

      // Build chart data point from current fan state
      const now = new Date();
      const timeLabel = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const point: ChartDataPoint = { time: timeLabel };

      for (const fan of fanList) {
        point[fan.name || `Fan ${fan.slot}`] = fan.rpm;
      }

      // Use first source temperature if available (placeholder — sources not fetched here)
      // For now, skip temperature line if no source data

      setChartData((prev) => {
        const next = [...prev, point];
        return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next;
      });

      // Detect changes for activity log
      const prevFans = prevFansRef.current;
      for (const fan of fanList) {
        const prev = prevFans.get(fan.slot);
        if (prev && prev.duty_pct !== fan.duty_pct) {
          activityIdRef.current += 1;
          setActivity((a) => [
            {
              id: String(activityIdRef.current),
              type: "fan",
              message: `${fan.name || `Fan ${fan.slot}`} duty → ${fan.duty_pct.toFixed(0)}%`,
              time: "just now",
            },
            ...a.slice(0, 49),
          ]);
        }
      }
      prevFansRef.current = new Map(fanList.map((f) => [f.slot, f]));
      setError(null);
    } catch (e) {
      setError(`Failed to fetch fans: ${e}`);
    }
  }, [activeDeviceId]);

  const fetchSystemInfo = useCallback(async () => {
    if (!activeDeviceId) return;
    try {
      const info = await api.getSystemInfo(activeDeviceId);
      setSystemInfo(info);
    } catch (e) {
      // System info polling is non-critical
      console.warn("System info fetch failed:", e);
    }
  }, [activeDeviceId]);

  // Fetch on mount and poll
  useEffect(() => {
    if (!activeDeviceId) return;

    // Initial fetch
    fetchFanData();
    fetchSystemInfo();

    // Poll fans every 2s, system info every 30s
    const fanInterval = setInterval(fetchFanData, 2000);
    const sysInterval = setInterval(fetchSystemInfo, 30000);

    return () => {
      clearInterval(fanInterval);
      clearInterval(sysInterval);
    };
  }, [activeDeviceId, fetchFanData, fetchSystemInfo]);

  // Format uptime
  function formatUptime(secs: number): string {
    const d = Math.floor(secs / 86400);
    const h = Math.floor((secs % 86400) / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  // Determine system status
  const sysStatus: "healthy" | "warning" | "error" = systemInfo
    ? systemInfo.heap_free < 20000
      ? "warning"
      : "healthy"
    : "healthy";

  const fanNames = fans.map((f) => f.name || `Fan ${f.slot}`);

  if (!activeDeviceId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-[#60646c]">No device connected</p>
          <p className="mt-1 text-xs text-[#999]">
            Go to Devices to connect to a device
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#171717]">Dashboard</h1>
        <p className="mt-1 text-sm text-[#60646c]">
          {activeDevice?.hostname || "Unknown"} &middot; {activeDevice?.ipAddress || ""}
        </p>
        {error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}
      </div>

      {/* Content grid: 2/3 chart, 1/3 sidebar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Chart — spans 2 columns */}
        <div className="lg:col-span-2">
          {fanNames.length > 0 ? (
            <FanTempChart
              data={chartData}
              fanNames={fanNames}
              showTemp={false}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          ) : (
            <div className="flex h-[324px] items-center justify-center rounded-lg border border-[#dcdee0] bg-white">
              <p className="text-sm text-[#999]">No fans configured — create a fan to see data</p>
            </div>
          )}
        </div>

        {/* Right column: system info + activity */}
        <div className="flex flex-col gap-4">
          <SystemInfoCard
            uptime={systemInfo ? formatUptime(systemInfo.uptime_secs) : "—"}
            heapFree={systemInfo ? `${(systemInfo.heap_free / 1024).toFixed(0)} KB` : "—"}
            version={systemInfo?.version || "—"}
            status={sysStatus}
          />
          <ActivityLog entries={activity} />
        </div>
      </div>
    </div>
  );
}
