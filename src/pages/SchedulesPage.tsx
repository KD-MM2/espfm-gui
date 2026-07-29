import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { api, type ScheduleState, type FanState } from "../lib/api";
import { useDeviceStore } from "../stores/deviceStore";
import { useToast } from "../stores/toastStore";
import { ScheduleList } from "../components/schedules/ScheduleList";
import { ScheduleForm } from "../components/schedules/ScheduleForm";

const MAX_SCHEDULE_SLOTS = 8;

export function SchedulesPage() {
  const activeDeviceId = useDeviceStore((s) => s.activeDeviceId);
  const { showToast } = useToast();
  const [schedules, setSchedules] = useState<ScheduleState[]>([]);
  const [fans, setFans] = useState<FanState[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleState | null>(
    null
  );

  const fetchSchedules = useCallback(async () => {
    if (activeDeviceId == null) return;
    try {
      const data = await api.getSchedules(activeDeviceId);
      setSchedules(data);
    } catch (err) {
      showToast(`Failed to load schedules: ${String(err)}`, "error");
    }
  }, [activeDeviceId]);

  const fetchFans = useCallback(async () => {
    if (activeDeviceId == null) return;
    try {
      const data = await api.getFans(activeDeviceId);
      setFans(data);
    } catch (err) {
      // Non-critical; fan names will fall back to slot IDs
    }
  }, [activeDeviceId]);

  useEffect(() => {
    fetchSchedules();
    fetchFans();
  }, [fetchSchedules, fetchFans]);

  async function handleCreate(data: {
    fan_id: number;
    duty: number;
    start_min: number;
    end_min: number;
    enabled: boolean;
  }) {
    if (activeDeviceId == null) return;
    try {
      const created = await api.createSchedule(activeDeviceId, data);
      setSchedules((prev) => [...prev, created]);
      showToast("Schedule created", "success");
      closeForm();
    } catch (err) {
      showToast(`Failed to create schedule: ${String(err)}`, "error");
    }
  }

  async function handleUpdate(data: {
    fan_id: number;
    duty: number;
    start_min: number;
    end_min: number;
    enabled: boolean;
  }) {
    if (activeDeviceId == null || editingSchedule == null) return;
    try {
      const updated = await api.updateSchedule(
        activeDeviceId,
        editingSchedule.slot,
        {
          fan_id: data.fan_id,
          duty: data.duty,
          start_min: data.start_min,
          end_min: data.end_min,
          enabled: data.enabled,
        }
      );
      setSchedules((prev) =>
        prev.map((s) => (s.slot === updated.slot ? updated : s))
      );
      showToast("Schedule updated", "success");
      closeForm();
    } catch (err) {
      showToast(`Failed to update schedule: ${String(err)}`, "error");
    }
  }

  async function handleDelete(schedule: ScheduleState) {
    if (activeDeviceId == null) return;
    if (!confirm("Delete this schedule?")) return;
    try {
      await api.deleteSchedule(activeDeviceId, schedule.slot);
      setSchedules((prev) => prev.filter((s) => s.slot !== schedule.slot));
      showToast("Schedule deleted", "success");
    } catch (err) {
      showToast(`Failed to delete schedule: ${String(err)}`, "error");
    }
  }

  async function handleToggle(schedule: ScheduleState) {
    if (activeDeviceId == null) return;
    try {
      const updated = await api.updateSchedule(
        activeDeviceId,
        schedule.slot,
        { enabled: !schedule.enabled }
      );
      setSchedules((prev) =>
        prev.map((s) => (s.slot === updated.slot ? updated : s))
      );
      showToast(schedule.enabled ? "Schedule disabled" : "Schedule enabled", "success");
    } catch (err) {
      showToast(`Failed to toggle schedule: ${String(err)}`, "error");
    }
  }

  function handleEdit(schedule: ScheduleState) {
    setEditingSchedule(schedule);
    setShowForm(true);
  }

  function handleFormSubmit(data: {
    fan_id: number;
    duty: number;
    start_min: number;
    end_min: number;
    enabled: boolean;
  }) {
    if (editingSchedule) {
      handleUpdate(data);
    } else {
      handleCreate(data);
    }
  }

  function openCreate() {
    setEditingSchedule(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingSchedule(null);
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[#171717]">Schedules</h1>
          <p className="mt-1 text-xs text-[#60646c]">
            {schedules.length} of {MAX_SCHEDULE_SLOTS} slots used
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={schedules.length >= MAX_SCHEDULE_SLOTS}
          className="flex items-center gap-1.5 rounded-md bg-[#171717] px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={16} />
          Create Schedule
        </button>
      </div>

      {/* Schedule list */}
      <ScheduleList
        schedules={schedules}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggle={handleToggle}
        onCreateFirst={openCreate}
      />

      {/* Form modal */}
      {showForm && (
        <ScheduleForm
          onSubmit={handleFormSubmit}
          onCancel={closeForm}
          initialData={editingSchedule}
          fans={fans}
        />
      )}
    </div>
  );
}
