import { useState, useEffect, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { api, type Ds18b20Device, type SourceState } from "../../lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Ds18b20ScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceId: number;
  sources: SourceState[];
  onAssign: (device: Ds18b20Device) => void;
  onEdit: (source: SourceState) => void;
}

export function Ds18b20Scanner({ open, onOpenChange, deviceId, sources, onAssign, onEdit }: Ds18b20ScannerProps) {
  const { showToast } = useToast();
  const [devices, setDevices] = useState<Ds18b20Device[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [busGpio, setBusGpio] = useState("");
  const [configuring, setConfiguring] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [editing, setEditing] = useState(false);

  const gpioKey = `ds18b20_gpio_${deviceId}`;

  // Build ROM code → source lookup for pairing scanned devices with existing sources
  const sourceByRom = useMemo(() => {
    const map = new Map<string, SourceState>();
    for (const s of sources) {
      if (s.rom_code) map.set(s.rom_code, s);
    }
    return map;
  }, [sources]);

  // Load saved GPIO from app state when dialog opens
  useEffect(() => {
    if (!open) return;
    setEditing(false);
    api.getAppState(gpioKey).then((saved) => {
      if (saved) {
        setBusGpio(saved);
        setConfigured(true);
      } else {
        setBusGpio("");
        setConfigured(false);
      }
    }).catch(() => {
      setBusGpio("");
      setConfigured(false);
    });
  }, [open, gpioKey]);

  async function handleScan() {
    setScanning(true);
    setDevices([]);
    try {
      // Auto-configure DS18B20 bus GPIO if we have a saved value.
      // On fresh/erased devices ds18b20_ref is NULL until configDs18b20 is called.
      // The firmware config endpoint is idempotent (returns OK if already initialized).
      if (configured) {
        try {
          await api.configDs18b20(deviceId, parseInt(busGpio, 10));
        } catch {
          // Ignore — scan will fail with a clearer error if bus is truly broken
        }
      }
      const results = await api.scanDs18b20(deviceId);
      setDevices(results);
      setScanned(true);
    } catch (e) {
      showToast(`DS18B20 scan failed: ${String(e)}`, "error");
    } finally {
      setScanning(false);
    }
  }

  async function handleConfigureGpio() {
    const gpio = parseInt(busGpio, 10);
    if (isNaN(gpio) || gpio < 0 || gpio > 48) {
      showToast("Invalid GPIO pin number", "error");
      return;
    }
    setConfiguring(true);
    try {
      await api.configDs18b20(deviceId, gpio);
      await api.saveAppState(gpioKey, String(gpio));
      setConfigured(true);
      setEditing(false);
      showToast(`DS18B20 bus GPIO set to ${gpio}`, "success");
    } catch (e) {
      showToast(`Failed to configure DS18B20 GPIO: ${String(e)}`, "error");
    } finally {
      setConfiguring(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>DS18B20 Scanner</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Bus GPIO configuration */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="ds18b20-bus-gpio">Bus GPIO</Label>
              <Input
                id="ds18b20-bus-gpio"
                type="number"
                min={0}
                max={48}
                value={busGpio}
                onChange={(e) => setBusGpio(e.target.value)}
                placeholder="e.g. 4"
                readOnly={configured && !editing}
                className="mt-1"
              />
            </div>
            {configured && !editing ? (
              <Button variant="outline" onClick={() => setEditing(true)}>
                Change
              </Button>
            ) : (
              <Button variant="outline" onClick={handleConfigureGpio} disabled={configuring || !busGpio.trim()}>
                {configuring ? "Setting..." : "Configure"}
              </Button>
            )}
          </div>

          {/* Scan button */}
          <Button onClick={handleScan} disabled={scanning || (!configured && !busGpio.trim())}>
            {scanning && <Loader2 size={16} className="animate-spin" />}
            {scanning ? "Scanning..." : "Scan Bus"}
          </Button>
        </div>

        {/* Results */}
        {scanned && !scanning && devices.length === 0 && <p className="text-sm text-muted-foreground">No devices found.</p>}

        {devices.length > 0 && (
          <div className="space-y-2">
            {devices.map((device) => {
              const paired = sourceByRom.get(device.rom_code);
              return (
                <div key={device.rom_code} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                  <div>
                    <div className="text-xs text-muted-foreground">
                      Device {device.index}
                      {paired && <span className="ml-2 text-primary">· {paired.name}</span>}
                    </div>
                    <div className="mt-0.5 font-mono text-sm text-foreground">{device.rom_code}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{device.temp_c.toFixed(1)} °C</div>
                  </div>
                  {paired ? (
                    <Button size="sm" variant="outline" onClick={() => onEdit(paired)}>
                      Edit
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => onAssign(device)}>
                      Assign
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Close */}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

