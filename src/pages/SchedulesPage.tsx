import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { api, type ScheduleState, type FanState } from "../lib/api";
import { logUserAction } from "../lib/logUserAction";
import { useDeviceStore } from "../stores/deviceStore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ScheduleList } from "../components/schedules/ScheduleList";
import { ScheduleForm } from "../components/schedules/ScheduleForm";

const MAX_SCHEDULE_SLOTS = 8;

export function SchedulesPage() {
  const activeDeviceId = useDeviceStore((s) => s.activeDeviceId);
  const { showToast } = useToast();
  const [schedules, setSchedules] = useState<ScheduleState[]>([]);
  const [fans, setFans] = useState<FanState[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleState | null>(null);

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

  async function handleCreate(data: { fan_id: number; duty: number; start_min: number; end_min: number; enabled: boolean }) {
    if (activeDeviceId == null) return;
    try {
      const created = await api.createSchedule(activeDeviceId, data);
      setSchedules((prev) => [...prev, created]);
      showToast("Schedule created", "success");
      logUserAction(activeDeviceId, "schedule", `Schedule created (fan ${data.fan_id}, ${data.duty}%)`, `slot=${created.slot}`);
      closeForm();
    } catch (err) {
      showToast(`Failed to create schedule: ${String(err)}`, "error");
    }
  }

  async function handleUpdate(data: { fan_id: number; duty: number; start_min: number; end_min: number; enabled: boolean }) {
    if (activeDeviceId == null || editingSchedule == null) return;
    try {
      const s = editingSchedule;
      // Send only the fields the user actually changed (partial update).
      const update: Parameters<typeof api.updateSchedule>[2] = {};
      if (data.fan_id !== s.fan_id) update.fan_id = data.fan_id;
      if (data.duty !== s.duty) update.duty = data.duty;
      if (data.start_min !== s.start_min) update.start_min = data.start_min;
      if (data.end_min !== s.end_min) update.end_min = data.end_min;
      if (data.enabled !== s.enabled) update.enabled = data.enabled;
      // Nothing changed — avoid a pointless empty PUT.
      if (Object.keys(update).length === 0) {
        closeForm();
        return;
      }
      const updated = await api.updateSchedule(activeDeviceId, s.slot, update);
      setSchedules((prev) => prev.map((x) => (x.slot === updated.slot ? updated : x)));
      showToast("Schedule updated", "success");
      logUserAction(activeDeviceId, "schedule", `Schedule updated (fan ${data.fan_id}, ${data.duty}%)`, `slot=${updated.slot}`);
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
      logUserAction(activeDeviceId, "schedule", `Schedule deleted (fan ${schedule.fan_id})`, `slot=${schedule.slot}`);
    } catch (err) {
      showToast(`Failed to delete schedule: ${String(err)}`, "error");
    }
  }

  async function handleToggle(schedule: ScheduleState) {
    if (activeDeviceId == null) return;
    try {
      const updated = await api.updateSchedule(activeDeviceId, schedule.slot, { enabled: !schedule.enabled });
      setSchedules((prev) => prev.map((s) => (s.slot === updated.slot ? updated : s)));
      showToast(schedule.enabled ? "Schedule disabled" : "Schedule enabled", "success");
      logUserAction(activeDeviceId, "schedule", `Schedule ${!schedule.enabled ? "enabled" : "disabled"} (fan ${schedule.fan_id})`, `slot=${schedule.slot}`);
    } catch (err) {
      showToast(`Failed to toggle schedule: ${String(err)}`, "error");
    }
  }

  function handleEdit(schedule: ScheduleState) {
    setEditingSchedule(schedule);
    setShowForm(true);
  }

  function handleFormSubmit(data: { fan_id: number; duty: number; start_min: number; end_min: number; enabled: boolean }) {
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
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Schedules</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {schedules.length} of {MAX_SCHEDULE_SLOTS} slots used
          </p>
        </div>
        <Button onClick={openCreate} disabled={schedules.length >= MAX_SCHEDULE_SLOTS}>
          <Plus size={16} />
          Create Schedule
        </Button>
      </div>

      {/* Schedule list */}
      <ScheduleList schedules={schedules} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggle} onCreateFirst={openCreate} />

      {/* Form modal */}
      <ScheduleForm
        open={showForm}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        onSubmit={handleFormSubmit}
        initialData={editingSchedule}
        fans={fans}
      />
    </div>
  );
}

