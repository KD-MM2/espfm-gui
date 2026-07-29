import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { api, type FanState } from "../lib/api";
import { useDeviceStore } from "../stores/deviceStore";
import { useToast } from "../stores/toastStore";
import { FanList } from "../components/fans/FanList";
import { FanForm, type FanFormData } from "../components/fans/FanForm";

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

  async function handleCreate(data: FanFormData) {
    if (activeDeviceId == null) return;
    try {
      const created = await api.createFan(activeDeviceId, {
        name: data.name,
        pwm_gpio: data.pwm_gpio,
        tach_gpio: data.tach_gpio,
      });
      // Apply additional settings via update if needed
      const needsUpdate =
        data.mode !== "manual" ||
        data.duty !== 50 ||
        data.inverted ||
        !data.enabled ||
        data.source_id !== 255 ||
        data.curve_id !== 255 ||
        data.schedule_id !== 255 ||
        data.group_id !== 0;

      let final = created;
      if (needsUpdate) {
        final = await api.updateFan(activeDeviceId, created.slot, {
          mode: data.mode,
          duty: data.duty,
          inverted: data.inverted,
          enabled: data.enabled,
          source_id: data.source_id !== 255 ? data.source_id : undefined,
          curve_id: data.curve_id !== 255 ? data.curve_id : undefined,
          schedule_id: data.schedule_id !== 255 ? data.schedule_id : undefined,
          group_id: data.group_id !== 0 ? data.group_id : undefined,
        });
      }
      setFans((prev) => [...prev, final]);
      closeForm();
    } catch (err) {
      showToast(`Failed to create fan: ${String(err)}`, "error");
    }
  }

  async function handleUpdate(fan: FanState, data: FanFormData) {
    if (activeDeviceId == null) return;
    try {
      const updated = await api.updateFan(activeDeviceId, fan.slot, {
        name: data.name,
        mode: data.mode,
        duty: data.duty,
        inverted: data.inverted,
        enabled: data.enabled,
        source_id: data.source_id !== 255 ? data.source_id : undefined,
        curve_id: data.curve_id !== 255 ? data.curve_id : undefined,
        schedule_id: data.schedule_id !== 255 ? data.schedule_id : undefined,
        group_id: data.group_id !== 0 ? data.group_id : undefined,
      });
      setFans((prev) =>
        prev.map((f) => (f.slot === updated.slot ? updated : f))
      );
      closeForm();
    } catch (err) {
      showToast(`Failed to update fan: ${String(err)}`, "error");
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

  function handleFormSubmit(data: FanFormData) {
    if (editingFan) {
      handleUpdate(editingFan, data);
    } else {
      handleCreate(data);
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
