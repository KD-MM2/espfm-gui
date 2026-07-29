import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FanTempChart } from "../components/dashboard/FanTempChart";
import { SystemInfoCard } from "../components/dashboard/SystemInfoCard";
import { ActivityLog, type ActivityEntry } from "../components/dashboard/ActivityLog";
import {
  api,
  type SystemInfo,
  type SourceState,
  type CurveState,
  type ScheduleState,
  type WifiStatus,
} from "../lib/api";
import { useDeviceStore } from "../stores/deviceStore";
import {
  useChartStore,
  startChartStore,
  stopChartStore,
  clearChartBuffer,
} from "../stores/chartStore";
import { Collector, loadHistory } from "../lib/collectors";
import {
  startSqliteWriter,
  stopSqliteWriter,
  setWriterDevice,
} from "../lib/sqliteWriter";
import {
  startActivityDetector,
  stopActivityDetector,
  setDetectorDevice,
  setActivityCallback,
} from "../lib/activityDetector";
import type { TimeRange } from "../lib/timeSeriesBuffer";

export function DashboardPage() {
  const navigate = useNavigate();
  const activeDeviceId = useDeviceStore((s) => s.activeDeviceId);
  const devices = useDeviceStore((s) => s.devices);
  const activeDevice = devices.find((d) => d.id === activeDeviceId);

  const chartData = useChartStore((s) => s.chartData);
  const fanNames = useChartStore((s) => s.fanNames);
  const tempNames = useChartStore((s) => s.tempNames);
  const timeRange = useChartStore((s) => s.timeRange);
  const setTimeRange = useChartStore((s) => s.setTimeRange);
  const bucketSize = useChartStore((s) => s.bucketSize);
  const setBucketSize = useChartStore((s) => s.setBucketSize);

  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [sources, setSources] = useState<SourceState[]>([]);
  const [curves, setCurves] = useState<CurveState[]>([]);
  const [schedules, setSchedules] = useState<ScheduleState[]>([]);
  const [wifiStatus, setWifiStatus] = useState<WifiStatus | null>(null);
  const activityIdRef = useRef(0);
  const collectorRef = useRef<Collector | null>(null);

  const RANGE_MINUTES: Record<TimeRange, number> = {
    "30m": 30,
    "1h": 60,
    "6h": 360,
    "24h": 1440,
  };

  // Start event-driven pipeline on mount
  useEffect(() => {
    if (!activeDeviceId) return;

    // Configure writer and detector
    setWriterDevice(activeDeviceId);
    setDetectorDevice(activeDeviceId);

    // Set up activity detector callback
    setActivityCallback((message: string, _details: string) => {
      activityIdRef.current += 1;
      setActivity((a) => [
        {
          id: String(activityIdRef.current),
          type: "fan",
          message,
          time: "just now",
        },
        ...a.slice(0, 49),
      ]);
    });

    // Start subscribers
    startChartStore();
    startSqliteWriter();
    startActivityDetector();

    // Load history then start collector
    const deviceId = activeDeviceId;
    void loadHistory(deviceId, RANGE_MINUTES[timeRange]).then(() => {
      const collector = new Collector(deviceId);
      collectorRef.current = collector;
      return collector.start();
    });

    return () => {
      // Stop all subscribers
      stopChartStore();
      stopSqliteWriter();
      stopActivityDetector();
      setWriterDevice(null);
      setDetectorDevice(null);
      setActivityCallback(null);

      // Stop collector
      if (collectorRef.current) {
        collectorRef.current.stop();
        collectorRef.current = null;
      }
    };
  }, [activeDeviceId]);

  // Handle time range change
  const handleTimeRangeChange = useCallback(
    (range: TimeRange) => {
      setTimeRange(range);
      clearChartBuffer();
      if (activeDeviceId) {
        void loadHistory(activeDeviceId, RANGE_MINUTES[range]);
      }
    },
    [activeDeviceId, setTimeRange]
  );

  // System info polling
  const fetchSystemInfo = useCallback(async () => {
    if (!activeDeviceId) return;
    try {
      const info = await api.getSystemInfo(activeDeviceId);
      setSystemInfo(info);
    } catch (e) {
      console.warn("System info fetch failed:", e);
    }
  }, [activeDeviceId]);

  // Additional data polling (sources, curves, schedules, wifi)
  const fetchAdditionalData = useCallback(async () => {
    if (!activeDeviceId) return;
    try {
      const [src, crv, sch, wifi] = await Promise.all([
        api.getSources(activeDeviceId),
        api.getCurves(activeDeviceId),
        api.getSchedules(activeDeviceId),
        api.wifiStatus(activeDeviceId),
      ]);
      setSources(src);
      setCurves(crv);
      setSchedules(sch);
      setWifiStatus(wifi);
    } catch (e) {
      console.warn("Dashboard additional data fetch failed:", e);
    }
  }, [activeDeviceId]);

  // Poll system info and additional data
  useEffect(() => {
    if (!activeDeviceId) return;

    fetchSystemInfo();
    fetchAdditionalData();

    const sysInterval = setInterval(fetchSystemInfo, 30000);
    const extraInterval = setInterval(fetchAdditionalData, 10000);

    return () => {
      clearInterval(sysInterval);
      clearInterval(extraInterval);
    };
  }, [activeDeviceId, fetchSystemInfo, fetchAdditionalData]);

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

  if (!activeDeviceId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">No device connected</p>
          <p className="mt-1 text-xs text-muted-foreground">
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
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeDevice?.hostname || "Unknown"} &middot;{" "}
          {activeDevice?.ipAddress || ""}
        </p>
      </div>

      {/* Content grid: 2/3 chart, 1/3 sidebar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Chart — spans 2 columns */}
        <div className="lg:col-span-2">
          {fanNames.length > 0 ? (
            <FanTempChart
              data={chartData}
              fanNames={fanNames}
              tempNames={tempNames}
              timeRange={timeRange}
              bucketSize={bucketSize}
              onTimeRangeChange={handleTimeRangeChange}
              onBucketSizeChange={setBucketSize}
            />
          ) : (
            <div className="flex h-[324px] items-center justify-center rounded-lg border border-border bg-card">
              <p className="text-sm text-muted-foreground">
                No fans configured — create a fan to see data
              </p>
            </div>
          )}
        </div>

        {/* Right column: system info + activity */}
        <div className="flex flex-col gap-4">
          <SystemInfoCard
            uptime={
              systemInfo ? formatUptime(systemInfo.uptime_secs) : "—"
            }
            heapFree={
              systemInfo
                ? `${(systemInfo.heap_free / 1024).toFixed(0)} KB`
                : "—"
            }
            version={systemInfo?.version || "—"}
            status={sysStatus}
          />
          <ActivityLog
            entries={activity}
            maxItems={7}
            onShowAll={() => navigate("/logs")}
            totalCount={activity.length}
          />
        </div>
      </div>

      {/* Bottom row: sources, curves, schedules, WiFi */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Sources */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Sources
            {sources.length > 0 && (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                ({sources.length})
              </span>
            )}
          </h2>
          {sources.length > 0 ? (
            <div className="space-y-2">
              {sources.map((s) => (
                <div
                  key={s.slot}
                  className="flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-foreground">
                      {s.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {s.source_type} &middot; {s.status}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-foreground">
                    {s.temp_c.toFixed(1)} °C
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No sources</p>
          )}
        </div>

        {/* Curves */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Curves
            {curves.length > 0 && (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                ({curves.length})
              </span>
            )}
          </h2>
          {curves.length > 0 ? (
            <div className="space-y-2">
              {curves.map((c) => (
                <div
                  key={c.slot}
                  className="flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-foreground">
                      {c.name}
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {c.points.length} pts
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No curves</p>
          )}
        </div>

        {/* Schedules */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Schedules
            {schedules.length > 0 && (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                ({schedules.length})
              </span>
            )}
          </h2>
          {schedules.length > 0 ? (
            <div className="space-y-2">
              {schedules.map((sch) => (
                <div
                  key={sch.slot}
                  className="flex items-center justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-foreground">
                      Fan {sch.fan_id} &middot; {sch.duty}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {Math.floor(sch.start_min / 60)}:
                      {String(sch.start_min % 60).padStart(2, "0")} –{" "}
                      {Math.floor(sch.end_min / 60)}:
                      {String(sch.end_min % 60).padStart(2, "0")}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      sch.enabled
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {sch.enabled ? "on" : "off"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No schedules</p>
          )}
        </div>

        {/* WiFi Status */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">WiFi</h2>
          {wifiStatus ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Status</span>
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    wifiStatus.connected
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {wifiStatus.connected ? "Connected" : "Disconnected"}
                </span>
              </div>
              {wifiStatus.connected && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">IP</span>
                  <span className="font-mono text-xs font-medium text-foreground">
                    {wifiStatus.ip}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Loading...</p>
          )}
        </div>
      </div>
    </div>
  );
}
