import { useState, useEffect } from "react";
import type { FanState, SourceState, CurveState, ScheduleState } from "../../lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PWM_GPIO_OPTIONS = [4, 5, 6, 7, 15, 16, 17, 18];
const TACH_GPIO_OPTIONS = [8, 9, 10, 11, 12, 13, 14];
const NONE_VALUE = "255";

interface FanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FanFormData) => void;
  initialData?: FanState | null;
  sources: SourceState[];
  curves: CurveState[];
  schedules: ScheduleState[];
}

export interface FanFormData {
  name: string;
  pwm_gpio: number;
  tach_gpio: number;
  mode: string;
  duty: number;
  inverted: boolean;
  enabled: boolean;
  source_id: number;
  curve_id: number;
  schedule_id: number;
  group_id: number;
}

export function FanForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  sources,
  curves,
  schedules,
}: FanFormProps) {
  const isEdit = initialData != null;

  const [name, setName] = useState(initialData?.name ?? "");
  const [pwmGpio, setPwmGpio] = useState<number>(
    initialData?.pwm_gpio ?? PWM_GPIO_OPTIONS[0]
  );
  const [tachGpio, setTachGpio] = useState<number>(
    initialData?.tach_gpio ?? TACH_GPIO_OPTIONS[0]
  );
  const [mode, setMode] = useState(initialData?.mode ?? "manual");
  const [duty, setDuty] = useState<number>(initialData?.duty_pct ?? 50);
  const [inverted, setInverted] = useState(initialData?.inverted ?? false);
  const [enabled, setEnabled] = useState(initialData?.enabled ?? true);
  const [sourceId, setSourceId] = useState(
    String(initialData?.source_id ?? NONE_VALUE)
  );
  const [curveId, setCurveId] = useState(
    String(initialData?.curve_id ?? NONE_VALUE)
  );
  const [scheduleId, setScheduleId] = useState(
    String(initialData?.schedule_id ?? NONE_VALUE)
  );
  const [groupId, setGroupId] = useState<number>(
    initialData?.group_id ?? 0
  );

  // Reset form when initialData changes
  useEffect(() => {
    if (open) {
      setName(initialData?.name ?? "");
      setPwmGpio(initialData?.pwm_gpio ?? PWM_GPIO_OPTIONS[0]);
      setTachGpio(initialData?.tach_gpio ?? TACH_GPIO_OPTIONS[0]);
      setMode(initialData?.mode ?? "manual");
      setDuty(initialData?.duty_pct ?? 50);
      setInverted(initialData?.inverted ?? false);
      setEnabled(initialData?.enabled ?? true);
      setSourceId(String(initialData?.source_id ?? NONE_VALUE));
      setCurveId(String(initialData?.curve_id ?? NONE_VALUE));
      setScheduleId(String(initialData?.schedule_id ?? NONE_VALUE));
      setGroupId(initialData?.group_id ?? 0);
    }
  }, [open, initialData]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      pwm_gpio: pwmGpio,
      tach_gpio: tachGpio,
      mode,
      duty,
      inverted,
      enabled,
      source_id: Number(sourceId),
      curve_id: Number(curveId),
      schedule_id: Number(scheduleId),
      group_id: groupId,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Fan" : "Create Fan"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Name */}
          <div>
            <Label htmlFor="fan-name">Name</Label>
            <Input
              id="fan-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CPU Fan"
              required
              autoFocus
              className="mt-1"
            />
          </div>

          {/* GPIO row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="fan-pwm">PWM GPIO</Label>
              <Input
                id="fan-pwm"
                type="number"
                min={0}
                max={48}
                value={pwmGpio}
                onChange={(e) => setPwmGpio(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="fan-tach">Tach GPIO</Label>
              <Input
                id="fan-tach"
                type="number"
                min={0}
                max={48}
                value={tachGpio}
                onChange={(e) => setTachGpio(Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>

          {/* Mode + Duty row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Operation Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="auto">Auto (curve-controlled)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fan-duty">Duty Cycle ({duty}%)</Label>
              <Input
                id="fan-duty"
                type="range"
                min={0}
                max={100}
                value={duty}
                onChange={(e) => setDuty(Number(e.target.value))}
                className="mt-1 accent-primary"
              />
            </div>
          </div>

          {/* Source + Curve row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Temperature Source</Label>
              <Select value={sourceId} onValueChange={setSourceId}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None</SelectItem>
                  {sources.map((s) => (
                    <SelectItem key={s.slot} value={String(s.slot)}>
                      {s.name} ({s.source_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fan Curve</Label>
              <Select value={curveId} onValueChange={setCurveId}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None</SelectItem>
                  {curves.map((c) => (
                    <SelectItem key={c.slot} value={String(c.slot)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Schedule + Group row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Schedule</Label>
              <Select value={scheduleId} onValueChange={setScheduleId}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None</SelectItem>
                  {schedules.map((s) => (
                    <SelectItem key={s.slot} value={String(s.slot)}>
                      Schedule {s.slot}: {s.duty}% duty
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fan-group">Group ID</Label>
              <Input
                id="fan-group"
                type="number"
                min={0}
                max={255}
                value={groupId}
                onChange={(e) => setGroupId(Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={inverted}
                onChange={(e) => setInverted(e.target.checked)}
                className="accent-primary"
              />
              Inverted PWM
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="accent-primary"
              />
              Enabled
            </label>
          </div>

          {/* Footer */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
