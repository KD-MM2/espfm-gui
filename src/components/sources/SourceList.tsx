import { useState } from "react";
import { Thermometer, Trash2, Pencil } from "lucide-react";
import type { SourceState } from "../../lib/api";
import { EmptyState } from "../ui/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface SourceListProps {
  sources: SourceState[];
  onDelete: (source: SourceState) => void;
  onEdit: (source: SourceState) => void;
  onCreateFirst: () => void;
  onSetManualTemp?: (source: SourceState, tempC: number) => void;
}

function SourceCard({ source, onDelete, onEdit, onSetManualTemp }: { source: SourceState; onDelete: (source: SourceState) => void; onEdit: (source: SourceState) => void; onSetManualTemp?: (source: SourceState, tempC: number) => void }) {
  const [manualTempInput, setManualTempInput] = useState(source.temp_c.toFixed(1));
  const typeLabel = source.source_type === "DS18B20" ? "DS18B20" : source.source_type === "NTC" ? "NTC" : "Manual";

  return (
    <Card className="rounded-lg p-0 gap-0">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-foreground">{source.name}</h3>
              <Badge className="bg-blue-50 text-[10px] text-blue-700 dark:bg-blue-800 dark:text-blue-200">{typeLabel}</Badge>
              <Badge
                className={`text-[10px] ${
                  source.status === "valid"
                    ? "bg-green-50 text-green-700 dark:bg-green-800 dark:text-green-200"
                    : source.status === "stale"
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-800 dark:text-amber-200"
                      : "bg-red-50 text-red-700 dark:bg-red-800 dark:text-red-200"
                }`}
              >
                {source.status}
              </Badge>
            </div>

            <div className="mt-2 space-y-1">
              {source.source_type === "Manual" && onSetManualTemp ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Input type="number" step="0.1" value={manualTempInput} onChange={(e) => setManualTempInput(e.target.value)} className="h-7 w-20 text-xs" />
                    <span className="text-xs text-muted-foreground">°C</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      const val = parseFloat(manualTempInput);
                      if (!isNaN(val)) onSetManualTemp(source, val);
                    }}
                  >
                    Set
                  </Button>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{source.temp_c.toFixed(1)}</span> °C
                </div>
              )}
              {source.gpio < 255 && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">GPIO</span> {source.gpio}
                </div>
              )}
              {source.rom_code && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">ROM</span> <span className="font-mono">{source.rom_code}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => onEdit(source)} title="Edit source">
              <Pencil size={16} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onDelete(source)} title="Delete source" className="hover:bg-destructive/10 hover:text-destructive">
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SourceList({ sources, onDelete, onEdit, onCreateFirst, onSetManualTemp }: SourceListProps) {
  if (sources.length === 0) {
    return <EmptyState icon={<Thermometer size={40} />} title="No sources configured" description="Create your first source to get started" actionLabel="Create your first source" onAction={onCreateFirst} />;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {sources.map((source) => (
        <SourceCard key={source.slot} source={source} onDelete={onDelete} onEdit={onEdit} onSetManualTemp={onSetManualTemp} />
      ))}
    </div>
  );
}
