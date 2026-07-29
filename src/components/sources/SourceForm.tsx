import { useState } from "react";
import type { SourceState } from "../../lib/api";

const SOURCE_TYPE_OPTIONS = ["DS18B20", "Manual", "NTC"] as const;

interface SourceFormProps {
  onSubmit: (data: {
    name: string;
    source_type: string;
    gpio?: number;
    rom_code?: string;
  }) => void;
  onCancel: () => void;
  initialData?: SourceState | null;
}

export function SourceForm({
  onSubmit,
  onCancel,
  initialData,
}: SourceFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [sourceType, setSourceType] = useState<string>(
    initialData?.source_type ?? SOURCE_TYPE_OPTIONS[0]
  );
  const [gpio, setGpio] = useState<string>("");
  const [romCode, setRomCode] = useState<string>(initialData?.rom_code ?? "");

  const isEdit = initialData != null;
  const showGpio = sourceType === "NTC";
  const showRomCode = sourceType === "DS18B20";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const data: {
      name: string;
      source_type: string;
      gpio?: number;
      rom_code?: string;
    } = {
      name: name.trim(),
      source_type: sourceType,
    };
    if (showGpio && gpio.trim()) {
      data.gpio = Number(gpio);
    }
    if (showRomCode && romCode.trim()) {
      data.rom_code = romCode.trim();
    }
    onSubmit(data);
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
          {isEdit ? "Edit Source" : "Create Source"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Name */}
          <div>
            <label
              htmlFor="source-name"
              className="mb-1 block text-xs font-medium text-[#60646c]"
            >
              Name
            </label>
            <input
              id="source-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. CPU Temp"
              className="w-full rounded-md border border-[#dcdee0] bg-white px-3 py-2 text-sm text-[#171717] outline-none transition-colors focus:border-[#171717]"
              required
              autoFocus
            />
          </div>

          {/* Type */}
          <div>
            <label
              htmlFor="source-type"
              className="mb-1 block text-xs font-medium text-[#60646c]"
            >
              Type
            </label>
            <select
              id="source-type"
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="w-full rounded-md border border-[#dcdee0] bg-white px-3 py-2 text-sm text-[#171717] outline-none transition-colors focus:border-[#171717]"
            >
              {SOURCE_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* GPIO (NTC) */}
          {showGpio && (
            <div>
              <label
                htmlFor="source-gpio"
                className="mb-1 block text-xs font-medium text-[#60646c]"
              >
                GPIO
              </label>
              <input
                id="source-gpio"
                type="number"
                value={gpio}
                onChange={(e) => setGpio(e.target.value)}
                placeholder="e.g. 4"
                className="w-full rounded-md border border-[#dcdee0] bg-white px-3 py-2 text-sm text-[#171717] outline-none transition-colors focus:border-[#171717]"
              />
            </div>
          )}

          {/* ROM Code (DS18B20) */}
          {showRomCode && (
            <div>
              <label
                htmlFor="source-rom"
                className="mb-1 block text-xs font-medium text-[#60646c]"
              >
                ROM Code
              </label>
              <input
                id="source-rom"
                type="text"
                value={romCode}
                onChange={(e) => setRomCode(e.target.value)}
                placeholder="e.g. 28FF1234567890AB"
                className="w-full rounded-md border border-[#dcdee0] bg-white px-3 py-2 text-sm font-mono text-[#171717] outline-none transition-colors focus:border-[#171717]"
              />
            </div>
          )}

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
