import { useState, useEffect, useCallback, useRef } from "react";
import { Plus, ScanLine } from "lucide-react";
import { api, type SourceState, type Ds18b20Device } from "../lib/api";
import { useDeviceStore } from "../stores/deviceStore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
  const [editingSource, setEditingSource] = useState<SourceState | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchSources = useCallback(async () => {
    if (activeDeviceId == null) return;
    try {
      const data = await api.getSources(activeDeviceId);
      if (isMounted.current) setSources(data);
    } catch {
      // Ignore errors after unmount
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
      api.saveLog(activeDeviceId, "source", `Source "${created.name}" created (${created.source_type})`, `slot=${created.slot}`).catch(() => {});
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
      api.saveLog(activeDeviceId, "source", `Source "${source.name}" deleted`, `slot=${source.slot}`).catch(() => {});
    } catch (err) {
      showToast(`Failed to delete source: ${String(err)}`, "error");
    }
  }

  function handleEdit(source: SourceState) {
    setEditingSource(source);
    setShowForm(true);
  }

  async function handleUpdate(data: {
    name: string;
    source_type: string;
    gpio?: number;
    rom_code?: string;
  }) {
    if (activeDeviceId == null || editingSource == null) return;

    // Check if only name changed (PUT /sources/{id} only supports name)
    const nameChanged = data.name !== editingSource.name;
    const typeChanged = data.source_type !== editingSource.source_type;
    const gpioChanged = (data.gpio ?? 255) !== editingSource.gpio;
    const romChanged = (data.rom_code ?? "") !== (editingSource.rom_code ?? "");

    if (nameChanged && !typeChanged && !gpioChanged && !romChanged) {
      // Only name changed — use updateSource
      try {
        await api.updateSource(activeDeviceId, editingSource.slot, data.name);
        setSources((prev) =>
          prev.map((s) =>
            s.slot === editingSource.slot ? { ...s, name: data.name } : s
          )
        );
        showToast("Source updated", "success");
        api.saveLog(activeDeviceId, "source", `Source "${data.name}" renamed`, `slot=${editingSource.slot}`).catch(() => {});
        closeForm();
      } catch (err) {
        showToast(`Failed to update source: ${String(err)}`, "error");
      }
    } else {
      // Other fields changed — delete + recreate
      try {
        await api.deleteSource(activeDeviceId, editingSource.slot);
        const created = await api.createSource(activeDeviceId, data);
        setSources((prev) =>
          prev.map((s) => (s.slot === editingSource.slot ? created : s))
        );
        showToast("Source recreated", "success");
        api.saveLog(activeDeviceId, "source", `Source "${data.name}" recreated (${data.source_type})`, `slot=${editingSource.slot}`).catch(() => {});
        closeForm();
      } catch (err) {
        showToast(`Failed to update source: ${String(err)}`, "error");
      }
    }
  }

  function handleFormSubmit(data: {
    name: string;
    source_type: string;
    gpio?: number;
    rom_code?: string;
  }) {
    if (editingSource) {
      handleUpdate(data);
    } else {
      handleCreate(data);
    }
  }

  async function handleSetManualTemp(source: SourceState, tempC: number) {
    if (activeDeviceId == null) return;
    try {
      await api.updateManualTemp(activeDeviceId, source.slot, tempC);
      setSources((prev) =>
        prev.map((s) => (s.slot === source.slot ? { ...s, temp_c: tempC } : s))
      );
      showToast("Temperature updated", "success");
      api.saveLog(activeDeviceId, "source", `Source "${source.name}" temp set to ${tempC}°C`, `slot=${source.slot}`).catch(() => {});
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
    setEditingSource(null);
  }

  return (
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Sources</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {sources.length} of {MAX_SOURCE_SLOTS} slots used
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowScanner(true)}>
            <ScanLine size={16} />
            Scan DS18B20
          </Button>
          <Button
            onClick={() => {
              setEditingSource(null);
              setShowForm(true);
            }}
            disabled={sources.length >= MAX_SOURCE_SLOTS}
          >
            <Plus size={16} />
            Create Source
          </Button>
        </div>
      </div>

      {/* Source list */}
      <SourceList
        sources={sources}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onCreateFirst={() => setShowForm(true)}
        onSetManualTemp={handleSetManualTemp}
      />

      {/* Form dialog */}
      <SourceForm
        open={showForm}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        onSubmit={handleFormSubmit}
        initialData={editingSource}
      />

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
