import { useEffect } from "react";
import { api } from "../lib/api";
import { useDeviceStore } from "../stores/deviceStore";

// Ids for placeholder (failed auto-connect) devices. Must stay within u32 so a
// later disconnect_device(id) call doesn't reject them. Date.now() is ~1.7e12,
// which exceeds u32::MAX (~4.29e9) and fails Tauri arg validation.
let placeholderId = 0xFFFF_FF00;

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

    async function restoreDevices() {
      // 1. Restore all previously saved devices
      let lastActiveAddr: string | null = null;
      try {
        const savedDevices = await api.getSavedDevices();
        if (cancelled) return;
        for (const sd of savedDevices) {
          const addr = `${sd.ip_address}:${sd.port}`;
          const existing = useDeviceStore.getState().devices.find((d) => d.ipAddress === addr);
          if (existing) continue;
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
            api.saveDeviceInfo(result.hostname, result.ip, result.port).catch(() => {});
          } catch {
            if (cancelled) return;
            addDevice({
              id: placeholderId++,
              hostname: sd.hostname,
              ipAddress: addr,
              connected: false
            });
          }
        }
      } catch {
        // No saved devices — first launch
      }

      // 2. Restore last active device selection
      try {
        const lastDeviceJson = await api.getAppState("last_active_device");
        if (!lastDeviceJson || cancelled) return;
        const saved = JSON.parse(lastDeviceJson) as {
          hostname: string;
          ip: string;
          port: number;
        };
        if (!saved.ip) return;
        lastActiveAddr = `${saved.ip}:${saved.port}`;

        // Find the device in the store (should exist from step 1, or reconnect)
        const existing = useDeviceStore.getState().devices.find((d) => d.ipAddress === lastActiveAddr);
        if (existing) {
          setActiveDevice(existing.id);
          if (existing.connected) {
            setConnectionStatus("connected");
          } else {
            // Try to reconnect the active device
            try {
              const result = (await api.connectDevice(lastActiveAddr)) as {
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
            } catch {
              // Stay disconnected
            }
          }
        }
      } catch {
        // No saved active device
      }
    }

    restoreDevices();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
