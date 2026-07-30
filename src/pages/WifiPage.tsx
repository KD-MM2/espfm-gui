import { useState, useEffect, useCallback } from "react";
import { Wifi, WifiOff, RefreshCw, Loader2 } from "lucide-react";
import { api, type WifiAp, type WifiStatus } from "../lib/api";
import { logUserAction } from "../lib/logUserAction";
import { useDeviceStore } from "../stores/deviceStore";
import { useToast } from "@/hooks/use-toast";

export function WifiPage() {
  const activeDeviceId = useDeviceStore((s) => s.activeDeviceId);
  const { showToast } = useToast();
  const [scanResults, setScanResults] = useState<WifiAp[]>([]);
  const [wifiStatus, setWifiStatus] = useState<WifiStatus | null>(null);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");

  const fetchStatus = useCallback(async () => {
    if (activeDeviceId == null) return;
    try {
      const status = await api.wifiStatus(activeDeviceId);
      setWifiStatus(status);
    } catch (e) {
      showToast(`Failed to get WiFi status: ${String(e)}`, "error");
    }
  }, [activeDeviceId, showToast]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  async function handleScan() {
    if (activeDeviceId == null) return;
    setScanning(true);
    try {
      const results = await api.wifiScan(activeDeviceId);
      setScanResults(results);
    } catch (e) {
      showToast(`WiFi scan failed: ${String(e)}`, "error");
    } finally {
      setScanning(false);
    }
  }

  async function handleConnect() {
    if (activeDeviceId == null || !ssid.trim()) return;
    setConnecting(true);
    try {
      await api.wifiConnect(activeDeviceId, ssid.trim(), password);
      logUserAction(activeDeviceId, "system", `WiFi connect to "${ssid.trim()}"`, "");
      // Refresh status after connect attempt
      await fetchStatus();
      setSsid("");
      setPassword("");
    } catch (e) {
      showToast(`WiFi connect failed: ${String(e)}`, "error");
    } finally {
      setConnecting(false);
    }
  }

  function handleSelectAp(ap: WifiAp) {
    setSsid(ap.ssid);
  }

  function signalLabel(rssi: number): string {
    if (rssi >= -50) return "Excellent";
    if (rssi >= -60) return "Good";
    if (rssi >= -70) return "Fair";
    return "Weak";
  }

  function signalBars(rssi: number): number {
    if (rssi >= -50) return 4;
    if (rssi >= -60) return 3;
    if (rssi >= -70) return 2;
    return 1;
  }

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">WiFi</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage wireless network connection
          </p>
        </div>
        <button
          type="button"
          onClick={handleScan}
          disabled={scanning || activeDeviceId == null}
          className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          {scanning ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          {scanning ? "Scanning..." : "Scan"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Current WiFi Status */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Connection Status
          </h2>
          {wifiStatus ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {wifiStatus.connected ? (
                  <Wifi size={18} className="text-green-600" />
                ) : (
                  <WifiOff size={18} className="text-muted-foreground" />
                )}
                <span className="text-sm font-medium text-foreground">
                  {wifiStatus.connected ? "Connected" : "Disconnected"}
                </span>
              </div>
              {wifiStatus.connected && (
                <div className="space-y-1.5 pl-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">IP Address</span>
                    <span className="text-sm font-mono text-foreground">
                      {wifiStatus.ip || "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Gateway IP</span>
                    <span className="text-sm font-mono text-foreground">
                      {wifiStatus.ap_ip || "—"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {activeDeviceId == null
                ? "No device selected"
                : "Loading status..."}
            </p>
          )}
        </div>

        {/* Connect Form */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Connect to Network
          </h2>
          <div className="space-y-3">
            <div>
              <label
                htmlFor="wifi-ssid"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                SSID
              </label>
              <input
                id="wifi-ssid"
                type="text"
                value={ssid}
                onChange={(e) => setSsid(e.target.value)}
                placeholder="Network name"
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-foreground"
              />
            </div>
            <div>
              <label
                htmlFor="wifi-password"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                Password
              </label>
              <input
                id="wifi-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Network password"
                className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-foreground"
              />
            </div>
            <button
              type="button"
              onClick={handleConnect}
              disabled={
                !ssid.trim() || connecting || activeDeviceId == null
              }
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {connecting ? "Connecting..." : "Connect"}
            </button>
          </div>
        </div>
      </div>

      {/* Scan Results */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Available Networks
          {scanResults.length > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({scanResults.length} found)
            </span>
          )}
        </h2>
        {scanning ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card py-12">
            <Loader2 size={18} className="animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Scanning for networks...
            </span>
          </div>
        ) : scanResults.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    SSID
                  </th>
                  <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Signal
                  </th>
                  <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    RSSI
                  </th>
                  <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Channel
                  </th>
                  <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Auth
                  </th>
                  <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground"></th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {scanResults.map((ap) => (
                  <tr
                    key={ap.ssid}
                    className="border-b border-border last:border-b-0 hover:bg-muted"
                  >
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {ap.ssid || "(hidden)"}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-end gap-0.5">
                          {[1, 2, 3, 4].map((bar) => (
                            <div
                              key={bar}
                              className={`w-1 rounded-sm ${
                                bar <= signalBars(ap.rssi)
                                  ? "bg-primary"
                                  : "bg-border"
                              }`}
                              style={{ height: `${bar * 4}px` }}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {signalLabel(ap.rssi)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {ap.rssi} dBm
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {ap.channel}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {ap.authmode}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => handleSelectAp(ap)}
                        className="text-xs font-medium text-foreground underline decoration-border underline-offset-2 transition-colors hover:decoration-foreground"
                      >
                        Select
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-12">
            <Wifi size={24} className="mb-2 text-border" />
            <p className="text-sm text-muted-foreground">
              No scan results. Click Scan to discover networks.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
