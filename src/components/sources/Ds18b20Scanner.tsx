import { useState } from "react";
import { Loader2 } from "lucide-react";
import { api, type Ds18b20Device } from "../../lib/api";

interface Ds18b20ScannerProps {
  deviceId: number;
  onAssign: (device: Ds18b20Device) => void;
  onClose: () => void;
}

export function Ds18b20Scanner({
  deviceId,
  onAssign,
  onClose,
}: Ds18b20ScannerProps) {
  const [devices, setDevices] = useState<Ds18b20Device[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  async function handleScan() {
    setScanning(true);
    setDevices([]);
    try {
      const results = await api.scanDs18b20(deviceId);
      setDevices(results);
      setScanned(true);
    } catch {
      // TODO: surface error toast
    } finally {
      setScanning(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-[#dcdee0] bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-[#171717]">
          DS18B20 Scanner
        </h2>

        <div className="mt-4">
          <button
            type="button"
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-1.5 rounded-md bg-[#171717] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {scanning && <Loader2 size={16} className="animate-spin" />}
            {scanning ? "Scanning..." : "Scan Bus"}
          </button>
        </div>

        {/* Results */}
        {scanned && !scanning && devices.length === 0 && (
          <p className="mt-4 text-sm text-[#60646c]">No devices found.</p>
        )}

        {devices.length > 0 && (
          <div className="mt-4 space-y-2">
            {devices.map((device) => (
              <div
                key={device.rom_code}
                className="flex items-center justify-between rounded-lg border border-[#dcdee0] bg-white p-3"
              >
                <div>
                  <div className="text-xs text-[#60646c]">
                    Device {device.index}
                  </div>
                  <div className="mt-0.5 font-mono text-sm text-[#171717]">
                    {device.rom_code}
                  </div>
                  <div className="mt-0.5 text-xs text-[#60646c]">
                    {device.temp_c.toFixed(1)} °C
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onAssign(device)}
                  className="rounded-md bg-[#171717] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#2a2a2a]"
                >
                  Assign
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Close */}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#dcdee0] bg-white px-4 py-2 text-sm font-medium text-[#171717] transition-colors hover:bg-[#f0f0f3]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
