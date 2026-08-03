import { useEffect } from "react";
import { api } from "../lib/api";
import { useDeviceStore } from "../stores/deviceStore";

/**
 * Auto-connect to the last active device on app startup.
 * Runs once from Layout (always mounted), not from DevicesPage.
 */
export function useAutoConnect(): void {
  const addDevice = useDeviceStore((s) => s.addDevice);
  const setActiveDevice = useDeviceStore((s) => s.setActiveDevice);
  const setConnectionStatus = useDeviceStore((s) => s.setConnectionStatus);

  useEffect(() => {
    let cancelled = false;

    async function restoreDevice() {
      try {
        const lastDeviceJson = await api.getAppState("last_active_device");
        if (!lastDeviceJson || cancelled) return;
        const saved = JSON.parse(lastDeviceJson) as {
          hostname: string;
          ip: string;
          port: number;
        };
        if (!saved.ip) return;
        const addr = `${saved.ip}:${saved.port}`;

        // Check if device already exists in store (avoid duplicates)
        const existing = useDeviceStore.getState().devices.find((d) => d.ipAddress === addr);
        if (existing) {
          if (!existing.connected) {
            try {
              const result = (await api.connectDevice(addr)) as {
                id: number;
                hostname: string;
                ip: string;
                port: number;
              };
              if (cancelled) return;
              addDevice({
                id: result.id,
                hostname: result.hostname,
                ipAddress: `${result.ip}:${result.port}`,
                connected: true
              });
              setActiveDevice(result.id);
              setConnectionStatus("connected");
              api.saveDeviceInfo(result.hostname, result.ip, result.port).catch(() => {});
            } catch {
              // Stay disconnected
            }
          } else {
            // Already connected — just ensure it's the active device
            setActiveDevice(existing.id);
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
          if (cancelled) return;
          addDevice({
            id: result.id,
            hostname: result.hostname,
            ipAddress: `${result.ip}:${result.port}`,
            connected: true
          });
          setActiveDevice(result.id);
          setConnectionStatus("connected");
          api.saveDeviceInfo(result.hostname, result.ip, result.port).catch(() => {});
        } catch {
          if (cancelled) return;
          addDevice({
            id: Date.now(),
            hostname: saved.hostname,
            ipAddress: addr,
            connected: false
          });
        }
      } catch {
        // No saved state — first launch
      }
    }

    restoreDevice();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
