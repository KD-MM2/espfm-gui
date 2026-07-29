import { useState } from "react";
import type { ScheduleState } from "../../lib/api";

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
}

export function ScheduleForm({
  onSubmit,
  onCancel,
  initialData,
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
        className="w-full max-w-md rounded-lg border border-[#dcdee0] bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-[#171717]">
          {isEdit ? "Edit Schedule" : "Create Schedule"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Fan ID */}
          <div>
            <label
              htmlFor="schedule-fan-id"
              className="mb-1 block text-xs font-medium text-[#60646c]"
            >
              Fan ID (0&ndash;7)
            </label>
            <input
              id="schedule-fan-id"
              type="number"
              min={0}
              max={7}
              value={fanId}
              onChange={(e) => setFanId(Number(e.target.value))}
              className="w-full rounded-md border border-[#dcdee0] bg-white px-3 py-2 text-sm text-[#171717] outline-none transition-colors focus:border-[#171717]"
              required
              autoFocus
            />
          </div>

          {/* Duty */}
          <div>
            <label
              htmlFor="schedule-duty"
              className="mb-1 block text-xs font-medium text-[#60646c]"
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
              className="w-full accent-[#171717]"
            />
            <div className="flex justify-between text-[10px] text-[#60646c]">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Start Time */}
          <div>
            <label
              htmlFor="schedule-start"
              className="mb-1 block text-xs font-medium text-[#60646c]"
            >
              Start Time
            </label>
            <input
              id="schedule-start"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-md border border-[#dcdee0] bg-white px-3 py-2 text-sm text-[#171717] outline-none transition-colors focus:border-[#171717]"
              required
            />
          </div>

          {/* End Time */}
          <div>
            <label
              htmlFor="schedule-end"
              className="mb-1 block text-xs font-medium text-[#60646c]"
            >
              End Time
            </label>
            <input
              id="schedule-end"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-md border border-[#dcdee0] bg-white px-3 py-2 text-sm text-[#171717] outline-none transition-colors focus:border-[#171717]"
              required
            />
          </div>

          {/* Enabled */}
          <label className="flex items-center gap-2 text-sm text-[#171717]">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-[#dcdee0] accent-[#171717]"
            />
            Enabled
          </label>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-[#dcdee0] bg-white px-4 py-2 text-sm font-medium text-[#171717] transition-colors hover:bg-[#f0f0f3]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-[#171717] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2a2a2a]"
            >
              {isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
