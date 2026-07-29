import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { api, type FanState } from "../lib/api";
import { useDeviceStore } from "../stores/deviceStore";
import { useToast } from "../stores/toastStore";
import { FanList } from "../components/fans/FanList";
import { FanForm } from "../components/fans/FanForm";

const MAX_FAN_SLOTS = 8;

export function FansPage() {
  const activeDeviceId = useDeviceStore((s) => s.activeDeviceId);
  const { showToast } = useToast();
  const [fans, setFans] = useState<FanState[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingFan, setEditingFan] = useState<FanState | null>(null);

  const fetchFans = useCallback(async () => {
    if (activeDeviceId == null) return;
    try {
      const data = await api.getFans(activeDeviceId);
      setFans(data);
    } catch (err) {
      showToast(`Failed to load fans: ${String(err)}`, "error");
    }
  }, [activeDeviceId]);

  useEffect(() => {
    fetchFans();
  }, [fetchFans]);

  async function handleCreate(data: {
    name: string;
    pwm_gpio: number;
    tach_gpio: number;
  }) {
    if (activeDeviceId == null) return;
    try {
      const created = await api.createFan(activeDeviceId, data);
      setFans((prev) => [...prev, created]);
      setShowForm(false);
    } catch (err) {
      showToast(`Failed to create fan: ${String(err)}`, "error");
    }
  }

  async function handleToggle(fan: FanState) {
    if (activeDeviceId == null) return;
    try {
      const updated = await api.updateFan(activeDeviceId, fan.slot, {
        enabled: !fan.enabled,
      });
      setFans((prev) =>
        prev.map((f) => (f.slot === updated.slot ? updated : f))
      );
    } catch (err) {
      showToast(`Failed to toggle fan: ${String(err)}`, "error");
    }
  }

  async function handleDelete(fan: FanState) {
    if (activeDeviceId == null) return;
    try {
      await api.deleteFan(activeDeviceId, fan.slot);
      setFans((prev) => prev.filter((f) => f.slot !== fan.slot));
    } catch (err) {
      showToast(`Failed to delete fan: ${String(err)}`, "error");
    }
  }

  function handleEdit(fan: FanState) {
    setEditingFan(fan);
    setShowForm(true);
  }

  function handleFormSubmit(data: {
    name: string;
    pwm_gpio: number;
    tach_gpio: number;
  }) {
    if (editingFan) {
      // Edit mode — only name can be updated via updateFan API
      handleUpdateName(editingFan, data.name);
    } else {
      handleCreate(data);
    }
  }

  async function handleUpdateName(fan: FanState, name: string) {
    if (activeDeviceId == null) return;
    try {
      const updated = await api.updateFan(activeDeviceId, fan.slot, { name });
      setFans((prev) =>
        prev.map((f) => (f.slot === updated.slot ? updated : f))
      );
      closeForm();
    } catch (err) {
      showToast(`Failed to update fan: ${String(err)}`, "error");
    }
  }

  function closeForm() {
    setShowForm(false);
    setEditingFan(null);
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#171717]">Fans</h1>
          <p className="mt-1 text-xs text-[#60646c]">
            {fans.length} of {MAX_FAN_SLOTS} slots used
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingFan(null);
            setShowForm(true);
          }}
          disabled={fans.length >= MAX_FAN_SLOTS}
          className="flex items-center gap-1.5 rounded-md bg-[#171717] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={16} />
          Create Fan
        </button>
      </div>

      {/* Fan list */}
      <FanList
        fans={fans}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggle={handleToggle}
      />

      {/* Form modal */}
      {showForm && (
        <FanForm
          onSubmit={handleFormSubmit}
          onCancel={closeForm}
          initialData={editingFan}
        />
      )}
    </div>
  );
}
