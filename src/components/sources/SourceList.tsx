import { useState } from "react";
import { Thermometer, Trash2, Pencil } from "lucide-react";
import type { SourceState } from "../../lib/api";
import { EmptyState } from "../ui/EmptyState";

interface SourceListProps {
  sources: SourceState[];
  onDelete: (source: SourceState) => void;
  onEdit: (source: SourceState) => void;
  onCreateFirst: () => void;
  onSetManualTemp?: (source: SourceState, tempC: number) => void;
}

function SourceCard({
  source,
  onDelete,
  onEdit,
  onSetManualTemp,
}: {
  source: SourceState;
  onDelete: (source: SourceState) => void;
  onEdit: (source: SourceState) => void;
  onSetManualTemp?: (source: SourceState, tempC: number) => void;
}) {
  const [manualTempInput, setManualTempInput] = useState(
    source.temp_c.toFixed(1)
  );
  const typeLabel =
    source.source_type === "DS18B20"
      ? "DS18B20"
      : source.source_type === "NTC"
        ? "NTC"
        : "Manual";

  const statusColor =
    source.status === "valid"
      ? "bg-success/10 text-success"
      : source.status === "stale"
        ? "bg-warning/10 text-warning"
        : "bg-destructive/10 text-destructive";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-foreground">
              {source.name}
            </h3>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {typeLabel}
            </span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor}`}>
              {source.status}
            </span>
          </div>

          <div className="mt-2 space-y-1">
            {source.source_type === "Manual" && onSetManualTemp ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.1"
                    value={manualTempInput}
                    onChange={(e) => setManualTempInput(e.target.value)}
                    className="w-20 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground outline-none focus:border-foreground"
                  />
                  <span className="text-xs text-muted-foreground">°C</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const val = parseFloat(manualTempInput);
                    if (!isNaN(val)) onSetManualTemp(source, val);
                  }}
                  className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Set
                </button>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {source.temp_c.toFixed(1)}
                </span>{" "}
                °C
              </div>
            )}
            {source.gpio < 255 && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">GPIO</span> {source.gpio}
              </div>
            )}
            {source.rom_code && (
              <div className="text-xs text-muted-foreground">
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
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted"
            title="Edit source"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(source)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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
  onDelete,
  onEdit,
  onCreateFirst,
  onSetManualTemp,
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
          onDelete={onDelete}
          onEdit={onEdit}
          onSetManualTemp={onSetManualTemp}
        />
      ))}
    </div>
  );
}
