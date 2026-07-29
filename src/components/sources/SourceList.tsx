import { Thermometer, Pencil, Trash2 } from "lucide-react";
import type { SourceState } from "../../lib/api";
import { EmptyState } from "../ui/EmptyState";

interface SourceListProps {
  sources: SourceState[];
  onEdit: (source: SourceState) => void;
  onDelete: (source: SourceState) => void;
  onCreateFirst: () => void;
}

function SourceCard({
  source,
  onEdit,
  onDelete,
}: {
  source: SourceState;
  onEdit: (source: SourceState) => void;
  onDelete: (source: SourceState) => void;
}) {
  const typeLabel =
    source.source_type === "DS18B20"
      ? "DS18B20"
      : source.source_type === "NTC"
        ? "NTC"
        : "Manual";

  return (
    <div className="rounded-lg border border-[#dcdee0] bg-white p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-[#171717]">
              {source.name}
            </h3>
            <span className="shrink-0 rounded-full bg-[#f0f0f3] px-2 py-0.5 text-[10px] font-medium text-[#60646c]">
              {typeLabel}
            </span>
          </div>

          <div className="mt-2 space-y-1">
            <div className="text-xs text-[#60646c]">
              <span className="font-medium text-[#171717]">
                {source.temp_c.toFixed(1)}
              </span>{" "}
              °C
            </div>
            {source.rom_code && (
              <div className="text-xs text-[#60646c]">
                <span className="font-medium">ROM</span>{" "}
                <span className="font-mono">{source.rom_code}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(source)}
            className="rounded-md p-1.5 text-[#60646c] transition-colors hover:bg-[#f0f0f3]"
            title="Edit source"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(source)}
            className="rounded-md p-1.5 text-[#60646c] transition-colors hover:bg-[#fee2e2] hover:text-[#dc2626]"
            title="Delete source"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function SourceList({
  sources,
  onEdit,
  onDelete,
  onCreateFirst,
}: SourceListProps) {
  if (sources.length === 0) {
    return (
      <EmptyState
        icon={<Thermometer size={40} />}
        title="No sources configured"
        description="Create your first source to get started"
        actionLabel="Create your first source"
        onAction={onCreateFirst}
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {sources.map((source) => (
        <SourceCard
          key={source.slot}
          source={source}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
