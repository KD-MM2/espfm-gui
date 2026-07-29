import { useState } from "react";
import type { ScheduleState, FanState } from "../../lib/api";

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
  onSubmit: (data: {
    fan_id: number;
    duty: number;
    start_min: number;
    end_min: number;
    enabled: boolean;
  }) => void;
  onCancel: () => void;
  initialData?: ScheduleState | null;
  fans?: FanState[];
}

export function ScheduleForm({
  onSubmit,
  onCancel,
  initialData,
  fans = [],
}: ScheduleFormProps) {
  const [fanId, setFanId] = useState<number>(initialData?.fan_id ?? 0);
  const [duty, setDuty] = useState<number>(initialData?.duty ?? 50);
  const [startTime, setStartTime] = useState<string>(
    initialData ? minutesToHHMM(initialData.start_min) : "00:00"
  );
  const [endTime, setEndTime] = useState<string>(
    initialData ? minutesToHHMM(initialData.end_min) : "23:59"
  );
  const [enabled, setEnabled] = useState<boolean>(
    initialData?.enabled ?? true
  );

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
      enabled,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-foreground">
          {isEdit ? "Edit Schedule" : "Create Schedule"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Fan */}
          <div>
            <label
              htmlFor="schedule-fan-id"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              Fan
            </label>
            <select
              id="schedule-fan-id"
              value={fanId}
              onChange={(e) => setFanId(Number(e.target.value))}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-foreground"
              autoFocus
            >
              {fans.length > 0 ? (
                fans.map((f) => (
                  <option key={f.slot} value={f.slot}>
                    {f.name} (slot {f.slot})
                  </option>
                ))
              ) : (
                Array.from({ length: 8 }, (_, i) => (
                  <option key={i} value={i}>
                    Fan {i}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Duty */}
          <div>
            <label
              htmlFor="schedule-duty"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              Duty ({duty}%)
            </label>
            <input
              id="schedule-duty"
              type="range"
              min={0}
              max={100}
              value={duty}
              onChange={(e) => setDuty(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Start Time */}
          <div>
            <label
              htmlFor="schedule-start"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              Start Time
            </label>
            <input
              id="schedule-start"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-foreground"
              required
            />
          </div>

          {/* End Time */}
          <div>
            <label
              htmlFor="schedule-end"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              End Time
            </label>
            <input
              id="schedule-end"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-foreground"
              required
            />
          </div>

          {/* Enabled */}
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-border accent-primary"
            />
            Enabled
          </label>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
