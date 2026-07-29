import { useState } from "react";
import type { FanState } from "../../lib/api";

const PWM_GPIO_OPTIONS = [4, 5, 6, 7, 15, 16, 17, 18];
const TACH_GPIO_OPTIONS = [8, 9, 10, 11, 12, 13, 14];

interface FanFormProps {
  onSubmit: (data: { name: string; pwm_gpio: number; tach_gpio: number }) => void;
  onCancel: () => void;
  initialData?: FanState | null;
}

export function FanForm({ onSubmit, onCancel, initialData }: FanFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [pwmGpio, setPwmGpio] = useState<number>(
    initialData?.pwm_gpio ?? PWM_GPIO_OPTIONS[0]
  );
  const [tachGpio, setTachGpio] = useState<number>(
    initialData?.tach_gpio ?? TACH_GPIO_OPTIONS[0]
  );

  const isEdit = initialData != null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), pwm_gpio: pwmGpio, tach_gpio: tachGpio });
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
          {isEdit ? "Edit Fan" : "Create Fan"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Name */}
          <div>
            <label
              htmlFor="fan-name"
              className="mb-1 block text-xs font-medium text-[#60646c]"
            >
              Name
            </label>
            <input
              id="fan-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CPU Fan"
              className="w-full rounded-md border border-[#dcdee0] bg-white px-3 py-2 text-sm text-[#171717] outline-none transition-colors focus:border-[#171717]"
              required
              autoFocus
            />
          </div>

          {/* PWM GPIO */}
          <div>
            <label
              htmlFor="fan-pwm-gpio"
              className="mb-1 block text-xs font-medium text-[#60646c]"
            >
              PWM GPIO
            </label>
            <select
              id="fan-pwm-gpio"
              value={pwmGpio}
              onChange={(e) => setPwmGpio(Number(e.target.value))}
              className="w-full rounded-md border border-[#dcdee0] bg-white px-3 py-2 text-sm text-[#171717] outline-none transition-colors focus:border-[#171717]"
            >
              {PWM_GPIO_OPTIONS.map((gpio) => (
                <option key={gpio} value={gpio}>
                  GPIO {gpio}
                </option>
              ))}
            </select>
          </div>

          {/* Tach GPIO */}
          <div>
            <label
              htmlFor="fan-tach-gpio"
              className="mb-1 block text-xs font-medium text-[#60646c]"
            >
              Tach GPIO
            </label>
            <select
              id="fan-tach-gpio"
              value={tachGpio}
              onChange={(e) => setTachGpio(Number(e.target.value))}
              className="w-full rounded-md border border-[#dcdee0] bg-white px-3 py-2 text-sm text-[#171717] outline-none transition-colors focus:border-[#171717]"
            >
              {TACH_GPIO_OPTIONS.map((gpio) => (
                <option key={gpio} value={gpio}>
                  GPIO {gpio}
                </option>
              ))}
            </select>
          </div>

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
