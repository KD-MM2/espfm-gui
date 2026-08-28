import { useState } from "react";
import { Plus } from "lucide-react";
import { api, type FanState } from "../lib/api";
import { useFans, useSources, useCurves, useSchedules, useCreateFan, useUpdateFan, useDeleteFan } from "../hooks/queries";
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
  const { data: fans = [] } = useFans(activeDeviceId);
  const { data: sources = [] } = useSources(activeDeviceId);
  const { data: curves = [] } = useCurves(activeDeviceId);
  const { data: schedules = [] } = useSchedules(activeDeviceId);
  const createFan = useCreateFan(activeDeviceId ?? -1);
  const updateFan = useUpdateFan(activeDeviceId ?? -1);
  const deleteFan = useDeleteFan(activeDeviceId ?? -1);
  const [showForm, setShowForm] = useState(false);
  const [editingFan, setEditingFan] = useState<FanState | null>(null);

  async function handleCreate(data: FanFormData) {
    if (activeDeviceId == null) return;
    try {
      const created = await createFan.mutateAsync({
        name: data.name,
        pwm_gpio: data.pwm_gpio,
        tach_gpio: data.tach_gpio
      });
      const needsUpdate = data.mode !== "manual" || data.duty !== 50 || data.inverted || !data.enabled || data.source_id !== 255 || data.curve_id !== 255 || data.schedule_id !== 255 || data.group_id !== 0;
      if (needsUpdate) {
        await updateFan.mutateAsync({
          slot: created.slot,
          req: {
            mode: data.mode,
            duty: data.duty,
            inverted: data.inverted,
            enabled: data.enabled,
            source_id: data.source_id !== 255 ? data.source_id : undefined,
            curve_id: data.curve_id !== 255 ? data.curve_id : undefined,
            schedule_id: data.schedule_id !== 255 ? data.schedule_id : undefined,
            group_id: data.group_id !== 0 ? data.group_id : undefined
          }
        });
      }
      showToast("Fan created", "success");
      logUserAction(activeDeviceId, "fan", `Fan "${data.name}" created`, "");
      closeForm();
    } catch (err) {
      showToast(`Failed to create fan: ${String(err)}`, "error");
    }
  }

  async function handleUpdate(fan: FanState, data: FanFormData) {
    if (activeDeviceId == null) return;
    try {
      // Send only the fields the user actually changed. The device applies
      // partial updates: any field omitted from FanUpdateRequest is left as-is.
      // Critically, pwm_gpio/tach_gpio MUST be omitted unless the user changed
      // them — sending them on every edit makes the firmware tear down and
      // recreate the LEDC channel at duty 0 (full speed for inverted fans).
      const update: Parameters<typeof api.updateFan>[2] = {};
      if (data.name !== fan.name) update.name = data.name;
      if (data.mode !== fan.mode) update.mode = data.mode;
      if (data.duty !== fan.duty_pct) update.duty = data.duty;
      if (data.inverted !== fan.inverted) update.inverted = data.inverted;
      if (data.enabled !== fan.enabled) update.enabled = data.enabled;
      // For id references, "None" is the 255 sentinel. When the user changes to
      // "None" we must send 255 explicitly (omitting the field would mean
      // "leave unchanged"); when the value is unchanged we omit it entirely.
      if (data.source_id !== fan.source_id) update.source_id = data.source_id;
      if (data.curve_id !== fan.curve_id) update.curve_id = data.curve_id;
      if (data.schedule_id !== fan.schedule_id) update.schedule_id = data.schedule_id;
      if (data.group_id !== fan.group_id) update.group_id = data.group_id;
      if (data.pwm_gpio !== fan.pwm_gpio) update.pwm_gpio = data.pwm_gpio;
      if (data.tach_gpio !== fan.tach_gpio) update.tach_gpio = data.tach_gpio;

      // Nothing changed — avoid a pointless (and potentially harmful) empty PUT.
      if (Object.keys(update).length === 0) {
        closeForm();
        return;
      }
      await updateFan.mutateAsync({ slot: fan.slot, req: update });
      showToast("Fan updated", "success");
      logUserAction(activeDeviceId, "fan", `Fan "${fan.name}" updated`, `slot=${fan.slot}`);
      closeForm();
    } catch (err) {
      showToast(`Failed to update fan: ${String(err)}`, "error");
    }
  }

  async function handleToggle(fan: FanState) {
    if (activeDeviceId == null) return;
    try {
      await updateFan.mutateAsync({ slot: fan.slot, req: { enabled: !fan.enabled } });
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
      await deleteFan.mutateAsync(fan.slot);
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
      <FanList fans={fans} curves={curves} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggle} onCreateFirst={() => { setEditingFan(null); setShowForm(true); }} />

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
