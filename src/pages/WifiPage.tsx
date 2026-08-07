import { useState, useEffect, useCallback } from "react";
import { Wifi, WifiOff, RefreshCw, Loader2 } from "lucide-react";
import { api, type WifiAp, type WifiStatus } from "../lib/api";
import { logUserAction } from "../lib/logUserAction";
import { useDeviceStore } from "../stores/deviceStore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
          <p className="mt-1 text-xs text-muted-foreground">Manage wireless network connection</p>
        </div>
        <Button variant="outline" onClick={handleScan} disabled={scanning || activeDeviceId == null}>
          {scanning ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          {scanning ? "Scanning..." : "Scan"}
        </Button>
      </div>

      <div className="grid shrink-0 grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Current WiFi Status */}
        <Card className="gap-2 py-0">
          <CardHeader className="px-4 pt-4 pb-0">
            <CardTitle className="text-sm">Connection Status</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {wifiStatus ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {wifiStatus.connected ? <Wifi size={18} className="text-success" /> : <WifiOff size={18} className="text-muted-foreground" />}
                  <span className="text-sm font-medium text-foreground">{wifiStatus.connected ? "Connected" : "Disconnected"}</span>
                </div>
                {wifiStatus.connected && (
                  <div className="space-y-1.5 pl-6">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">IP Address</span>
                      <span className="font-mono text-sm text-foreground">{wifiStatus.ip || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Gateway IP</span>
                      <span className="font-mono text-sm text-foreground">{wifiStatus.ap_ip || "—"}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{activeDeviceId == null ? "No device selected" : "Loading status..."}</p>
            )}
          </CardContent>
        </Card>

        {/* Connect Form */}
        <Card className="gap-2 py-0">
          <CardHeader className="px-4 pt-4 pb-0">
            <CardTitle className="text-sm">Connect to Network</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="wifi-ssid">SSID</Label>
                <Input id="wifi-ssid" type="text" value={ssid} onChange={(e) => setSsid(e.target.value)} placeholder="Network name" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="wifi-password">Password</Label>
                <Input id="wifi-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Network password" className="mt-1" />
              </div>
              <Button onClick={handleConnect} disabled={!ssid.trim() || connecting || activeDeviceId == null} className="w-full">
                {connecting ? "Connecting..." : "Connect"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scan Results */}
      <div className="mt-6 flex min-h-0 flex-1 flex-col">
        <h2 className="mb-3 shrink-0 text-sm font-semibold text-foreground">
          Available Networks
          {scanResults.length > 0 && <span className="ml-2 text-xs font-normal text-muted-foreground">({scanResults.length} found)</span>}
        </h2>
        {scanning ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 py-12">
              <Loader2 size={18} className="animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Scanning for networks...</span>
            </CardContent>
          </Card>
        ) : scanResults.length > 0 ? (
          <Card className="min-h-0 flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SSID</TableHead>
                  <TableHead>Signal</TableHead>
                  <TableHead>RSSI</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Auth</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {scanResults.map((ap) => (
                  <TableRow key={ap.ssid}>
                    <TableCell className="font-medium">{ap.ssid || "(hidden)"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-end gap-0.5">
                          {[1, 2, 3, 4].map((bar) => (
                            <div key={bar} className={`w-1 rounded-sm ${bar <= signalBars(ap.rssi) ? "bg-primary" : "bg-border"}`} style={{ height: `${bar * 4}px` }} />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">{signalLabel(ap.rssi)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{ap.rssi} dBm</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{ap.channel}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{ap.authmode}</TableCell>
                    <TableCell>
                      <Button variant="link" size="sm" onClick={() => handleSelectAp(ap)}>
                        Select
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <Card className="min-h-0 flex-1">
            <CardContent className="flex h-full flex-col items-center justify-center py-12">
              <Wifi size={24} className="mb-2 text-border" />
              <p className="text-sm text-muted-foreground">No scan results. Click Scan to discover networks.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

