import { useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FanTempChart } from "../components/dashboard/FanTempChart";
import { SystemInfoCard } from "../components/dashboard/SystemInfoCard";
import { ActivityLog } from "../components/dashboard/ActivityLog";
import { useDeviceStore } from "../stores/deviceStore";
import { useChartStore } from "../stores/chartStore";
import { useActivityStore } from "../stores/activityStore";
import { startMonitoringSession, changeTimeRange } from "../lib/monitoringSession";
import { RANGE_MINUTES, type TimeRange } from "../lib/timeSeriesBuffer";
import { useSystemInfo, useSources, useCurves, useSchedules, useWifiStatus } from "../hooks/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function DashboardPage() {
  const navigate = useNavigate();
  const activeDeviceId = useDeviceStore((s) => s.activeDeviceId);
  const devices = useDeviceStore((s) => s.devices);
  const activeDevice = devices.find((d) => d.id === activeDeviceId);

  const chartData = useChartStore((s) => s.chartData);
  const fanNames = useChartStore((s) => s.fanNames);
  const tempNames = useChartStore((s) => s.tempNames);
  const timeRange = useChartStore((s) => s.timeRange);
  const bucketSize = useChartStore((s) => s.bucketSize);
  const setBucketSize = useChartStore((s) => s.setBucketSize);

  const activityEntries = useActivityStore((s) => s.entries);

  const filteredEntries = useMemo(() => {
    const cutoff = Date.now() - RANGE_MINUTES[timeRange] * 60 * 1000;
    return activityEntries.filter((e) => new Date(e.ts).getTime() >= cutoff);
  }, [activityEntries, timeRange]);

  const { data: systemInfo } = useSystemInfo(activeDeviceId);
  const { data: sources = [] } = useSources(activeDeviceId);
  const { data: curves = [] } = useCurves(activeDeviceId);
  const { data: schedules = [] } = useSchedules(activeDeviceId);
  const { data: wifiStatus } = useWifiStatus(activeDeviceId);

  // Start/restore monitoring session (session-scoped, survives navigation)
  useEffect(() => {
    if (!activeDeviceId) return;
    void startMonitoringSession(activeDeviceId, RANGE_MINUTES[timeRange]);
    // No cleanup — session persists across page navigation
  }, [activeDeviceId]);

  // Handle time range change
  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    void changeTimeRange(range);
  }, []);

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
  const sysStatus: "healthy" | "warning" | "error" = systemInfo ? (systemInfo.heap_free < 20000 ? "warning" : "healthy") : "healthy";

  if (!activeDeviceId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">No device connected</p>
          <p className="mt-1 text-xs text-muted-foreground">Go to Devices to connect to a device</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-4 shrink-0">
        <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {activeDevice?.hostname || "Unknown"} &middot; {activeDevice?.ipAddress || ""}
        </p>
      </div>

      {/* Top section: chart + right column */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2.5fr)_minmax(280px,1fr)]">
        {/* Chart — left column */}
        <div className="flex min-h-0 flex-col rounded-lg border border-border bg-card p-4">
          {fanNames.length > 0 ? (
            <FanTempChart data={chartData} fanNames={fanNames} tempNames={tempNames} timeRange={timeRange} bucketSize={bucketSize} onTimeRangeChange={handleTimeRangeChange} onBucketSizeChange={setBucketSize} />
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-muted-foreground">No fans configured — create a fan to see data</p>
            </div>
          )}
        </div>

        {/* Right column: system info + activity log */}
        <div className="flex min-h-0 flex-col gap-4">
          <SystemInfoCard uptime={systemInfo ? formatUptime(systemInfo.uptime_secs) : "—"} heapFree={systemInfo ? `${(systemInfo.heap_free / 1024).toFixed(0)} KB` : "—"} version={systemInfo?.version || "—"} status={sysStatus} />
          <div className="flex min-h-0 flex-1 flex-col">
            <ActivityLog
              entries={filteredEntries}
              maxItems={999}
              onShowAll={() => navigate("/logs")}
              totalCount={activityEntries.length}
            />
          </div>
        </div>
      </div>

      {/* Bottom row: sources, curves, schedules, WiFi */}
      <div className="mt-4 shrink-0 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Sources */}
        <Card className="gap-2 py-0">
          <CardHeader className="px-4 pt-4 pb-0">
            <CardTitle className="text-sm">
              Sources
              {sources.length > 0 && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({sources.length})</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {sources.length > 0 ? (
              <div className="space-y-2">
                {sources.map((s) => (
                  <div key={s.slot} className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-foreground">{s.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {s.source_type} &middot; {s.status}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-foreground">{s.temp_c.toFixed(1)} °C</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No sources</p>
            )}
          </CardContent>
        </Card>

        {/* Curves */}
        <Card className="gap-2 py-0">
          <CardHeader className="px-4 pt-4 pb-0">
            <CardTitle className="text-sm">
              Curves
              {curves.length > 0 && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({curves.length})</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {curves.length > 0 ? (
              <div className="space-y-2">
                {curves.map((c) => (
                  <div key={c.slot} className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-foreground">{c.name}</div>
                    </div>
                    <Badge className="bg-purple-50 text-[10px] text-purple-700 dark:bg-purple-800 dark:text-purple-200">{c.points.length} pts</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No curves</p>
            )}
          </CardContent>
        </Card>

        {/* Schedules */}
        <Card className="gap-2 py-0">
          <CardHeader className="px-4 pt-4 pb-0">
            <CardTitle className="text-sm">
              Schedules
              {schedules.length > 0 && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({schedules.length})</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {schedules.length > 0 ? (
              <div className="space-y-2">
                {schedules.map((sch) => (
                  <div key={sch.slot} className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-foreground">
                        Fan {sch.fan_id} &middot; {sch.duty}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {Math.floor(sch.start_min / 60)}:{String(sch.start_min % 60).padStart(2, "0")} – {Math.floor(sch.end_min / 60)}:{String(sch.end_min % 60).padStart(2, "0")}
                      </div>
                    </div>
                    <Badge className={`text-[10px] ${sch.enabled ? "bg-green-50 text-green-700 dark:bg-green-800 dark:text-green-200" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}>{sch.enabled ? "on" : "off"}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No schedules</p>
            )}
          </CardContent>
        </Card>

        {/* WiFi Status */}
        <Card className="gap-2 py-0">
          <CardHeader className="px-4 pt-4 pb-0">
            <CardTitle className="text-sm">WiFi</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {wifiStatus ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Status</span>
                  <Badge className={`text-[10px] ${wifiStatus.connected ? "bg-green-50 text-green-700 dark:bg-green-800 dark:text-green-200" : "bg-red-50 text-red-700 dark:bg-red-800 dark:text-red-200"}`}>
                    {wifiStatus.connected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
                {wifiStatus.connected && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">IP</span>
                    <span className="font-mono text-xs font-medium text-foreground">{wifiStatus.ip}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Loading...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
