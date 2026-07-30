import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { api, type FanState, type SourceState, type CurveState, type ScheduleState } from "../lib/api";
import { logUserAction } from "../lib/logUserAction";
import { useDeviceStore } from "../stores/deviceStore";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { FanList } from "../components/fans/FanList";
import { FanForm, type FanFormData } from "../components/fans/FanForm";

const MAX_FAN_SLOTS = 8;

export function FansPage() {
  const activeDeviceId = useDeviceStore((s) => s.activeDeviceId);
  const { showToast } = useToast();
  const [fans, setFans] = useState<FanState[]>([]);
  const [sources, setSources] = useState<SourceState[]>([]);
  const [curves, setCurves] = useState<CurveState[]>([]);
  const [schedules, setSchedules] = useState<ScheduleState[]>([]);
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

  useEffect(() => {
    if (activeDeviceId == null) return;
    api.getSources(activeDeviceId).then(setSources).catch(() => {});
    api.getCurves(activeDeviceId).then(setCurves).catch(() => {});
    api.getSchedules(activeDeviceId).then(setSchedules).catch(() => {});
  }, [activeDeviceId]);

  async function handleCreate(data: FanFormData) {
    if (activeDeviceId == null) return;
    try {
      const created = await api.createFan(activeDeviceId, {
        name: data.name,
        pwm_gpio: data.pwm_gpio,
        tach_gpio: data.tach_gpio,
      });
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
      showToast("Fan created", "success");
      logUserAction(activeDeviceId, "fan", `Fan "${final.name}" created`, `slot=${final.slot}`);
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
        pwm_gpio: data.pwm_gpio,
        tach_gpio: data.tach_gpio,
      });
      setFans((prev) =>
        prev.map((f) => (f.slot === updated.slot ? updated : f))
      );
      showToast("Fan updated", "success");
      logUserAction(activeDeviceId, "fan", `Fan "${updated.name}" updated`, `slot=${updated.slot}`);
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
      showToast(fan.enabled ? "Fan disabled" : "Fan enabled", "success");
      logUserAction(activeDeviceId, "fan", `Fan "${fan.name}" ${!fan.enabled ? "enabled" : "disabled"}`, `slot=${fan.slot}`);
    } catch (err) {
      showToast(`Failed to toggle fan: ${String(err)}`, "error");
    }
  }

  async function handleDelete(fan: FanState) {
    if (activeDeviceId == null) return;
    if (!confirm(`Delete fan "${fan.name}"?`)) return;
    try {
      await api.deleteFan(activeDeviceId, fan.slot);
      setFans((prev) => prev.filter((f) => f.slot !== fan.slot));
      showToast("Fan deleted", "success");
      logUserAction(activeDeviceId, "fan", `Fan "${fan.name}" deleted`, `slot=${fan.slot}`);
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
    <div className="flex h-full flex-col p-6">
      {/* Header */}
      <div className="mb-6 flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Fans</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {fans.length} of {MAX_FAN_SLOTS} slots used
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingFan(null);
            setShowForm(true);
          }}
          disabled={fans.length >= MAX_FAN_SLOTS}
        >
          <Plus size={16} />
          Create Fan
        </Button>
      </div>

      {/* Fan list */}
      <FanList
        fans={fans}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggle={handleToggle}
      />

      {/* Form dialog */}
      <FanForm
        open={showForm}
        onOpenChange={(open) => {
          if (!open) closeForm();
        }}
        onSubmit={handleFormSubmit}
        initialData={editingFan}
        sources={sources}
        curves={curves}
        schedules={schedules}
      />
    </div>
  );
}
