import { useState, useEffect, useCallback, useRef } from "react";
import {
  Loader2,
  RotateCcw,
  Download,
  Upload,
  Server,
} from "lucide-react";
import { api, type SystemInfo } from "../lib/api";
import { useDeviceStore } from "../stores/deviceStore";
import { useToast } from "../stores/toastStore";

function formatUptime(secs: number): string {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}m`);
  return parts.join(" ");
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function SystemPage() {
  const activeDeviceId = useDeviceStore((s) => s.activeDeviceId);
  const { showToast } = useToast();
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(false);

  // Hostname form
  const [hostname, setHostname] = useState("");
  const [settingHostname, setSettingHostname] = useState(false);

  // Reboot
  const [showRebootDialog, setShowRebootDialog] = useState(false);
  const [rebooting, setRebooting] = useState(false);

  // Export / Import
  const [exportedConfig, setExportedConfig] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchInfo = useCallback(async () => {
    if (activeDeviceId == null) return;
    setLoading(true);
    try {
      const data = await api.getSystemInfo(activeDeviceId);
      setInfo(data);
      setHostname(data.hostname);
    } catch (e) {
      showToast(`Failed to get system info: ${String(e)}`, "error");
    } finally {
      setLoading(false);
    }
  }, [activeDeviceId, showToast]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  async function handleSetHostname() {
    if (activeDeviceId == null || !hostname.trim()) return;
    setSettingHostname(true);
    try {
      await api.setHostname(activeDeviceId, hostname.trim());
      showToast("Hostname set", "success");
      await fetchInfo();
    } catch (e) {
      showToast(`Failed to set hostname: ${String(e)}`, "error");
    } finally {
      setSettingHostname(false);
    }
  }

  async function handleReboot() {
    if (activeDeviceId == null) return;
    setRebooting(true);
    try {
      await api.rebootDevice(activeDeviceId);
      showToast("Device rebooting...", "success");
      setShowRebootDialog(false);
    } catch (e) {
      showToast(`Failed to reboot device: ${String(e)}`, "error");
    } finally {
      setRebooting(false);
    }
  }

  async function handleExport() {
    if (activeDeviceId == null) return;
    setExporting(true);
    try {
      const config = await api.exportConfig(activeDeviceId);
      setExportedConfig(config);
      showToast("Config exported", "success");
    } catch (e) {
      showToast(`Failed to export config: ${String(e)}`, "error");
    } finally {
      setExporting(false);
    }
  }

  function handleDownloadConfig() {
    if (!exportedConfig) return;
    const blob = new Blob([exportedConfig], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `espfm-config-${info?.hostname ?? "device"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImportFile(file);
  }

  async function handleImport() {
    if (activeDeviceId == null || !importFile) return;
    setImporting(true);
    try {
      const text = await importFile.text();
      await api.importConfig(activeDeviceId, text);
      showToast("Config imported", "success");
      await fetchInfo();
      setImportFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (e) {
      showToast(`Failed to import config: ${String(e)}`, "error");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">System</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Device information and configuration
          </p>
        </div>
        <button
          type="button"
          onClick={fetchInfo}
          disabled={loading || activeDeviceId == null}
          className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RotateCcw size={16} />
          )}
          Refresh
        </button>
      </div>

      {activeDeviceId == null ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-12">
          <Server size={24} className="mb-2 text-border" />
          <p className="text-sm text-muted-foreground">
            No device selected. Connect to a device first.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* System Info */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              System Info
            </h2>
            {info ? (
              <div className="space-y-2.5">
                <InfoRow label="Hostname" value={info.hostname} />
                <InfoRow label="Version" value={info.version} />
                <InfoRow label="Uptime" value={formatUptime(info.uptime_secs)} />
                <InfoRow label="Heap Free" value={formatBytes(info.heap_free)} />
                <div className="my-2 border-t border-border" />
                <InfoRow label="Fans" value={String(info.fan_count)} />
                <InfoRow label="Sources" value={String(info.source_count)} />
                <InfoRow label="Curves" value={String(info.curve_count)} />
                <InfoRow label="Schedules" value={String(info.schedule_count)} />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {loading ? "Loading..." : "No data available"}
              </p>
            )}
          </div>

          {/* Hostname Form */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              Set Hostname
            </h2>
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="hostname"
                  className="mb-1 block text-xs font-medium text-muted-foreground"
                >
                  Hostname
                </label>
                <input
                  id="hostname"
                  type="text"
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                  placeholder="esp-fan-01"
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-foreground"
                />
              </div>
              <button
                type="button"
                onClick={handleSetHostname}
                disabled={
                  !hostname.trim() || settingHostname || activeDeviceId == null
                }
                className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {settingHostname ? "Setting..." : "Set Hostname"}
              </button>
            </div>

            {/* Reboot */}
            <div className="mt-6 border-t border-border pt-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                Reboot Device
              </h2>
              <p className="mb-3 text-xs text-muted-foreground">
                Restart the device. Connection will be temporarily lost.
              </p>
              <button
                type="button"
                onClick={() => setShowRebootDialog(true)}
                disabled={activeDeviceId == null}
                className="w-full rounded-md border border-destructive bg-card px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reboot
              </button>
            </div>
          </div>

          {/* Export Config */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              Export Config
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Export the device configuration as JSON.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting || activeDeviceId == null}
                className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {exporting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                {exporting ? "Exporting..." : "Export"}
              </button>
              {exportedConfig && (
                <button
                  type="button"
                  onClick={handleDownloadConfig}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <Download size={16} />
                  Download .json
                </button>
              )}
            </div>
            {exportedConfig && (
              <textarea
                readOnly
                value={exportedConfig}
                className="mt-3 h-40 w-full resize-none rounded-md border border-border bg-muted p-3 font-mono text-xs text-foreground outline-none"
              />
            )}
          </div>

          {/* Import Config */}
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              Import Config
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Import a configuration JSON file to apply to this device.
            </p>
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground file:transition-colors hover:file:bg-muted"
              />
              <button
                type="button"
                onClick={handleImport}
                disabled={!importFile || importing || activeDeviceId == null}
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {importing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Upload size={16} />
                )}
                {importing ? "Importing..." : "Import"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reboot Confirmation Dialog */}
      {showRebootDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-lg border border-border bg-card p-6">
            <h3 className="text-base font-semibold text-foreground">
              Confirm Reboot
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Are you sure you want to reboot this device? The connection will be
              temporarily lost while the device restarts.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRebootDialog(false)}
                disabled={rebooting}
                className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReboot}
                disabled={rebooting}
                className="flex items-center gap-1.5 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {rebooting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <RotateCcw size={16} />
                )}
                {rebooting ? "Rebooting..." : "Reboot"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}
