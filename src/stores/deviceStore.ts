import { create } from "zustand";

interface Device {
  id: number;
  hostname: string;
  ipAddress: string;
  connected: boolean;
}

interface DeviceStore {
  devices: Device[];
  activeDeviceId: number | null;
  connectionStatus: "connected" | "reconnecting" | "disconnected";
  setDevices: (devices: Device[]) => void;
  addDevice: (device: Device) => void;
  updateDevice: (ipAddress: string, device: Device) => void;
  removeDevice: (id: number) => void;
  setActiveDevice: (id: number | null) => void;
  setConnectionStatus: (status: "connected" | "reconnecting" | "disconnected") => void;
}

export const useDeviceStore = create<DeviceStore>((set) => ({
  devices: [],
  activeDeviceId: null,
  connectionStatus: "disconnected",
  setDevices: (devices) => set({ devices }),
  addDevice: (device) =>
    set((state) => {
      // Deduplicate by IP address — don't add if already exists
      const exists = state.devices.some((d) => d.ipAddress === device.ipAddress);
      if (exists) return state;
      return { devices: [...state.devices, device] };
    }),
  updateDevice: (ipAddress, device) =>
    set((state) => ({
      devices: state.devices.map((d) => (d.ipAddress === ipAddress ? device : d))
    })),
  removeDevice: (id) =>
    set((state) => ({
      devices: state.devices.filter((d) => d.id !== id),
      activeDeviceId: state.activeDeviceId === id ? null : state.activeDeviceId
    })),
  setActiveDevice: (id) => set({ activeDeviceId: id }),
  setConnectionStatus: (status) => set({ connectionStatus: status })
}));

