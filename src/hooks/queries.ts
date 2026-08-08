import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export const queryKeys = {
  fans: (deviceId: number) => ["fans", deviceId] as const,
  sources: (deviceId: number) => ["sources", deviceId] as const,
  curves: (deviceId: number) => ["curves", deviceId] as const,
  schedules: (deviceId: number) => ["schedules", deviceId] as const,
  systemInfo: (deviceId: number) => ["system", deviceId] as const,
  wifiStatus: (deviceId: number) => ["wifi", deviceId] as const,
  wifiScan: (deviceId: number) => ["wifi-scan", deviceId] as const,
  ds18b20: (deviceId: number) => ["ds18b20", deviceId] as const,
};

// ── Realtime entity queries (refetchInterval) ──────────────────

export function useFans(deviceId: number | null) {
  return useQuery({
    queryKey: queryKeys.fans(deviceId ?? -1),
    queryFn: () => api.getFans(deviceId as number),
    enabled: deviceId != null,
    refetchInterval: 2000,
  });
}

export function useSources(deviceId: number | null) {
  return useQuery({
    queryKey: queryKeys.sources(deviceId ?? -1),
    queryFn: () => api.getSources(deviceId as number),
    enabled: deviceId != null,
    refetchInterval: 10000,
  });
}

export function useSystemInfo(deviceId: number | null) {
  return useQuery({
    queryKey: queryKeys.systemInfo(deviceId ?? -1),
    queryFn: () => api.getSystemInfo(deviceId as number),
    enabled: deviceId != null,
    refetchInterval: 30000,
  });
}

// ── Non-realtime entity queries ────────────────────────────────

export function useCurves(deviceId: number | null) {
  return useQuery({
    queryKey: queryKeys.curves(deviceId ?? -1),
    queryFn: () => api.getCurves(deviceId as number),
    enabled: deviceId != null,
  });
}

export function useSchedules(deviceId: number | null) {
  return useQuery({
    queryKey: queryKeys.schedules(deviceId ?? -1),
    queryFn: () => api.getSchedules(deviceId as number),
    enabled: deviceId != null,
  });
}

export function useWifiStatus(deviceId: number | null) {
  return useQuery({
    queryKey: queryKeys.wifiStatus(deviceId ?? -1),
    queryFn: () => api.wifiStatus(deviceId as number),
    enabled: deviceId != null,
  });
}

export function useDs18b20Scan(deviceId: number | null, enabled = false) {
  return useQuery({
    queryKey: queryKeys.ds18b20(deviceId ?? -1),
    queryFn: () => api.scanDs18b20(deviceId as number),
    enabled: deviceId != null && enabled,
  });
}

// ── Mutations ──────────────────────────────────────────────────

function useInvalidate(keys: (deviceId: number) => readonly unknown[]) {
  const qc = useQueryClient();
  return (deviceId: number) => qc.invalidateQueries({ queryKey: keys(deviceId) });
}

export function useCreateFan(deviceId: number) {
  const invalidate = useInvalidate(queryKeys.fans);
  return useMutation({
    mutationFn: (req: { name: string; pwm_gpio: number; tach_gpio: number }) => api.createFan(deviceId, req),
    onSuccess: () => invalidate(deviceId),
  });
}

export function useUpdateFan(deviceId: number) {
  const invalidate = useInvalidate(queryKeys.fans);
  return useMutation({
    mutationFn: (args: { slot: number; req: Parameters<typeof api.updateFan>[2] }) => api.updateFan(deviceId, args.slot, args.req),
    onSuccess: () => invalidate(deviceId),
  });
}

export function useDeleteFan(deviceId: number) {
  const invalidate = useInvalidate(queryKeys.fans);
  return useMutation({
    mutationFn: (slot: number) => api.deleteFan(deviceId, slot),
    onSuccess: () => invalidate(deviceId),
  });
}

export function useCreateSource(deviceId: number) {
  const invalidate = useInvalidate(queryKeys.sources);
  return useMutation({
    mutationFn: (req: { name: string; source_type: string; gpio?: number; rom_code?: string }) => api.createSource(deviceId, req),
    onSuccess: () => invalidate(deviceId),
  });
}

