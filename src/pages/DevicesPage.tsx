import { useState } from "react";
import { Monitor, Search, Loader2, Unplug, Plug, CheckCircle2, XCircle, Radio } from "lucide-react";
import { api } from "../lib/api";
import { useDeviceStore } from "../stores/deviceStore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DiscoveredDevice {
  hostname: string;
  ip: string;
  port: number;
}

export function DevicesPage() {
  const devices = useDeviceStore((s) => s.devices);
  const activeDeviceId = useDeviceStore((s) => s.activeDeviceId);
  const setActiveDevice = useDeviceStore((s) => s.setActiveDevice);
  const addDevice = useDeviceStore((s) => s.addDevice);
  const removeDevice = useDeviceStore((s) => s.removeDevice);
  const setConnectionStatus = useDeviceStore((s) => s.setConnectionStatus);
  const { showToast } = useToast();

  const [discovered, setDiscovered] = useState<DiscoveredDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [manualAddr, setManualAddr] = useState("");
  const [connecting, setConnecting] = useState(false);

  async function handleScan() {
    setScanning(true);
    try {
      const results = await api.discoverDevices();
      setDiscovered(results as DiscoveredDevice[]);
    } catch (e) {
      showToast(`Scan failed: ${e}`, "error");
    } finally {
      setScanning(false);
    }
  }

  async function handleConnect(addr: string) {
    setConnecting(true);
    try {
      const result = (await api.connectDevice(addr)) as {
        id: number;
        hostname: string;
        ip: string;
        port: number;
      };
      addDevice({
        id: result.id,
        hostname: result.hostname,
        ipAddress: `${result.ip}:${result.port}`,
        connected: true
      });
      setActiveDevice(result.id);
      setConnectionStatus("connected");
      showToast(`Connected to ${result.hostname}`, "success");
      setManualAddr("");
      await api.saveDeviceInfo(result.hostname, result.ip, result.port);
      await api.saveAppState(
        "last_active_device",
        JSON.stringify({
          hostname: result.hostname,
          ip: result.ip,
          port: result.port
        })
      );
    } catch (e) {
      showToast(`Connection failed: ${e}`, "error");
    } finally {
      setConnecting(false);
    }
  }

  async function handleConnectDiscovered(device: DiscoveredDevice) {
    const addr = `${device.ip}:${device.port}`;
    await handleConnect(addr);
  }

  async function handleDisconnect(id: number) {
    try {
      await api.disconnectDevice(id);
      removeDevice(id);
      if (id === activeDeviceId) {
        setConnectionStatus("disconnected");
        await api.deleteAppState("last_active_device");
      }
      showToast("Disconnected", "success");
    } catch (e) {
      showToast(`Disconnect failed: ${e}`, "error");
    }
  }

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Devices</h1>
          <p className="mt-1 text-xs text-muted-foreground">Manage connections to ESP Fan Manager devices</p>
        </div>
        <Button variant="outline" onClick={handleScan} disabled={scanning}>
          {scanning ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          {scanning ? "Scanning..." : "mDNS Scan"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Connected Devices */}
        <Card className="gap-2 py-0">
          <CardHeader className="px-4 pt-4 pb-0">
            <CardTitle className="text-sm">Connected Devices</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {devices.length > 0 ? (
              <div className="space-y-2">
                {devices.map((device) => (
                  <div key={device.id} className={`flex items-center justify-between rounded-md border px-3 py-2.5 transition-colors ${device.id === activeDeviceId ? "border-foreground bg-muted" : "border-border bg-card"}`}>
                    <div className="flex items-center gap-3">
                      <Monitor size={16} className="text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{device.hostname}</span>
                          {device.id === activeDeviceId && <Badge className="bg-green-50 text-[10px] text-green-700 dark:bg-green-800 dark:text-green-200">Active</Badge>}
                        </div>
                        <span className="font-mono text-xs text-muted-foreground">{device.ipAddress}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        {device.connected ? <CheckCircle2 size={14} className="text-success" /> : <XCircle size={14} className="text-destructive" />}
                        <span className="text-xs text-muted-foreground">{device.connected ? "Connected" : "Disconnected"}</span>
                      </div>
                      {device.id !== activeDeviceId && (
                        <Button variant="ghost" size="sm" onClick={() => setActiveDevice(device.id)}>
                          Select
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleDisconnect(device.id)} title="Disconnect" className="hover:bg-destructive/10 hover:text-destructive">
                        <Unplug size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <Monitor size={24} className="mb-2 text-border" />
                <p className="text-sm text-muted-foreground">No devices connected</p>
                <p className="mt-1 text-xs text-muted-foreground">Scan or manually connect to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manual Connect */}
        <Card className="gap-2 py-0">
          <CardHeader className="px-4 pt-4 pb-0">
            <CardTitle className="text-sm">Manual Connect</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="device-addr">IP Address : Port</Label>
                <Input id="device-addr" type="text" value={manualAddr} onChange={(e) => setManualAddr(e.target.value)} placeholder="192.168.0.22:5683" className="mt-1 font-mono" />
              </div>
              <Button onClick={() => handleConnect(manualAddr)} disabled={!manualAddr.trim() || connecting} className="w-full">
                {connecting ? <Loader2 size={16} className="animate-spin" /> : <Plug size={16} />}
                {connecting ? "Connecting..." : "Connect"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discovered Devices */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Discovered Devices
          {discovered.length > 0 && <span className="ml-2 text-xs font-normal text-muted-foreground">({discovered.length} found)</span>}
        </h2>
        {scanning ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-2 py-12">
              <Loader2 size={18} className="animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Scanning for devices...</span>
            </CardContent>
          </Card>
        ) : discovered.length > 0 ? (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hostname</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>mDNS</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {discovered.map((device) => {
                  const isConnected = devices.some((d) => d.ipAddress === `${device.ip}:${device.port}`);
                  return (
                    <TableRow key={`${device.ip}:${device.port}`}>
                      <TableCell className="font-medium">{device.hostname || "—"}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{device.ip}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{device.port}</TableCell>
                      <TableCell>
                        <Radio size={14} className="text-success" />
                      </TableCell>
                      <TableCell>
                        <Button variant="link" size="sm" onClick={() => handleConnectDiscovered(device)} disabled={isConnected || connecting}>
                          {isConnected ? "Connected" : "Connect"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search size={24} className="mb-2 text-border" />
              <p className="text-sm text-muted-foreground">No devices discovered. Click mDNS Scan to search the network.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

