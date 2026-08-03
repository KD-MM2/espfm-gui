import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, RotateCcw, Download, Upload, Server } from "lucide-react";
import { api, type SystemInfo } from "../lib/api";
import { logUserAction } from "../lib/logUserAction";
import { useDeviceStore } from "../stores/deviceStore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

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
      logUserAction(activeDeviceId, "system", `Hostname set to "${hostname.trim()}"`, "");
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
      logUserAction(activeDeviceId, "system", "Device reboot initiated", "");
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
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">System</h1>
          <p className="mt-1 text-xs text-muted-foreground">Device information and configuration</p>
        </div>
        <Button variant="outline" onClick={fetchInfo} disabled={loading || activeDeviceId == null}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
          Refresh
        </Button>
      </div>

      {activeDeviceId == null ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Server size={24} className="mb-2 text-border" />
            <p className="text-sm text-muted-foreground">No device selected. Connect to a device first.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* System Info */}
          <Card className="gap-2 py-0">
            <CardHeader className="px-4 pt-4 pb-0">
              <CardTitle className="text-sm">System Info</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {info ? (
                <div className="space-y-2.5">
                  <InfoRow label="Hostname" value={info.hostname} />
                  <InfoRow label="Version" value={info.version} />
                  <InfoRow label="Uptime" value={formatUptime(info.uptime_secs)} />
                  <InfoRow label="Heap Free" value={formatBytes(info.heap_free)} />
                  <Separator className="my-2" />
                  <InfoRow label="Fans" value={String(info.fan_count)} />
                  <InfoRow label="Sources" value={String(info.source_count)} />
                  <InfoRow label="Curves" value={String(info.curve_count)} />
                  <InfoRow label="Schedules" value={String(info.schedule_count)} />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{loading ? "Loading..." : "No data available"}</p>
              )}
            </CardContent>
          </Card>

          {/* Hostname Form */}
          <Card className="gap-2 py-0">
            <CardHeader className="px-4 pt-4 pb-0">
              <CardTitle className="text-sm">Set Hostname</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-3">
                <div>
                  <Label htmlFor="hostname">Hostname</Label>
                  <Input id="hostname" type="text" value={hostname} onChange={(e) => setHostname(e.target.value)} placeholder="esp-fan-01" className="mt-1" />
                </div>
                <Button onClick={handleSetHostname} disabled={!hostname.trim() || settingHostname || activeDeviceId == null} className="w-full">
                  {settingHostname ? "Setting..." : "Set Hostname"}
                </Button>
              </div>

              {/* Reboot */}
              <Separator className="my-4" />
              <div>
                <h2 className="mb-3 text-sm font-semibold text-foreground">Reboot Device</h2>
                <p className="mb-3 text-xs text-muted-foreground">Restart the device. Connection will be temporarily lost.</p>
                <Button variant="outline" onClick={() => setShowRebootDialog(true)} disabled={activeDeviceId == null} className="w-full border-destructive text-destructive hover:bg-destructive/10">
                  Reboot
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Export Config */}
          <Card className="gap-2 py-0">
            <CardHeader className="px-4 pt-4 pb-0">
              <CardTitle className="text-sm">Export Config</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="mb-3 text-xs text-muted-foreground">Export the device configuration as JSON.</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExport} disabled={exporting || activeDeviceId == null}>
                  {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  {exporting ? "Exporting..." : "Export"}
                </Button>
                {exportedConfig && (
                  <Button onClick={handleDownloadConfig}>
                    <Download size={16} />
                    Download .json
                  </Button>
                )}
              </div>
              {exportedConfig && <Textarea readOnly value={exportedConfig} className="mt-3 h-40 font-mono text-xs" />}
            </CardContent>
          </Card>

          {/* Import Config */}
          <Card className="gap-2 py-0">
            <CardHeader className="px-4 pt-4 pb-0">
              <CardTitle className="text-sm">Import Config</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="mb-3 text-xs text-muted-foreground">Import a configuration JSON file to apply to this device.</p>
              <div className="space-y-3">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground file:transition-colors hover:file:bg-muted"
                />
                <Button onClick={handleImport} disabled={!importFile || importing || activeDeviceId == null} className="w-full">
                  {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {importing ? "Importing..." : "Import"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reboot Confirmation Dialog */}
      <Dialog open={showRebootDialog} onOpenChange={setShowRebootDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Reboot</DialogTitle>
            <DialogDescription>Are you sure you want to reboot this device? The connection will be temporarily lost while the device restarts.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRebootDialog(false)} disabled={rebooting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReboot} disabled={rebooting}>
              {rebooting ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
              {rebooting ? "Rebooting..." : "Reboot"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

