import { useState } from "react";
import type { ScheduleState, FanState } from "../../lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function minutesToHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

interface ScheduleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { fan_id: number; duty: number; start_min: number; end_min: number; enabled: boolean }) => void;
  initialData?: ScheduleState | null;
  fans?: FanState[];
}

export function ScheduleForm({ open, onOpenChange, onSubmit, initialData, fans = [] }: ScheduleFormProps) {
  const [fanId, setFanId] = useState<number>(initialData?.fan_id ?? 0);
  const [duty, setDuty] = useState<number>(initialData?.duty ?? 50);
  const [startTime, setStartTime] = useState<string>(initialData ? minutesToHHMM(initialData.start_min) : "00:00");
  const [endTime, setEndTime] = useState<string>(initialData ? minutesToHHMM(initialData.end_min) : "23:59");
  const [enabled, setEnabled] = useState<boolean>(initialData?.enabled ?? true);

  const isEdit = initialData != null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const startMin = hhmmToMinutes(startTime);
    const endMin = hhmmToMinutes(endTime);
    if (fanId < 0 || fanId > 7) return;
    if (duty < 0 || duty > 100) return;
    onSubmit({
      fan_id: fanId,
      duty,
      start_min: startMin,
      end_min: endMin,
      enabled
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Schedule" : "Create Schedule"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fan */}
          <div>
            <Label>Fan</Label>
            <Select value={String(fanId)} onValueChange={(v) => setFanId(Number(v))}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fans.length > 0
                  ? fans.map((f) => (
                      <SelectItem key={f.slot} value={String(f.slot)}>
                        {f.name} (slot {f.slot})
                      </SelectItem>
                    ))
                  : Array.from({ length: 8 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        Fan {i}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duty */}
          <div>
            <Label htmlFor="schedule-duty">Duty ({duty}%)</Label>
            <Input id="schedule-duty" type="range" min={0} max={100} value={duty} onChange={(e) => setDuty(Number(e.target.value))} className="mt-1" />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Start Time */}
          <div>
            <Label htmlFor="schedule-start">Start Time</Label>
            <Input id="schedule-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1" required />
          </div>

          {/* End Time */}
          <div>
            <Label htmlFor="schedule-end">End Time</Label>
            <Input id="schedule-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1" required />
          </div>

          {/* Enabled */}
          <div className="flex items-center gap-2">
            <Checkbox id="schedule-enabled" checked={enabled} onCheckedChange={(checked) => setEnabled(checked === true)} />
            <Label htmlFor="schedule-enabled">Enabled</Label>
          </div>

          {/* Footer */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? "Update" : "Create"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

