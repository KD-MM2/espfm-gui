import {
  Fan,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
} from "lucide-react";
import type { FanState } from "../../lib/api";
import { EmptyState } from "../ui/EmptyState";

interface FanListProps {
  fans: FanState[];
  onEdit: (fan: FanState) => void;
  onDelete: (fan: FanState) => void;
  onToggle: (fan: FanState) => void;
}

function FanCard({
  fan,
  onEdit,
  onDelete,
  onToggle,
}: {
  fan: FanState;
  onEdit: (fan: FanState) => void;
  onDelete: (fan: FanState) => void;
  onToggle: (fan: FanState) => void;
}) {
  return (
    <div
      className={`rounded-lg border border-[#dcdee0] bg-white p-4 ${
        !fan.enabled ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-[#171717]">
              {fan.name}
            </h3>
            {!fan.enabled && (
              <span className="shrink-0 rounded-full bg-[#f0f0f3] px-2 py-0.5 text-[10px] font-medium text-[#60646c]">
                Disabled
              </span>
            )}
          </div>

          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-[#60646c]">
              <span className="font-medium">PWM</span>
              <span>GPIO {fan.pwm_gpio}</span>
              <span className="text-[#dcdee0]">|</span>
              <span className="font-medium">Tach</span>
              <span>GPIO {fan.tach_gpio}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#60646c]">
                <span className="font-medium text-[#171717]">{fan.rpm}</span>{" "}
                RPM
              </span>
              <span className="text-xs text-[#60646c]">
                <span className="font-medium text-[#171717]">
                  {fan.duty_pct}
                </span>
                % duty
              </span>
              <span className="text-xs">
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  fan.mode === "auto"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-[#f0f0f3] text-[#60646c]"
                }`}>
                  {fan.mode}
                </span>
              </span>
              {fan.inverted && (
                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                  inv
                </span>
              )}
              {fan.alarm !== "none" && (
                <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                  {fan.alarm === "stall" ? "Stall" : "Overtemp"}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onToggle(fan)}
            className="rounded-md p-1.5 text-[#60646c] transition-colors hover:bg-[#f0f0f3]"
            title={fan.enabled ? "Disable fan" : "Enable fan"}
          >
            {fan.enabled ? (
              <CheckCircle2 size={16} className="text-[#16a34a]" />
            ) : (
              <Circle size={16} />
            )}
          </button>
          <button
            type="button"
            onClick={() => onEdit(fan)}
            className="rounded-md p-1.5 text-[#60646c] transition-colors hover:bg-[#f0f0f3]"
            title="Edit fan"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(fan)}
            className="rounded-md p-1.5 text-[#60646c] transition-colors hover:bg-[#fee2e2] hover:text-[#dc2626]"
            title="Delete fan"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function FanList({ fans, onEdit, onDelete, onToggle }: FanListProps) {
  if (fans.length === 0) {
    return (
      <EmptyState
        icon={<Fan size={40} />}
        title="No fans configured"
        description="Create your first fan to get started"
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fans.map((fan) => (
        <FanCard
          key={fan.slot}
          fan={fan}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
