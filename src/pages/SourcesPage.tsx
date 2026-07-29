import { useState, useEffect, useCallback } from "react";
import { Plus, ScanLine } from "lucide-react";
import { api, type SourceState, type Ds18b20Device } from "../lib/api";
import { useDeviceStore } from "../stores/deviceStore";
import { useToast } from "../stores/toastStore";
import { SourceList } from "../components/sources/SourceList";
import { SourceForm } from "../components/sources/SourceForm";
import { Ds18b20Scanner } from "../components/sources/Ds18b20Scanner";

const MAX_SOURCE_SLOTS = 8;

export function SourcesPage() {
  const activeDeviceId = useDeviceStore((s) => s.activeDeviceId);
  const { showToast } = useToast();
  const [sources, setSources] = useState<SourceState[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const fetchSources = useCallback(async () => {
    if (activeDeviceId == null) return;
    try {
      const data = await api.getSources(activeDeviceId);
      setSources(data);
    } catch (err) {
      showToast(`Failed to load sources: ${String(err)}`, "error");
    }
  }, [activeDeviceId]);

  useEffect(() => {
    fetchSources();
    const interval = setInterval(fetchSources, 5000);
    return () => clearInterval(interval);
  }, [fetchSources]);

  async function handleCreate(data: {
    name: string;
    source_type: string;
    gpio?: number;
    rom_code?: string;
  }) {
    if (activeDeviceId == null) return;
    try {
      const created = await api.createSource(activeDeviceId, data);
      setSources((prev) => [...prev, created]);
      showToast("Source created", "success");
      setShowForm(false);
    } catch (err) {
      showToast(`Failed to create source: ${String(err)}`, "error");
    }
  }

  async function handleDelete(source: SourceState) {
    if (activeDeviceId == null) return;
    if (!confirm(`Delete source "${source.name}"?`)) return;
    try {
      await api.deleteSource(activeDeviceId, source.slot);
      setSources((prev) => prev.filter((s) => s.slot !== source.slot));
      showToast("Source deleted", "success");
    } catch (err) {
      showToast(`Failed to delete source: ${String(err)}`, "error");
    }
  }

  function handleFormSubmit(data: {
    name: string;
    source_type: string;
    gpio?: number;
    rom_code?: string;
  }) {
    handleCreate(data);
  }

  async function handleSetManualTemp(source: SourceState, tempC: number) {
    if (activeDeviceId == null) return;
    try {
      await api.updateManualTemp(activeDeviceId, source.slot, tempC);
      setSources((prev) =>
        prev.map((s) => (s.slot === source.slot ? { ...s, temp_c: tempC } : s))
      );
      showToast("Temperature updated", "success");
    } catch (err) {
      showToast(`Failed to set temperature: ${String(err)}`, "error");
    }
  }

  function handleAssignFromScanner(device: Ds18b20Device) {
    setShowScanner(false);
    // Pre-fill form with scanned device data
    setShowForm(true);
    // We need to pass rom_code to the form — use a ref or state
    // For simplicity, create directly
    if (activeDeviceId == null) return;
    api
      .createSource(activeDeviceId, {
        name: `DS18B20 ${device.index}`,
        source_type: "DS18B20",
        rom_code: device.rom_code,
      })
      .then((created) => {
        setSources((prev) => [...prev, created]);
      })
      .catch((err) => {
        showToast(`Failed to create source from scan: ${String(err)}`, "error");
      });
  }

  function closeForm() {
    setShowForm(false);
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#171717]">Sources</h1>
          <p className="mt-1 text-xs text-[#60646c]">
            {sources.length} of {MAX_SOURCE_SLOTS} slots used
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-1.5 rounded-md border border-[#dcdee0] bg-white px-3.5 py-2 text-sm font-medium text-[#171717] transition-colors hover:bg-[#f0f0f3]"
          >
            <ScanLine size={16} />
            Scan DS18B20
          </button>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            disabled={sources.length >= MAX_SOURCE_SLOTS}
            className="flex items-center gap-1.5 rounded-md bg-[#171717] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} />
            Create Source
          </button>
        </div>
      </div>

      {/* Source list */}
      <SourceList
        sources={sources}
        onDelete={handleDelete}
        onCreateFirst={() => setShowForm(true)}
        onSetManualTemp={handleSetManualTemp}
      />

      {/* Form modal */}
      {showForm && (
        <SourceForm
          onSubmit={handleFormSubmit}
          onCancel={closeForm}
        />
      )}

      {/* Scanner modal */}
      {showScanner && activeDeviceId != null && (
        <Ds18b20Scanner
          deviceId={activeDeviceId}
          onAssign={handleAssignFromScanner}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
