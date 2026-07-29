import { useState } from "react";
import type { FanState, SourceState, CurveState, ScheduleState } from "../../lib/api";

const PWM_GPIO_OPTIONS = [4, 5, 6, 7, 15, 16, 17, 18];
const TACH_GPIO_OPTIONS = [8, 9, 10, 11, 12, 13, 14];
const NONE_VALUE = 255;

interface FanFormProps {
  onSubmit: (data: FanFormData) => void;
  onCancel: () => void;
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

export function FanForm({ onSubmit, onCancel, initialData, sources, curves, schedules }: FanFormProps) {
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
  const [sourceId, setSourceId] = useState<number>(
    initialData?.source_id ?? NONE_VALUE
  );
  const [curveId, setCurveId] = useState<number>(
    initialData?.curve_id ?? NONE_VALUE
  );
  const [scheduleId, setScheduleId] = useState<number>(
    initialData?.schedule_id ?? NONE_VALUE
  );
  const [groupId, setGroupId] = useState<number>(
    initialData?.group_id ?? 0
  );

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
      source_id: sourceId,
      curve_id: curveId,
      schedule_id: scheduleId,
      group_id: groupId,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-lg rounded-lg border border-[#dcdee0] bg-white p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-[#171717]">
          {isEdit ? "Edit Fan" : "Create Fan"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          {/* Name */}
          <div>
            <label htmlFor="fan-name" className="mb-1 block text-xs font-medium text-[#60646c]">
              Name
            </label>
            <input
              id="fan-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CPU Fan"
              className="w-full rounded-md border border-[#dcdee0] bg-white px-3 py-2 text-sm text-[#171717] outline-none focus:border-[#171717]"
              required
              autoFocus
            />
          </div>

          {/* GPIO row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="fan-pwm" className="mb-1 block text-xs font-medium text-[#60646c]">
                PWM GPIO
              </label>
              <input
                id="fan-pwm"
                type="number"
                min={0}
                max={48}
                list="pwm-gpio-suggestions"
                value={pwmGpio}
                onChange={(e) => setPwmGpio(Number(e.target.value))}
                className="w-full rounded-md border border-[#dcdee0] bg-white px-3 py-2 text-sm text-[#171717] outline-none focus:border-[#171717]"
              />
              <datalist id="pwm-gpio-suggestions">
                {PWM_GPIO_OPTIONS.map((g) => (
                  <option key={g} value={g} label={`GPIO ${g}`} />
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor="fan-tach" className="mb-1 block text-xs font-medium text-[#60646c]">
                Tach GPIO
              </label>
              <input
                id="fan-tach"
                type="number"
                min={0}
                max={48}
                list="tach-gpio-suggestions"
                value={tachGpio}
                onChange={(e) => setTachGpio(Number(e.target.value))}
                className="w-full rounded-md border border-[#dcdee0] bg-white px-3 py-2 text-sm text-[#171717] outline-none focus:border-[#171717]"
              />
              <datalist id="tach-gpio-suggestions">
                {TACH_GPIO_OPTIONS.map((g) => (
                  <option key={g} value={g} label={`GPIO ${g}`} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Mode + Duty row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="fan-mode" className="mb-1 block text-xs font-medium text-[#60646c]">
                Operation Mode
              </label>
              <select
                id="fan-mode"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                className="w-full rounded-md border border-[#dcdee0] bg-white px-3 py-2 text-sm text-[#171717] outline-none focus:border-[#171717]"
              >
                <option value="manual">Manual</option>
                <option value="auto">Auto (curve-controlled)</option>
              </select>
            </div>
            <div>
              <label htmlFor="fan-duty" className="mb-1 block text-xs font-medium text-[#60646c]">
                Duty Cycle ({duty}%)
              </label>
              <input
                id="fan-duty"
                type="range"
                min={0}
                max={100}
                value={duty}
                onChange={(e) => setDuty(Number(e.target.value))}
                className="w-full accent-[#171717]"
              />
            </div>
          </div>

          {/* Source + Curve row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="fan-source" className="mb-1 block text-xs font-medium text-[#60646c]">
                Temperature Source
              </label>
              <select
                id="fan-source"
                value={sourceId}
                onChange={(e) => setSourceId(Number(e.target.value))}
                className="w-full rounded-md border border-[#dcdee0] bg-white px-3 py-2 text-sm text-[#171717] outline-none focus:border-[#171717]"
              >
                <option value={NONE_VALUE}>None</option>
                {sources.map((s) => (
                  <option key={s.slot} value={s.slot}>
                    {s.name} ({s.source_type})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fan-curve" className="mb-1 block text-xs font-medium text-[#60646c]">
                Fan Curve
              </label>
              <select
                id="fan-curve"
                value={curveId}
                onChange={(e) => setCurveId(Number(e.target.value))}
                className="w-full rounded-md border border-[#dcdee0] bg-white px-3 py-2 text-sm text-[#171717] outline-none focus:border-[#171717]"
              >
                <option value={NONE_VALUE}>None</option>
                {curves.map((c) => (
                  <option key={c.slot} value={c.slot}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Schedule + Group row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="fan-schedule" className="mb-1 block text-xs font-medium text-[#60646c]">
                Schedule
              </label>
              <select
                id="fan-schedule"
                value={scheduleId}
                onChange={(e) => setScheduleId(Number(e.target.value))}
                className="w-full rounded-md border border-[#dcdee0] bg-white px-3 py-2 text-sm text-[#171717] outline-none focus:border-[#171717]"
              >
                <option value={NONE_VALUE}>None</option>
                {schedules.map((s) => (
                  <option key={s.slot} value={s.slot}>
                    Schedule {s.slot}: {s.duty}% duty
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fan-group" className="mb-1 block text-xs font-medium text-[#60646c]">
                Group ID
              </label>
              <input
                id="fan-group"
                type="number"
                min={0}
                max={255}
                value={groupId}
                onChange={(e) => setGroupId(Number(e.target.value))}
                className="w-full rounded-md border border-[#dcdee0] bg-white px-3 py-2 text-sm text-[#171717] outline-none focus:border-[#171717]"
              />
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-[#171717]">
              <input
                type="checkbox"
                checked={inverted}
                onChange={(e) => setInverted(e.target.checked)}
                className="accent-[#171717]"
              />
              Inverted PWM
            </label>
            <label className="flex items-center gap-2 text-sm text-[#171717]">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="accent-[#171717]"
              />
              Enabled
            </label>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-[#dcdee0] bg-white px-4 py-2 text-sm font-medium text-[#171717] hover:bg-[#f0f0f3]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-[#171717] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a2a2a]"
            >
              {isEdit ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