export function useUpdateSource(deviceId: number) {
  const invalidate = useInvalidate(queryKeys.sources);
  return useMutation({
    mutationFn: (args: { slot: number; name: string }) => api.updateSource(deviceId, args.slot, args.name),
    onSuccess: () => invalidate(deviceId),
  });
}

export function useDeleteSource(deviceId: number) {
  const invalidate = useInvalidate(queryKeys.sources);
  return useMutation({
    mutationFn: (slot: number) => api.deleteSource(deviceId, slot),
    onSuccess: () => invalidate(deviceId),
  });
}

export function useUpdateManualTemp(deviceId: number) {
  const invalidate = useInvalidate(queryKeys.sources);
  return useMutation({
    mutationFn: (args: { slot: number; tempC: number }) => api.updateManualTemp(deviceId, args.slot, args.tempC),
    onSuccess: () => invalidate(deviceId),
  });
}

export function useCreateCurve(deviceId: number) {
  const invalidate = useInvalidate(queryKeys.curves);
  return useMutation({
    mutationFn: (req: { name: string; points: { temp_c: number; duty: number }[] }) => api.createCurve(deviceId, req),
    onSuccess: () => invalidate(deviceId),
  });
}

export function useUpdateCurve(deviceId: number) {
  const invalidate = useInvalidate(queryKeys.curves);
  return useMutation({
    mutationFn: (args: { slot: number; req: { name: string; points: { temp_c: number; duty: number }[] } }) => api.updateCurve(deviceId, args.slot, args.req),
    onSuccess: () => invalidate(deviceId),
  });
}

export function useDeleteCurve(deviceId: number) {
  const invalidate = useInvalidate(queryKeys.curves);
  return useMutation({
    mutationFn: (slot: number) => api.deleteCurve(deviceId, slot),
    onSuccess: () => invalidate(deviceId),
  });
}

export function useCreateSchedule(deviceId: number) {
  const invalidate = useInvalidate(queryKeys.schedules);
  return useMutation({
    mutationFn: (req: { fan_id: number; duty: number; start_min: number; end_min: number; enabled: boolean }) => api.createSchedule(deviceId, req),
    onSuccess: () => invalidate(deviceId),
  });
}

export function useUpdateSchedule(deviceId: number) {
  const invalidate = useInvalidate(queryKeys.schedules);
  return useMutation({
    mutationFn: (args: { slot: number; req: Parameters<typeof api.updateSchedule>[2] }) => api.updateSchedule(deviceId, args.slot, args.req),
    onSuccess: () => invalidate(deviceId),
  });
}

export function useDeleteSchedule(deviceId: number) {
  const invalidate = useInvalidate(queryKeys.schedules);
  return useMutation({
    mutationFn: (slot: number) => api.deleteSchedule(deviceId, slot),
    onSuccess: () => invalidate(deviceId),
  });
}

export function useWifiScan(deviceId: number) {
  const invalidate = useInvalidate(queryKeys.wifiScan);
  return useMutation({
    mutationFn: () => api.wifiScan(deviceId),
    onSuccess: () => invalidate(deviceId),
  });
}
// Usage: `const results = await scan.mutateAsync()` returns the WifiAp[] scan
// results directly (TanStack Query mutations resolve to the mutationFn's value),
// so the page can `setScanResults(results)` without a separate query.

export function useWifiConnect(deviceId: number) {
  const invalidate = useInvalidate(queryKeys.wifiStatus);
  return useMutation({
    mutationFn: (args: { ssid: string; password: string }) => api.wifiConnect(deviceId, args.ssid, args.password),
    onSuccess: () => invalidate(deviceId),
  });
}

export function useDs18b20Config(deviceId: number) {
  const invalidate = useInvalidate(queryKeys.ds18b20);
  return useMutation({
    mutationFn: (gpio: number) => api.configDs18b20(deviceId, gpio),
    onSuccess: () => invalidate(deviceId),
  });
}

export function useSetHostname(deviceId: number) {
  const invalidate = useInvalidate(queryKeys.systemInfo);
  return useMutation({
    mutationFn: (hostname: string) => api.setHostname(deviceId, hostname),
    onSuccess: () => invalidate(deviceId),
  });
}

export function useReboot(deviceId: number) {
  const invalidate = useInvalidate(queryKeys.systemInfo);
  return useMutation({
    mutationFn: () => api.rebootDevice(deviceId),
    onSuccess: () => invalidate(deviceId),
  });
}
