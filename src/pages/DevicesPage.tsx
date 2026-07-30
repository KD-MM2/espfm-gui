import { useState } from "react";
import {
  Monitor,
  Search,
  Loader2,
  Unplug,
  Plug,
  CheckCircle2,
  XCircle,
  Radio,
} from "lucide-react";
import { api } from "../lib/api";
import { useDeviceStore } from "../stores/deviceStore";
import { useToast } from "@/hooks/use-toast";

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
      alert(`Scan failed: ${e}`);
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
        connected: true,
      });
      setActiveDevice(result.id);
      setConnectionStatus("connected");
      showToast(`Connected to ${result.hostname}`, "success");
      setManualAddr("");
      // Persist device info and last active device
      await api.saveDeviceInfo(result.hostname, result.ip, result.port);
      await api.saveAppState(
        "last_active_device",
        JSON.stringify({
          hostname: result.hostname,
          ip: result.ip,
          port: result.port,
        })
      );
    } catch (e) {
      alert(`Connection failed: ${e}`);
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
      // If disconnected the active device, delete saved state
      if (id === activeDeviceId) {
        setConnectionStatus("disconnected");
        await api.deleteAppState("last_active_device");
      }
      showToast("Disconnected", "success");
    } catch (e) {
      alert(`Disconnect failed: ${e}`);
    }
  }

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Devices</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Manage connections to ESP Fan Manager devices
          </p>
        </div>
        <button
          type="button"
          onClick={handleScan}
          disabled={scanning}
          className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          {scanning ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Search size={16} />
          )}
          {scanning ? "Scanning..." : "mDNS Scan"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Connected Devices */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Connected Devices
          </h2>
          {devices.length > 0 ? (
            <div className="space-y-2">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className={`flex items-center justify-between rounded-md border px-3 py-2.5 transition-colors ${
                    device.id === activeDeviceId
                      ? "border-foreground bg-muted"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Monitor size={16} className="text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {device.hostname}
                        </span>
                        {device.id === activeDeviceId && (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                            Active
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {device.ipAddress}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      {device.connected ? (
                        <CheckCircle2 size={14} className="text-success" />
                      ) : (
                        <XCircle size={14} className="text-destructive" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {device.connected ? "Connected" : "Disconnected"}
                      </span>
                    </div>
                    {device.id !== activeDeviceId && (
                      <button
                        type="button"
                        onClick={() => setActiveDevice(device.id)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        Select
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDisconnect(device.id)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      title="Disconnect"
                    >
                      <Unplug size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <Monitor size={24} className="mb-2 text-border" />
              <p className="text-sm text-muted-foreground">No devices connected</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Scan or manually connect to get started
              </p>
            </div>
          )}
        </div>

        {/* Manual Connect */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            Manual Connect
          </h2>
          <div className="space-y-3">
            <div>
              <label
                htmlFor="device-addr"
                className="mb-1 block text-xs font-medium text-muted-foreground"
              >
                IP Address : Port
              </label>
              <input
                id="device-addr"
                type="text"
                value={manualAddr}
                onChange={(e) => setManualAddr(e.target.value)}
                placeholder="192.168.0.22:5683"
                className="w-full rounded-md border border-border bg-card px-3 py-2 font-mono text-sm text-foreground outline-none transition-colors focus:border-foreground"
              />
            </div>
            <button
              type="button"
              onClick={() => handleConnect(manualAddr)}
              disabled={!manualAddr.trim() || connecting}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {connecting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plug size={16} />
              )}
              {connecting ? "Connecting..." : "Connect"}
            </button>
          </div>
        </div>
      </div>

      {/* Discovered Devices */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Discovered Devices
          {discovered.length > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({discovered.length} found)
            </span>
          )}
        </h2>
        {scanning ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card py-12">
            <Loader2 size={18} className="animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Scanning for devices...
            </span>
          </div>
        ) : discovered.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Hostname
                  </th>
                  <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    IP Address
                  </th>
                  <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    Port
                  </th>
                  <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground">
                    mDNS
                  </th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {discovered.map((device) => {
                  const isConnected = devices.some(
                    (d) => d.ipAddress === `${device.ip}:${device.port}`
                  );
                  return (
                    <tr
                      key={`${device.ip}:${device.port}`}
                      className="border-b border-border last:border-b-0 hover:bg-muted"
                    >
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        {device.hostname || "—"}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                        {device.ip}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                        {device.port}
                      </td>
                      <td className="px-4 py-2.5">
                        <Radio size={14} className="text-green-600" />
                      </td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => handleConnectDiscovered(device)}
                          disabled={isConnected || connecting}
                          className="text-xs font-medium text-foreground underline decoration-border underline-offset-2 transition-colors hover:decoration-foreground disabled:cursor-not-allowed disabled:no-underline disabled:text-border"
                        >
                          {isConnected ? "Connected" : "Connect"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card py-12">
            <Search size={24} className="mb-2 text-border" />
            <p className="text-sm text-muted-foreground">
              No devices discovered. Click mDNS Scan to search the network.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
