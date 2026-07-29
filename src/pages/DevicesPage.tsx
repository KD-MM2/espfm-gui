import { useState, useEffect } from "react";
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
import { useToast } from "../stores/toastStore";

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

  // Auto-connect to last active device on startup (once only)
  useEffect(() => {
    async function restoreDevice() {
      try {
        const lastDeviceJson = await api.getAppState("last_active_device");
        if (!lastDeviceJson) return;
        const saved = JSON.parse(lastDeviceJson) as {
          hostname: string;
          ip: string;
          port: number;
        };
        if (!saved.ip) return;
        const addr = `${saved.ip}:${saved.port}`;

        // Check if device already exists in store (avoid duplicates)
        const existing = useDeviceStore.getState().devices.find(
          (d) => d.ipAddress === addr
        );
        if (existing) {
          if (!existing.connected) {
            // Try to reconnect existing device
            try {
              await api.connectDevice(addr);
              useDeviceStore.getState().devices.forEach((d) => {
                if (d.ipAddress === addr) {
                  // Update connected status via store
                }
              });
            } catch {
              // Stay disconnected
            }
          }
          return;
        }

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
        } catch {
          addDevice({
            id: Date.now(),
            hostname: saved.hostname,
            ipAddress: addr,
            connected: false,
          });
        }
      } catch {
        // No saved state — first launch
      }
    }
    restoreDevice();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      // If disconnected the active device, update status
      if (id === activeDeviceId) {
        setConnectionStatus("disconnected");
      }
      showToast("Disconnected", "success");
    } catch (e) {
      alert(`Disconnect failed: ${e}`);
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#171717]">Devices</h1>
          <p className="mt-1 text-xs text-[#60646c]">
            Manage connections to ESP Fan Manager devices
          </p>
        </div>
        <button
          type="button"
          onClick={handleScan}
          disabled={scanning}
          className="flex items-center gap-1.5 rounded-md border border-[#dcdee0] bg-white px-3.5 py-2 text-sm font-medium text-[#171717] transition-colors hover:bg-[#f0f0f3] disabled:cursor-not-allowed disabled:opacity-50"
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
        <div className="rounded-lg border border-[#dcdee0] bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-[#171717]">
            Connected Devices
          </h2>
          {devices.length > 0 ? (
            <div className="space-y-2">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className={`flex items-center justify-between rounded-md border px-3 py-2.5 transition-colors ${
                    device.id === activeDeviceId
                      ? "border-[#171717] bg-[#f8f8fa]"
                      : "border-[#dcdee0] bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Monitor size={16} className="text-[#60646c]" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[#171717]">
                          {device.hostname}
                        </span>
                        {device.id === activeDeviceId && (
                          <span className="rounded-full bg-[#171717] px-2 py-0.5 text-[10px] font-medium text-white">
                            Active
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-xs text-[#60646c]">
                        {device.ipAddress}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      {device.connected ? (
                        <CheckCircle2 size={14} className="text-green-600" />
                      ) : (
                        <XCircle size={14} className="text-red-500" />
                      )}
                      <span className="text-xs text-[#60646c]">
                        {device.connected ? "Connected" : "Disconnected"}
                      </span>
                    </div>
                    {device.id !== activeDeviceId && (
                      <button
                        type="button"
                        onClick={() => setActiveDevice(device.id)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-[#171717] transition-colors hover:bg-[#f0f0f3]"
                      >
                        Select
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDisconnect(device.id)}
                      className="rounded-md p-1.5 text-[#60646c] transition-colors hover:bg-red-50 hover:text-red-600"
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
              <Monitor size={24} className="mb-2 text-[#dcdee0]" />
              <p className="text-sm text-[#60646c]">No devices connected</p>
              <p className="mt-1 text-xs text-[#60646c]">
                Scan or manually connect to get started
              </p>
            </div>
          )}
        </div>

        {/* Manual Connect */}
        <div className="rounded-lg border border-[#dcdee0] bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-[#171717]">
            Manual Connect
          </h2>
          <div className="space-y-3">
            <div>
              <label
                htmlFor="device-addr"
                className="mb-1 block text-xs font-medium text-[#60646c]"
              >
                IP Address : Port
              </label>
              <input
                id="device-addr"
                type="text"
                value={manualAddr}
                onChange={(e) => setManualAddr(e.target.value)}
                placeholder="192.168.0.22:5683"
                className="w-full rounded-md border border-[#dcdee0] bg-white px-3 py-2 font-mono text-sm text-[#171717] outline-none transition-colors focus:border-[#171717]"
              />
            </div>
            <button
              type="button"
              onClick={() => handleConnect(manualAddr)}
              disabled={!manualAddr.trim() || connecting}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[#171717] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-50"
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
        <h2 className="mb-3 text-sm font-semibold text-[#171717]">
          Discovered Devices
          {discovered.length > 0 && (
            <span className="ml-2 text-xs font-normal text-[#60646c]">
              ({discovered.length} found)
            </span>
          )}
        </h2>
        {scanning ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-[#dcdee0] bg-white py-12">
            <Loader2 size={18} className="animate-spin text-[#60646c]" />
            <span className="text-sm text-[#60646c]">
              Scanning for devices...
            </span>
          </div>
        ) : discovered.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-[#dcdee0] bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#dcdee0] bg-[#f8f8fa]">
                  <th className="px-4 py-2.5 text-xs font-medium text-[#60646c]">
                    Hostname
                  </th>
                  <th className="px-4 py-2.5 text-xs font-medium text-[#60646c]">
                    IP Address
                  </th>
                  <th className="px-4 py-2.5 text-xs font-medium text-[#60646c]">
                    Port
                  </th>
                  <th className="px-4 py-2.5 text-xs font-medium text-[#60646c]">
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
                      className="border-b border-[#dcdee0] last:border-b-0 hover:bg-[#f8f8fa]"
                    >
                      <td className="px-4 py-2.5 font-medium text-[#171717]">
                        {device.hostname || "—"}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-[#60646c]">
                        {device.ip}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-[#60646c]">
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
                          className="text-xs font-medium text-[#171717] underline decoration-[#dcdee0] underline-offset-2 transition-colors hover:decoration-[#171717] disabled:cursor-not-allowed disabled:no-underline disabled:text-[#dcdee0]"
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
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#dcdee0] bg-white py-12">
            <Search size={24} className="mb-2 text-[#dcdee0]" />
            <p className="text-sm text-[#60646c]">
              No devices discovered. Click mDNS Scan to search the network.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
